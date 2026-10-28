function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } });
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ products: [], configured: false });
  const slug = new URL(request.url).searchParams.get('slug');
  if (slug) {
    const product = await env.DB.prepare("SELECT id, slug, name, category, description, price_text, availability_text, variants_json, image_url, material, dimensions, price_cents, stock FROM products WHERE slug = ? AND status = 'published' AND (stock IS NULL OR stock > 0) LIMIT 1").bind(slug).first();
    return product ? json({ product }) : json({ error: 'Produkt sa nenašiel.' }, 404);
  }
  const result = await env.DB.prepare("SELECT id, slug, name, category, description, price_text, availability_text, variants_json, image_url, material, dimensions, price_cents, stock FROM products WHERE status = 'published' AND (stock IS NULL OR stock > 0) ORDER BY updated_at DESC").all();
  return json({ products: result.results || [], configured: true });
}
