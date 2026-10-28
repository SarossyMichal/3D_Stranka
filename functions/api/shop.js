import { SHIPPING_METHODS, COD_FEE_CENTS } from './_shop.js';

export function onRequestGet() {
  return Response.json({ shipping: SHIPPING_METHODS, cod_fee_cents: COD_FEE_CENTS }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
