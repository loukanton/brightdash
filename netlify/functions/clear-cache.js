import { getStore } from '@netlify/blobs';
import { requireAdmin } from '../lib/auth.mjs';

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405 });
  }

  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const store = getStore('brightdash');
    await store.delete('articles');
    await store.delete('meta');

    return new Response(JSON.stringify({ ok: true, message: 'Cache geleegd' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: '/api/clear-cache'
};
