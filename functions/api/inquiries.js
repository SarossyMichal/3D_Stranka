import { clean, noStoreHeaders } from './admin/_products.js';
import { clientHash } from './_shop.js';
import { notifyNewInquiry } from './_notify.js';

const maxBodyBytes = 16000;
const perClientHourlyLimit = 5;
const totalHourlyLimit = 60;

function json(data, status = 200) {
  return Response.json(data, { status, headers: noStoreHeaders() });
}

function readInquiry(input) {
  const value = input && typeof input === 'object' ? input : {};
  const inquiry = {
    name: clean(value.name, 120),
    email: clean(value.email, 160).toLowerCase(),
    phone: clean(value.phone, 40),
    company: clean(value.company, 120),
    description: clean(value.description, 4000),
    quantity: clean(value.quantity, 20),
    dimensions: clean(value.dimensions, 120),
    deadline: clean(value.deadline, 10),
  };
  if (!inquiry.name || !inquiry.email || !inquiry.description) throw new Error('Vyplňte meno, e-mail a opis projektu.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) throw new Error('Skontrolujte e-mailovú adresu.');
  if (inquiry.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(inquiry.deadline)) inquiry.deadline = '';
  if (value.consent !== true) throw new Error('Potvrďte súhlas so spracovaním údajov.');
  return inquiry;
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DB) return json({ error: 'Formulár je dočasne nedostupný. Skúste to neskôr.' }, 503);

  const body = await request.text();
  if (body.length > maxBodyBytes) return json({ error: 'Dopyt je príliš dlhý.' }, 413);

  let input;
  try {
    input = JSON.parse(body);
  } catch {
    return json({ error: 'Neplatná požiadavka.' }, 400);
  }

  // Hidden field that people never see; bots that fill it get a fake success.
  if (clean(input?.website, 200)) return json({ ok: true }, 201);

  let inquiry;
  try {
    inquiry = readInquiry(input);
  } catch (error) {
    return json({ error: error.message }, 400);
  }

  const hash = await clientHash(request);
  const recent = await env.DB.prepare(`SELECT
      SUM(CASE WHEN client_hash = ? THEN 1 ELSE 0 END) AS mine,
      COUNT(*) AS total
    FROM inquiries WHERE created_at > datetime('now', '-1 hour')`).bind(hash).first();
  if ((recent?.mine || 0) >= perClientHourlyLimit || (recent?.total || 0) >= totalHourlyLimit) {
    return json({ error: 'Prijali sme priveľa dopytov naraz. Skúste to prosím o hodinu.' }, 429);
  }

  await env.DB.prepare(`INSERT INTO inquiries (id, name, email, phone, company, description, quantity, dimensions, deadline, client_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), inquiry.name, inquiry.email, inquiry.phone, inquiry.company, inquiry.description, inquiry.quantity, inquiry.dimensions, inquiry.deadline, hash).run();

  waitUntil(notifyNewInquiry(env, inquiry));
  return json({ ok: true }, 201);
}
