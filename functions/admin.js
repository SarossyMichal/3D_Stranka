import { adminPage } from './_admin-page.js';

// Protect both /admin and /admin.html; Pages may redirect between the paths.
export async function onRequest(context) {
  return adminPage(context);
}
