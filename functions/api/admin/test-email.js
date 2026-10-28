import { mailConfigured, sendTestMail } from '../_notify.js';
import { noStoreHeaders } from './_products.js';

export async function onRequestPost({ env }) {
  if (!mailConfigured(env)) {
    return Response.json({ error: 'E-maily nie sú nastavené. Chýba heslo pre aplikácie GMAIL_APP_PASSWORD.' }, { status: 503, headers: noStoreHeaders() });
  }
  try {
    await sendTestMail(env);
    return Response.json({ sent: env.SHOP_EMAIL }, { headers: noStoreHeaders() });
  } catch (error) {
    return Response.json({ error: `Gmail e-mail neodoslal: ${error.message}` }, { status: 502, headers: noStoreHeaders() });
  }
}
