import { refreshFeeds } from '../lib/feeds.mjs';

// Cron-ingang. De HTTP-ingang zit in refresh.mjs; beide draaien dezelfde logica.
export default async () => {
  try {
    const { count, withInsight } = await refreshFeeds();
    return new Response(JSON.stringify({ ok: true, count, withInsight }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('refresh-feeds error:', err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  schedule: '*/30 * * * *'
};
