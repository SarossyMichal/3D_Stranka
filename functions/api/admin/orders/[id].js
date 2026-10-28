import { noStoreHeaders } from '../_products.js';

const allowedStatuses = new Set(['new', 'sent', 'done', 'canceled']);

function json(data, status = 200) {
  return Response.json(data, { status, headers: noStoreHeaders() });
}

export async function onRequestPut({ request, env, params }) {
  if (!env.DB) return json({ error: 'Databáza D1 ešte nie je pripojená.' }, 503);
  const input = await request.json().catch(() => ({}));
  if (!allowedStatuses.has(input?.status)) return json({ error: 'Neplatný stav objednávky.' }, 400);

  const order = await env.DB.prepare('SELECT status, items_json FROM orders WHERE id = ?').bind(params.id).first();
  if (!order) return json({ error: 'Objednávka sa nenašla.' }, 404);
  if (order.status === 'canceled') return json({ error: 'Zrušenú objednávku už nemožno zmeniť.' }, 409);

  const statements = [env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(input.status, params.id)];
  // Canceling puts the reserved pieces back on the shelf (only for products with tracked stock).
  if (input.status === 'canceled') {
    for (const item of JSON.parse(order.items_json || '[]')) {
      statements.push(env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL').bind(item.qty, item.id));
    }
  }
  await env.DB.batch(statements);
  return json({ id: params.id, status: input.status });
}
