import { getStore } from '@netlify/blobs';
import { requireAdmin } from '../lib/auth.mjs';

// Leest en schrijft de eigen prompt uit de admin.
// Staat er een prompt in de store, dan gebruikt analyse.mjs die voor ELKE categorie
// en worden de categorieprompts overgeslagen. Leeg opslaan wist hem weer.
export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const denied = requireAdmin(req);
  if (denied) return denied;

  const store = getStore('brightdash');

  if (req.method === 'GET') {
    try {
      const data = await store.get('prompt', { type: 'json' });
      return new Response(JSON.stringify({ prompt: data?.prompt || null }), { headers });
    } catch (err) {
      return new Response(JSON.stringify({ prompt: null, error: err.message }), { status: 500, headers });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';

      if (!prompt) {
        await store.delete('prompt');
        return new Response(JSON.stringify({ ok: true, prompt: null, message: 'Eigen prompt gewist — categorieprompts zijn weer actief' }), { headers });
      }

      await store.setJSON('prompt', { prompt, updatedAt: new Date().toISOString() });
      return new Response(JSON.stringify({ ok: true, prompt }), { headers });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
    }
  }

  return new Response(JSON.stringify({ ok: false, error: 'GET of POST' }), { status: 405, headers });
};

export const config = {
  path: '/api/admin-prompt'
};
