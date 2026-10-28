import { noStoreHeaders } from './_products.js';

export async function onRequestGet({ env }) {
  if (!env.DB) return Response.json({ error: 'Databáza D1 ešte nie je pripojená.' }, { status: 503, headers: noStoreHeaders() });
  const result = await env.DB.prepare(`SELECT id, number, name, email, phone, street, city, zip, shipping_label, pickup_point, note, items_json,
      items_cents, shipping_cents, cod_cents, total_cents, status, created_at
    FROM orders ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'sent' THEN 1 ELSE 2 END, created_at DESC LIMIT 300`).all();
  return Response.json({ orders: result.results || [] }, { headers: noStoreHeaders() });
}
