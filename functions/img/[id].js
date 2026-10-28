// Serves photos uploaded in the local admin. Ids are random and images never change, so they cache forever.
export async function onRequestGet({ env, params }) {
  if (!env.DB || !/^[0-9a-f-]{36}$/.test(params.id)) return new Response('Not found', { status: 404 });
  const image = await env.DB.prepare('SELECT content_type, data FROM images WHERE id = ?').bind(params.id).first();
  if (!image) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      'Content-Type': image.content_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
