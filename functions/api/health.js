export async function onRequestGet({ env }) {
  return Response.json({
    service: 'tvoj-vytlacok',
    status: 'prepared',
    databaseConfigured: Boolean(env.DB),
    adminAccessConfigured: Boolean(env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD && env.ADMIN_EMAILS),
    aiProviderConfigured: Boolean(env.AI_API_KEY && env.AI_MODEL),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
