import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  try {
    const store = getStore('brightdash');
    const articles = await store.get('articles', { type: 'json' });
    const meta = await store.get('meta', { type: 'json' });

    if (!articles || articles.length === 0) {
      // Trigger a background refresh so next request has data.
      // /api/refresh mag zonder wachtwoord zolang de lijst leeg is.
      context.waitUntil(
        fetch(new URL('/api/refresh', req.url).toString(), { method: 'POST' }).catch(()=>{})
      );
      return new Response(JSON.stringify({ articles: [], updatedAt: null, refreshing: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ articles, updatedAt: meta?.updatedAt || null }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ articles: [], updatedAt: null, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: '/api/articles'
};
