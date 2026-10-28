const MAX_INPUT = 2400;

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPost({ request, env }) {
  if (!env.XAI_API_KEY || env.XAI_API_KEY === 'not-configured') return json({ error: 'Grok ešte nie je pripojený. Kľúč nastav v Cloudflare ako tajomstvo XAI_API_KEY.' }, 503);

  let input;
  try { input = await request.json(); } catch { return json({ error: 'Požiadavka neobsahuje platné údaje.' }, 400); }
  const facts = {
    name: text(input.name, 120),
    category: text(input.category, 60),
    material: text(input.material, 100),
    dimensions: text(input.dimensions, 120),
    variants: Array.isArray(input.variants) ? input.variants.map((item) => text(item, 80)).filter(Boolean).slice(0, 20) : [],
    notes: text(input.notes, MAX_INPUT),
  };
  if (!facts.name || !facts.notes) return json({ error: 'Doplň názov produktu a aspoň krátky opis, čo o ňom vieš.' }, 400);

  const model = text(env.XAI_MODEL, 80) || 'grok-4.3';
  try {
    const response = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.XAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        store: false,
        temperature: 0.3,
        max_output_tokens: 420,
        input: [
          { role: 'system', content: 'Píšeš slovenské produktové texty pre malý obchod s 3D tlačou. Vytvor vecný, prirodzený a stručný návrh popisu v slovenčine. Použi iba fakty, ktoré dodal používateľ. Nikdy nevymýšľaj cenu, dostupnosť, materiál, rozmery, vlastnosti, certifikáty ani dodaciu dobu. Ak údaj chýba, jednoducho ho nespomínaj. Nepridávaj titulok ani odrážky, iba samotný popis. Text má mať najviac 3 krátke odseky.' },
          { role: 'user', content: `Vytvor návrh popisu z týchto faktov:\n${JSON.stringify(facts)}` },
        ],
      }),
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok) return json({ error: response.status === 429 ? 'Grok má teraz príliš veľa požiadaviek. Skús to o chvíľu.' : 'Grok neodpovedal úspešne. Skontroluj kľúč, model a stav API účtu.' }, response.status === 429 ? 429 : 502);
    const payload = await response.json();
    const description = (payload.output || []).flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('\n').trim();
    if (!description) return json({ error: 'Grok nevrátil textový návrh. Skús to znova.' }, 502);
    return json({ description, model });
  } catch {
    return json({ error: 'Grok sa nepodarilo kontaktovať. Skontroluj internetové pripojenie a nastavenie Cloudflare.' }, 502);
  }
}

function text(value, length) {
  return typeof value === 'string' ? value.trim().slice(0, length) : '';
}
