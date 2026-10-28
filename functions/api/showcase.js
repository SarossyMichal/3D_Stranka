export async function onRequestGet({ env }) {
  if (!env.DB) return Response.json({ items: [] });
  const result = await env.DB.prepare("SELECT id, title, '/img/' || image_id AS image_url FROM showcase WHERE status = 'published' ORDER BY created_at DESC LIMIT 24").all();
  return Response.json({ items: result.results || [] }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } });
}
