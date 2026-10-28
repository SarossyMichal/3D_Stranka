import { readProduct, noStoreHeaders } from '../_products.js';

function json(data, status = 200) {
  return Response.json(data, { status, headers: noStoreHeaders() });
}

export async function onRequestPut({ request, env, params }) {
  if (!env.DB) return json({ error: 'Databáza D1 ešte nie je pripojená.' }, 503);
  try {
    const product = readProduct(await request.json());
    const result = await env.DB.prepare(`UPDATE products SET slug = ?, name = ?, category = ?, description = ?, price_text = ?, availability_text = ?, variants_json = ?, image_url = ?, material = ?, dimensions = ?, status = ?, price_cents = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(product.slug, product.name, product.category, product.description, product.priceText, product.availabilityText, JSON.stringify(product.variants), product.imageUrl, product.material, product.dimensions, product.status, product.priceCents, product.stock, params.id).run();
    if (!result.meta?.changes) return json({ error: 'Produkt sa nenašiel.' }, 404);
    return json({ id: params.id, slug: product.slug, status: product.status });
  } catch (error) {
    const duplicate = /unique|constraint/i.test(String(error?.message));
    return json({ error: duplicate ? 'Tento URL názov už používa iný produkt.' : error?.message || 'Produkt sa nepodarilo uložiť.' }, duplicate ? 409 : 400);
  }
}
