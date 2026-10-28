import { noStoreHeaders } from '../_products.js';

const allowedStatuses = new Set(['published', 'hidden']);

function json(data, status = 200) {
  return Response.json(data, { status, headers: noStoreHeaders() });
}

export async function onRequestPut({ request, env, params }) {
  if (!env.DB) return json({ error: 'Databáza D1 ešte nie je pripojená.' }, 503);
  const input = await request.json().catch(() => ({}));
  if (!allowedStatuses.has(input?.status)) return json({ error: 'Neplatný stav ukážky.' }, 400);
  const result = await env.DB.prepare('UPDATE showcase SET status = ? WHERE id = ?').bind(input.status, params.id).run();
  if (!result.meta?.changes) return json({ error: 'Ukážka sa nenašla.' }, 404);
  return json({ id: params.id, status: input.status });
}

export async function onRequestDelete({ env, params }) {
  if (!env.DB) return json({ error: 'Databáza D1 ešte nie je pripojená.' }, 503);
  const item = await env.DB.prepare('SELECT image_id FROM showcase WHERE id = ?').bind(params.id).first();
  if (!item) return json({ error: 'Ukážka sa nenašla.' }, 404);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM showcase WHERE id = ?').bind(params.id),
    env.DB.prepare('DELETE FROM images WHERE id = ? AND NOT EXISTS (SELECT 1 FROM products WHERE image_url = ?)').bind(item.image_id, `/img/${item.image_id}`),
  ]);
  return json({ id: params.id, deleted: true });
}
