import { formatEuro } from './_shop.js';

// Optional e-mail to the shop owner via Resend. Needs Cloudflare secrets RESEND_API_KEY and ORDER_NOTIFY_EMAIL;
// without them orders are still saved and visible in the admin.
export async function notifyNewOrder(env, order) {
  if (!env.RESEND_API_KEY || !env.ORDER_NOTIFY_EMAIL) return;
  const lines = order.items.map((item) => `${item.qty} × ${item.name}${item.variant ? ` (${item.variant})` : ''} – ${formatEuro(item.price_cents * item.qty)}`);
  const text = [
    `Nová objednávka ${order.number}`,
    '',
    ...lines,
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
    'Podrobnosti nájdeš v admine (npm run admin).',
  ].filter((line, index, all) => line !== '' || all[index - 1] !== '').join('\n');

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.ORDER_NOTIFY_FROM || 'tvojVýtlačok <onboarding@resend.dev>',
        to: env.ORDER_NOTIFY_EMAIL.split(',').map((value) => value.trim()).filter(Boolean),
        subject: `Nová objednávka ${order.number} – ${formatEuro(order.total_cents)}`,
        text,
      }),
    });
  } catch {
    // The order is already saved; a failed e-mail must not break checkout.
  }
}
