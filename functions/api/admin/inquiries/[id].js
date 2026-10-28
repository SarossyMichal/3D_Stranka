import { noStoreHeaders } from '../_products.js';

const allowedStatuses = new Set(['new', 'handled', 'archived']);

function json(data, status = 200) {
  return Response.json(data, { status, headers: noStoreHeaders() });
}

export async function onRequestPut({ request, env, params }) {
  if (!env.DB) return json({ error: 'Databáza D1 ešte nie je pripojená.' }, 503);
  const input = await request.json().catch(() => ({}));
  if (!allowedStatuses.has(input?.status)) return json({ error: 'Neplatný stav dopytu.' }, 400);
  const result = await env.DB.prepare('UPDATE inquiries SET status = ? WHERE id = ?').bind(input.status, params.id).run();
  if (!result.meta?.changes) return json({ error: 'Dopyt sa nenašiel.' }, 404);
  return json({ id: params.id, status: input.status });
}
