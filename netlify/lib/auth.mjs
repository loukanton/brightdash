import { createHash, timingSafeEqual } from 'node:crypto';

// Het wachtwoord staat in de Netlify-omgevingsvariabele ADMIN_PASSWORD.
// Nooit in de repo: admin.html gaat naar de browser en de repo is publiek.

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Vergelijk via een hash, zodat de vergelijking altijd even lang duurt
// en de lengte van het wachtwoord niet uitlekt.
function digest(value) {
  return createHash('sha256').update(String(value)).digest();
}

export function isAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const given = req.headers.get('x-admin-key') || '';
  return timingSafeEqual(digest(given), digest(expected));
}

// Geeft null als de aanvraag mag door, anders een kant-en-klare foutrespons.
// Staat ADMIN_PASSWORD niet ingesteld, dan gaat alles op slot in plaats van open.
export function requireAdmin(req) {
  if (!process.env.ADMIN_PASSWORD) {
    return new Response(
      JSON.stringify({ ok: false, error: 'ADMIN_PASSWORD is niet ingesteld in Netlify' }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  if (!isAdmin(req)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Geen toegang' }),
      { status: 401, headers: JSON_HEADERS }
    );
  }

  return null;
}
