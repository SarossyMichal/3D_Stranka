// Doprava a dobierka. Ceny sú v centoch – uprav ich tu, web aj objednávky ich prevezmú automaticky.
export const SHIPPING_METHODS = [
  { id: 'posta', label: 'Slovenská pošta – balík na adresu', price_cents: 490, pickup: false },
  { id: 'packeta_point', label: 'Packeta – výdajné miesto alebo Z-BOX', price_cents: 350, pickup: true },
  { id: 'packeta_home', label: 'Packeta – doručenie na adresu', price_cents: 450, pickup: false },
];
export const COD_FEE_CENTS = 100;

export function formatEuro(cents) {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

export async function clientHash(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}|${day}|tvoj-vytlacok`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
