import { adminPage } from './_admin-page.js';

// The static admin shell is returned only after Cloudflare Access JWT validation.
export async function onRequest(context) {
  return adminPage(context);
}
