import { readProduct, noStoreHeaders } from './_products.js';

function json(data, status = 200) {
  return Response.json(data, { status, headers: noStoreHeaders() });
}

function database(env) {
  return env.DB || null;
}

export async function onRequestGet({ env }) {
  const db = database(env);
  if (!db) return json({ error: 'Databáza D1 ešte nie je pripojená.' }, 503);
  const result = await db.prepare('SELECT id, slug, name, category, description, price_text, availability_text, variants_json, image_url, material, dimensions, status, price_cents, stock, updated_at FROM products ORDER BY updated_at DESC').all();
  return json({ products: result.results || [] });
}

export async function onRequestPost({ request, env }) {
  const db = database(env);
  if (!db) return json({ error: 'Databáza D1 ešte nie je pripojená.' }, 503);

  try {
    const product = readProduct(await request.json());
    const id = crypto.randomUUID();
    await db.prepare(`INSERT INTO products (id, slug, name, category, description, price_text, availability_text, variants_json, image_url, material, dimensions, status, price_cents, stock, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(id, product.slug, product.name, product.category, product.description, product.priceText, product.availabilityText, JSON.stringify(product.variants), product.imageUrl, product.material, product.dimensions, product.status, product.priceCents, product.stock).run();
    return json({ id, slug: product.slug, status: product.status }, 201);
  } catch (error) {
    const duplicate = /unique|constraint/i.test(String(error?.message));
    return json({ error: duplicate ? 'Tento URL názov už používa iný produkt.' : error?.message || 'Produkt sa nepodarilo uložiť.' }, duplicate ? 409 : 400);
  }
}
