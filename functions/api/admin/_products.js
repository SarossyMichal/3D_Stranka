const allowedStatuses = new Set(['draft', 'published', 'archived']);

export function readProduct(input) {
  const value = input && typeof input === 'object' ? input : {};
  const name = clean(value.name, 120);
  const slug = clean(value.slug, 90).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const category = clean(value.category, 60);
  const description = clean(value.description, 3000);
  const priceText = clean(value.price_text, 80);
  const availabilityText = clean(value.availability_text, 100);
  const imageUrl = clean(value.image_url, 500);
  const material = clean(value.material, 100);
  const dimensions = clean(value.dimensions, 120);
  const variants = Array.isArray(value.variants) ? value.variants.map((item) => clean(item, 80)).filter(Boolean).slice(0, 20) : [];
  const status = allowedStatuses.has(value.status) ? value.status : 'draft';
  const priceCents = readWhole(value.price_cents, 'Cena', 1000000);
  const stock = readWhole(value.stock, 'Počet kusov', 100000);

  if (!name || !slug || !category || !description) throw new Error('Vyplň názov, URL názov, kategóriu a popis.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('URL názov môže obsahovať iba malé písmená, čísla a spojovníky.');
  if (imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('https://')) throw new Error('Obrázok musí mať adresu HTTPS alebo cestu od koreňa webu.');

  return {
    name, slug, category, description, availabilityText, variants, imageUrl, material, dimensions, status, priceCents, stock,
    priceText: priceCents === null ? priceText : `${(priceCents / 100).toFixed(2).replace('.', ',')} €`,
  };
}

// Empty means "not set" (null); otherwise a whole number from 0 up to max.
function readWhole(value, label, max) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > max) throw new Error(`${label} musí byť celé nezáporné číslo.`);
  return number;
}

export function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function noStoreHeaders() {
  return { 'Cache-Control': 'no-store' };
}
