import { SHIPPING_METHODS, COD_FEE_CENTS } from './_shop.js';

export function onRequestGet({ env }) {
  // The Packeta widget key is public by design: the map runs in the customer's browser.
  return Response.json({ shipping: SHIPPING_METHODS, cod_fee_cents: COD_FEE_CENTS, packeta_api_key: env.PACKETA_API_KEY || '' }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
