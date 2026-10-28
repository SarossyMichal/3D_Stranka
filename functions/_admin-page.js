import { onRequest as requireAdminAccess } from './api/admin/_middleware.js';

export async function adminPage(context) {
  const response = await requireAdminAccess(context);
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
