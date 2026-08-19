import { requireAdmin } from '../lib/auth.mjs';
import { maakWeek, vandaagNL, vorigeMaandag, maandagVan } from '../lib/week.mjs';

// Handmatig een weekoverzicht maken of opnieuw maken, achter het adminwachtwoord.
// Body: { maandag?: '2026-08-17', overschrijven?: true }
export default async (req) => {
  const headers = { 'Content-Type': 'application/json' };
  const geweigerd = requireAdmin(req);
  if (geweigerd) return geweigerd;

  try {
    let body = {};
    try { body = await req.json(); } catch {}
    const maandag = body.maandag ? maandagVan(body.maandag) : vorigeMaandag(vandaagNL());
    const uitkomst = await maakWeek(maandag, { overschrijven: !!body.overschrijven });
    return new Response(JSON.stringify({ ok: true, ...uitkomst }), { headers });
  } catch (err) {
    console.error('week-maken fout:', err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
  }
};

export const config = { path: '/api/week-maken' };
