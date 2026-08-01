import { requireAdmin } from '../lib/auth.mjs';

// Controleert alleen of het wachtwoord klopt. De admin gebruikt dit voor het inlogscherm.
export default async (req) => {
  const headers = { 'Content-Type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405, headers });
  }

  const denied = requireAdmin(req);
  if (denied) return denied;

  return new Response(JSON.stringify({ ok: true }), { headers });
};

export const config = {
  path: '/api/admin-check'
};
