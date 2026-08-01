import { refreshFeeds } from '../lib/feeds.mjs';
import { requireAdmin } from '../lib/auth.mjs';

// HTTP-ingang voor dezelfde refresh als de cron in refresh-feeds.mjs.
// Twee paden: /api/refresh voor de auto-trigger in articles.js,
// /api/refresh-feeds voor de knop in de admin.
export default async (req) => {
  const headers = { 'Content-Type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405, headers });
  }

  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const { count, withInsight } = await refreshFeeds();
    return new Response(JSON.stringify({ ok: true, count, withInsight }), { headers });
  } catch (err) {
    console.error('refresh error:', err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
  }
};

export const config = {
  path: ['/api/refresh', '/api/refresh-feeds']
};
