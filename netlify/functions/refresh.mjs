import { getStore } from '@netlify/blobs';
import { refreshFeeds } from '../lib/feeds.mjs';
import { requireAdmin } from '../lib/auth.mjs';

// HTTP-ingang voor dezelfde refresh als de cron in refresh-feeds.mjs.
//
// Twee paden, twee regels:
// - /api/refresh-feeds is de knop in de admin en vraagt altijd om het wachtwoord.
// - /api/refresh is de self-heal die articles.js aanroept als de lijst leeg is.
//   Die mag zonder wachtwoord, maar alleen als de lijst ook echt leeg is. Staat er
//   al iets, dan gelden gewoon de adminregels en kan niemand het endpoint gebruiken
//   om de feeds te laten rondpompen.
export default async (req) => {
  const headers = { 'Content-Type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405, headers });
  }

  let selfHeal = false;
  if (new URL(req.url).pathname === '/api/refresh') {
    try {
      const articles = await getStore('brightdash').get('articles', { type: 'json' });
      selfHeal = !Array.isArray(articles) || articles.length === 0;
    } catch {
      selfHeal = true;
    }
  }

  if (!selfHeal) {
    const denied = requireAdmin(req);
    if (denied) return denied;
  }

  try {
    const { count, withInsight } = await refreshFeeds();
    return new Response(JSON.stringify({ ok: true, count, withInsight, selfHeal }), { headers });
  } catch (err) {
    console.error('refresh error:', err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
  }
};

export const config = {
  path: ['/api/refresh', '/api/refresh-feeds']
};
