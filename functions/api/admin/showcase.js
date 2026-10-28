import { clean, noStoreHeaders } from './_products.js';

function json(data, status = 200) {
  return Response.json(data, { status, headers: noStoreHeaders() });
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: 'Databáza D1 ešte nie je pripojená.' }, 503);
  const result = await env.DB.prepare("SELECT id, title, status, '/img/' || image_id AS image_url FROM showcase ORDER BY created_at DESC").all();
  return json({ items: result.results || [] });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Databáza D1 ešte nie je pripojená.' }, 503);
  const input = await request.json().catch(() => ({}));
  const imageId = clean(input?.image_id, 36);
  const title = clean(input?.title, 120);
  const image = imageId && await env.DB.prepare('SELECT id FROM images WHERE id = ?').bind(imageId).first();
  if (!image) return json({ error: 'Najprv nahraj fotku.' }, 400);
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO showcase (id, image_id, title) VALUES (?, ?, ?)').bind(id, imageId, title).run();
  return json({ id }, 201);
}
