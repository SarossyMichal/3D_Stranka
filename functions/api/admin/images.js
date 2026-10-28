import { noStoreHeaders } from './_products.js';

// D1 rows can hold up to 2 MB; the admin shrinks photos well below this before upload.
const maxImageBytes = 1500000;

function json(data, status = 200) {
  return Response.json(data, { status, headers: noStoreHeaders() });
}

function detectType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return '';
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Databáza D1 ešte nie je pripojená.' }, 503);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return json({ error: 'Fotka je prázdna.' }, 400);
  if (bytes.length > maxImageBytes) return json({ error: 'Fotka je po zmenšení stále príliš veľká (max 1,5 MB).' }, 413);
  const contentType = detectType(bytes);
  if (!contentType) return json({ error: 'Podporované sú iba fotky JPG, PNG a WebP.' }, 415);

  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO images (id, content_type, size, data) VALUES (?, ?, ?, ?)')
    .bind(id, contentType, bytes.length, bytes.buffer).run();
  return json({ id, url: `/img/${id}` }, 201);
}
