const publicPages = ['/', '/sluzby.html', '/obchod.html', '/postup.html', '/otazky.html', '/dopyt.html', '/kontakt.html'];
const xmlEscape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  const urls = publicPages.map((path) => `${origin}${path}`);
  if (env.DB) {
    const result = await env.DB.prepare("SELECT slug FROM products WHERE status = 'published'").all();
    for (const product of result.results || []) urls.push(`${origin}/produkt.html?slug=${encodeURIComponent(product.slug)}`);
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${xmlEscape(url)}</loc></url>`).join('')}</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
