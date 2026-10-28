import { noStoreHeaders } from './_products.js';

export async function onRequestGet({ env }) {
  if (!env.DB) return Response.json({ error: 'Databáza D1 ešte nie je pripojená.' }, { status: 503, headers: noStoreHeaders() });
  const result = await env.DB.prepare(`SELECT id, name, email, phone, company, description, quantity, dimensions, deadline, status, created_at
    FROM inquiries ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'handled' THEN 1 ELSE 2 END, created_at DESC LIMIT 300`).all();
  return Response.json({ inquiries: result.results || [] }, { headers: noStoreHeaders() });
}
