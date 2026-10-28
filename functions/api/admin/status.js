export async function onRequestGet({ env, data }) {
  return Response.json({
    authenticated: true,
    email: data.adminIdentity.email,
    databaseConfigured: Boolean(env.DB),
    assistantConfigured: Boolean(env.AI_API_KEY && env.AI_MODEL),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
