import { WorkerMailer } from 'worker-mailer';
import { formatEuro } from './_shop.js';

// Order e-mails go out through the shop's Gmail over SMTP, so customers get them from the shop address
// and can simply reply. Needs the Cloudflare secret GMAIL_APP_PASSWORD (a Google "app password");
// without it orders are still saved and visible in the admin.
const SITE_URL = 'https://tvoj-vytlacok.pages.dev';

export function mailConfigured(env) {
  return Boolean(env.SHOP_EMAIL && env.GMAIL_APP_PASSWORD);
}

async function connect(env) {
  return WorkerMailer.connect({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    authType: 'plain',
    credentials: { username: env.SHOP_EMAIL, password: env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') },
    socketTimeoutMs: 15000,
    responseTimeoutMs: 15000,
  });
}

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function orderLines(order) {
  return order.items.map((item) => `${item.qty} × ${item.name}${item.variant ? ` (${item.variant})` : ''} – ${formatEuro(item.price_cents * item.qty)}`);
}

function deliveryLines(order) {
  return [
    `Doprava: ${order.shipping_label}`,
    order.pickup_point ? `Výdajné miesto: ${order.pickup_point}` : `Adresa: ${order.street}, ${order.zip} ${order.city}`,
  ];
}

function totals(order) {
  return [
    ['Tovar', formatEuro(order.items_cents)],
    ['Doprava', formatEuro(order.shipping_cents)],
    ['Dobierka', formatEuro(order.cod_cents)],
    ['Spolu na dobierku', formatEuro(order.total_cents)],
  ];
}

// Plain paragraphs and a small table; mail clients ignore most CSS, so styles stay inline and minimal.
function html(paragraphs, order) {
  const rows = totals(order).map(([label, value], index, all) => `<tr><td style="padding:4px 16px 4px 0">${index === all.length - 1 ? `<b>${label}</b>` : label}</td><td style="padding:4px 0;text-align:right">${index === all.length - 1 ? `<b>${value}</b>` : value}</td></tr>`).join('');
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1c1b18;max-width:560px">${paragraphs.map((part) => `<p style="margin:0 0 14px">${part}</p>`).join('')}<table style="border-collapse:collapse;margin:0 0 14px">${rows}</table></div>`;
}

function customerMail(env, order) {
  const firstName = order.name.split(/\s+/)[0];
  const text = [
    `Dobrý deň${firstName ? `, ${firstName}` : ''},`,
    '',
    `ďakujeme za objednávku č. ${order.number}. Prijali sme ju a pripravíme ju na odoslanie.`,
    '',
    ...orderLines(order),
    '',
    ...deliveryLines(order),
    '',
    ...totals(order).map(([label, value]) => `${label}: ${value}`),
    '',
    'Platíte až pri prevzatí balíka. Keď balík odošleme, dáme vám vedieť.',
    'Ak potrebujete niečo zmeniť, stačí odpovedať na tento e-mail.',
    '',
    `Obchodné podmienky: ${SITE_URL}/obchodne-podmienky`,
    `Formulár na odstúpenie od zmluvy: ${SITE_URL}/obchodne-podmienky#formular`,
    '',
    'tvojVýtlačok',
    env.SHOP_EMAIL,
  ].join('\n');
  const paragraphs = [
    `Dobrý deň${firstName ? `, ${escape(firstName)}` : ''},`,
    `ďakujeme za objednávku č. <b>${escape(order.number)}</b>. Prijali sme ju a pripravíme ju na odoslanie.`,
    orderLines(order).map(escape).join('<br>'),
    deliveryLines(order).map(escape).join('<br>'),
  ];
  const after = [
    'Platíte až pri prevzatí balíka. Keď balík odošleme, dáme vám vedieť. Ak potrebujete niečo zmeniť, stačí odpovedať na tento e-mail.',
    `<a href="${SITE_URL}/obchodne-podmienky">Obchodné podmienky</a> · <a href="${SITE_URL}/obchodne-podmienky#formular">Formulár na odstúpenie od zmluvy</a>`,
    `tvojVýtlačok<br>${escape(env.SHOP_EMAIL)}`,
  ];
  return {
    from: { name: 'tvojVýtlačok', email: env.SHOP_EMAIL },
    to: { name: order.name, email: order.email },
    subject: `Potvrdenie objednávky ${order.number} – tvojVýtlačok`,
    text,
    html: html(paragraphs, order).replace('</div>', after.map((part) => `<p style="margin:0 0 14px">${part}</p>`).join('') + '</div>'),
  };
}

function ownerMail(env, order) {
  const text = [
    `Nová objednávka ${order.number}`,
    '',
    ...orderLines(order),
    '',
    `Doprava: ${order.shipping_label} – ${formatEuro(order.shipping_cents)}`,
    `Dobierka: ${formatEuro(order.cod_cents)}`,
    `Spolu na dobierku: ${formatEuro(order.total_cents)}`,
    '',
    `${order.name}, ${order.email}, ${order.phone}`,
    `${order.street}, ${order.zip} ${order.city}`,
    order.pickup_point ? `Výdajné miesto: ${order.pickup_point}${order.pickup_point_id ? ` (ID ${order.pickup_point_id})` : ''}` : '',
    order.note ? `Poznámka: ${order.note}` : '',
    '',
    'Odpoveď na tento e-mail pôjde priamo zákazníkovi. Podrobnosti nájdeš v admine (npm run admin).',
  ].filter((line, index, all) => line !== '' || all[index - 1] !== '').join('\n');
  return {
    from: { name: 'tvojVýtlačok e-shop', email: env.SHOP_EMAIL },
    to: { name: 'tvojVýtlačok', email: env.SHOP_EMAIL },
    reply: { name: order.name, email: order.email },
    subject: `Nová objednávka ${order.number} – ${formatEuro(order.total_cents)}`,
    text,
  };
}

export async function notifyNewOrder(env, order) {
  if (!mailConfigured(env)) return;
  let mailer;
  try {
    mailer = await connect(env);
    // Owner first: if the customer's address bounces, the shop still hears about the order.
    await mailer.send(ownerMail(env, order)).catch(() => {});
    await mailer.send(customerMail(env, order)).catch(() => {});
  } catch {
    // The order is already saved; a failed e-mail must not break checkout.
  } finally {
    await mailer?.close().catch(() => {});
  }
}

// New inquiry (from dopyt.html or a product's "Mám záujem" form): a short notice to the shop inbox, reply goes to the customer.
export async function notifyNewInquiry(env, inquiry) {
  if (!mailConfigured(env)) return;
  const firstLine = inquiry.description.split('\n')[0].slice(0, 80);
  const text = [
    `Nový dopyt od ${inquiry.name}`,
    '',
    inquiry.description,
    '',
    [inquiry.quantity && `Počet kusov: ${inquiry.quantity}`, inquiry.dimensions && `Rozmery: ${inquiry.dimensions}`, inquiry.deadline && `Termín: ${inquiry.deadline}`].filter(Boolean).join('\n'),
    `${inquiry.name}, ${inquiry.email}${inquiry.phone ? `, ${inquiry.phone}` : ''}${inquiry.company ? `, ${inquiry.company}` : ''}`,
    '',
    'Odpoveď na tento e-mail pôjde priamo zákazníkovi.',
  ].filter((line, index, all) => line !== '' || all[index - 1] !== '').join('\n');
  let mailer;
  try {
    mailer = await connect(env);
    await mailer.send({
      from: { name: 'tvojVýtlačok web', email: env.SHOP_EMAIL },
      to: { name: 'tvojVýtlačok', email: env.SHOP_EMAIL },
      reply: { name: inquiry.name, email: inquiry.email },
      subject: `Dopyt: ${firstLine}`,
      text,
    });
  } catch {
    // The inquiry is already saved in the admin; a failed e-mail must not break the form.
  } finally {
    await mailer?.close().catch(() => {});
  }
}

// Used by the admin's "send test e-mail" button: sends both e-mails for a sample order to the shop's own inbox.
export async function sendTestMail(env) {
  const sample = {
    number: 'SKÚŠKA-0000', name: 'Skúšobný Zákazník', email: env.SHOP_EMAIL, phone: '0900 000 000',
    street: 'Hlavná 1', city: 'Prešov', zip: '08001', note: 'Toto je len skúška, nič neposielaj.',
    shipping_label: 'Packeta – výdajné miesto alebo Z-BOX', pickup_point: 'Z-BOX Prešov (ukážka)', pickup_point_id: '',
    items: [{ qty: 1, name: 'Držiak na okuliare', variant: '', price_cents: 500 }],
    items_cents: 500, shipping_cents: 350, cod_cents: 100, total_cents: 950,
  };
  const mailer = await connect(env);
  try {
    await mailer.send({ ...ownerMail(env, sample), subject: `[SKÚŠKA] ${ownerMail(env, sample).subject}` });
    await mailer.send({ ...customerMail(env, sample), subject: `[SKÚŠKA] ${customerMail(env, sample).subject}` });
  } finally {
    await mailer.close().catch(() => {});
  }
}
