export async function onRequestGet({ env }) {
  return Response.json({
    service: 'tvoj-vytlacok',
    status: 'prepared',
    databaseConfigured: Boolean(env.DB),
    adminAccessConfigured: Boolean(env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD && env.ADMIN_EMAILS),
    aiProviderConfigured: Boolean(env.XAI_API_KEY && env.XAI_API_KEY !== 'not-configured'),
    aiModel: env.XAI_MODEL || 'grok-4.3',
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
