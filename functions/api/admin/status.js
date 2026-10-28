export async function onRequestGet({ env, data }) {
  return Response.json({
    authenticated: true,
    email: data.adminIdentity.email,
    databaseConfigured: Boolean(env.DB),
    assistantConfigured: Boolean(env.XAI_API_KEY && env.XAI_API_KEY !== 'not-configured'),
    model: env.XAI_MODEL || 'grok-4.3',
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
