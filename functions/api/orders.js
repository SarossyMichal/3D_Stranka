import { clean, noStoreHeaders } from './admin/_products.js';
import { SHIPPING_METHODS, COD_FEE_CENTS, clientHash } from './_shop.js';
import { notifyNewOrder } from './_notify.js';

const maxBodyBytes = 20000;
const maxLines = 20;
const maxQty = 50;
const perClientHourlyLimit = 5;
const totalHourlyLimit = 40;

function json(data, status = 200) {
  return Response.json(data, { status, headers: noStoreHeaders() });
}

class OrderError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function readCustomer(value) {
  const customer = {
    name: clean(value.name, 120),
    email: clean(value.email, 160).toLowerCase(),
    phone: clean(value.phone, 40),
    street: clean(value.street, 160),
    city: clean(value.city, 80),
    zip: clean(value.zip, 12).replace(/\s+/g, ''),
    note: clean(value.note, 1000),
    pickup_point: clean(value.pickup_point, 200),
  };
  if (!customer.name || !customer.email || !customer.phone || !customer.street || !customer.city || !customer.zip) {
    throw new OrderError('Vyplňte meno, e-mail, telefón a celú adresu.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new OrderError('Skontrolujte e-mailovú adresu.');
  if (!/^[+0-9 ()/-]{6,}$/.test(customer.phone)) throw new OrderError('Skontrolujte telefónne číslo.');
  if (!/^\d{5}$/.test(customer.zip)) throw new OrderError('PSČ musí mať 5 číslic.');
  return customer;
}

function readLines(items) {
  if (!Array.isArray(items) || !items.length) throw new OrderError('Košík je prázdny.');
  if (items.length > maxLines) throw new OrderError('V košíku je priveľa položiek.');
  return items.map((item) => {
    const qty = Number(item?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) throw new OrderError('Neplatný počet kusov.');
    return { id: clean(item?.id, 40), variant: clean(item?.variant, 80), qty };
  });
}

function orderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replace(/-/g, '');
  const random = crypto.getRandomValues(new Uint16Array(1))[0] % 10000;
  return `${date}-${String(random).padStart(4, '0')}`;
}

async function restoreStock(db, taken) {
  if (!taken.length) return;
  await db.batch(taken.map(([id, qty]) => db.prepare('UPDATE products SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL').bind(qty, id)));
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DB) return json({ error: 'Objednávky sú dočasne nedostupné. Skúste to neskôr.' }, 503);
  const db = env.DB;

  const body = await request.text();
  if (body.length > maxBodyBytes) return json({ error: 'Objednávka je príliš veľká.' }, 413);
  let input;
  try {
    input = JSON.parse(body);
  } catch {
    return json({ error: 'Neplatná požiadavka.' }, 400);
  }
  // Hidden field that people never see; bots that fill it get a fake success.
  if (clean(input?.website, 200)) return json({ number: '000000-0000', total_cents: 0 }, 201);

  let taken = [];
  try {
    const customer = readCustomer(input?.customer || {});
    const lines = readLines(input?.items);
    const shipping = SHIPPING_METHODS.find((method) => method.id === input?.shipping);
    if (!shipping) throw new OrderError('Vyberte spôsob dopravy.');
    if (shipping.pickup && !customer.pickup_point) throw new OrderError('Napíšte, na ktoré výdajné miesto Packety máme balík poslať.');
    if (!shipping.pickup) customer.pickup_point = '';
    if (input?.consent !== true) throw new OrderError('Potvrďte súhlas so spracovaním údajov na vybavenie objednávky.');

    const hash = await clientHash(request);
    const recent = await db.prepare(`SELECT SUM(CASE WHEN client_hash = ? THEN 1 ELSE 0 END) AS mine, COUNT(*) AS total
      FROM orders WHERE created_at > datetime('now', '-1 hour')`).bind(hash).first();
    if ((recent?.mine || 0) >= perClientHourlyLimit || (recent?.total || 0) >= totalHourlyLimit) {
      throw new OrderError('Prijali sme priveľa objednávok naraz. Skúste to prosím o chvíľu alebo nám napíšte.', 429);
    }

    const ids = [...new Set(lines.map((line) => line.id))];
    const found = await db.prepare(`SELECT id, name, price_cents, stock, variants_json FROM products
      WHERE status = 'published' AND id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all();
    const products = new Map((found.results || []).map((product) => [product.id, product]));

    const items = lines.map((line) => {
      const product = products.get(line.id);
      if (!product) throw new OrderError('Niektorý produkt v košíku už nie je v ponuke. Obnovte stránku košíka.', 409);
      if (!Number.isInteger(product.price_cents) || product.price_cents <= 0) throw new OrderError(`Produkt „${product.name}“ sa zatiaľ nedá objednať online. Pošlite nám dopyt.`, 409);
      let variants = [];
      try { variants = JSON.parse(product.variants_json || '[]'); } catch { variants = []; }
      if (variants.length && !variants.includes(line.variant)) throw new OrderError(`Vyberte variant pre „${product.name}“.`);
      if (!variants.length) line.variant = '';
      return { id: product.id, name: product.name, variant: line.variant, qty: line.qty, price_cents: product.price_cents };
    });

    const qtyById = new Map();
    for (const item of items) qtyById.set(item.id, (qtyById.get(item.id) || 0) + item.qty);
    for (const [id, qty] of qtyById) {
      const product = products.get(id);
      if (product.stock !== null && product.stock < qty) {
        throw new OrderError(product.stock > 0 ? `Produkt „${product.name}“ máme na sklade už len ${product.stock} ks.` : `Produkt „${product.name}“ je už vypredaný.`, 409);
      }
    }

    // Reserve stock only for products we track; the WHERE keeps two parallel orders from overselling.
    const tracked = [...qtyById].filter(([id]) => products.get(id).stock !== null);
    if (tracked.length) {
      const results = await db.batch(tracked.map(([id, qty]) => db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?').bind(qty, id, qty)));
      taken = tracked.filter((_, index) => results[index].meta?.changes);
      if (taken.length !== tracked.length) throw new OrderError('Medzitým niekto kúpil posledné kusy. Obnovte stránku košíka.', 409);
    }

    const itemsCents = items.reduce((sum, item) => sum + item.price_cents * item.qty, 0);
    const order = {
      id: crypto.randomUUID(),
      number: orderNumber(),
      ...customer,
      shipping_method: shipping.id,
      shipping_label: shipping.label,
      items,
      items_cents: itemsCents,
      shipping_cents: shipping.price_cents,
      cod_cents: COD_FEE_CENTS,
      total_cents: itemsCents + shipping.price_cents + COD_FEE_CENTS,
    };

    await db.prepare(`INSERT INTO orders (id, number, name, email, phone, street, city, zip, shipping_method, shipping_label, pickup_point, note,
        items_json, items_cents, shipping_cents, cod_cents, total_cents, client_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(order.id, order.number, order.name, order.email, order.phone, order.street, order.city, order.zip, order.shipping_method, order.shipping_label,
        order.pickup_point, order.note, JSON.stringify(items), order.items_cents, order.shipping_cents, order.cod_cents, order.total_cents, hash).run();

    waitUntil(notifyNewOrder(env, order));
    return json({ number: order.number, total_cents: order.total_cents }, 201);
  } catch (error) {
    await restoreStock(db, taken).catch(() => {});
    if (error instanceof OrderError) return json({ error: error.message }, error.status);
    return json({ error: 'Objednávku sa nepodarilo uložiť. Skúste to znova alebo nám napíšte.' }, 500);
  }
}
