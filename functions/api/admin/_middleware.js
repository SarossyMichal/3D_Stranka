import { createRemoteJWKSet, jwtVerify } from 'jose';

const keySets = new Map();
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

function reply(status, code) {
  return new Response(JSON.stringify({ error: code }), { status, headers: jsonHeaders });
}

function getTeamUrl(value) {
  const url = new URL(value.startsWith('https://') ? value : `https://${value}`);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.cloudflareaccess.com')) {
    throw new Error('Invalid Access team domain');
  }
  return url;
}

function getKeySet(issuer) {
  let keySet = keySets.get(issuer);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer));
    keySets.set(issuer, keySet);
  }
  return keySet;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD || !env.ADMIN_EMAILS) {
    return reply(503, 'admin_access_not_configured');
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return reply(401, 'access_token_required');

  try {
    const teamUrl = getTeamUrl(env.CF_ACCESS_TEAM_DOMAIN);
    const issuer = teamUrl.origin;
    const { payload } = await jwtVerify(token, getKeySet(issuer), {
      issuer,
      audience: env.CF_ACCESS_AUD,
    });

    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    const allowedEmails = env.ADMIN_EMAILS.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (!email || !allowedEmails.includes(email)) return reply(403, 'admin_email_not_allowed');

    context.data.adminIdentity = { email };
    return context.next();
  } catch {
    return reply(401, 'invalid_access_token');
  }
}
