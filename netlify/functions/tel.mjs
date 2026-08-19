import { getStore } from '@netlify/blobs';

// Telt hoe vaak een artikel is gezien en hoe vaak er is doorgeklikt naar de
// bron. Eén blob per dag: `tellingen-2026-08-19` is een map van link naar
// { weergaven, klikken }. Geen cookies, geen bezoekersgegevens, alleen tellers.
//
// De frontend verzamelt en stuurt in één keer, dus dit is een handvol
// aanroepen per bezoek. De telling is bij benadering: schrijven twee bezoekers
// op hetzelfde moment, dan wint de laatste en gaat de andere telling verloren.
// Voor een volgorde maakt dat niets uit.

const MAX_LINKS = 100;
const MAX_LENGTE = 500;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function dagSleutel() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Amsterdam' });
}

// Alleen echte, unieke http-links, en niet meer dan een handvol per aanroep
function schoon(lijst) {
  if (!Array.isArray(lijst)) return [];
  const uniek = new Set();
  for (const link of lijst) {
    if (typeof link !== 'string') continue;
    const l = link.trim();
    if (!l || l.length > MAX_LENGTE) continue;
    if (!/^https?:\/\//i.test(l)) continue;
    uniek.add(l);
    if (uniek.size >= MAX_LINKS) break;
  }
  return [...uniek];
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Alleen POST' }), { status: 405, headers });
  }

  try {
    // sendBeacon stuurt als blob; tekst lezen en zelf ontleden is het veiligst
    const tekst = await req.text();
    const body = tekst ? JSON.parse(tekst) : {};
    const weergaven = schoon(body.weergaven);
    const klikken = schoon(body.klikken);
    if (!weergaven.length && !klikken.length) {
      return new Response(null, { status: 204, headers });
    }

    const store = getStore('brightdash');
    const sleutel = `tellingen-${dagSleutel()}`;
    let tellingen = {};
    try { tellingen = await store.get(sleutel, { type: 'json' }) || {}; } catch {}

    for (const link of weergaven) {
      if (!tellingen[link]) tellingen[link] = { weergaven: 0, klikken: 0 };
      tellingen[link].weergaven++;
    }
    for (const link of klikken) {
      if (!tellingen[link]) tellingen[link] = { weergaven: 0, klikken: 0 };
      tellingen[link].klikken++;
    }

    await store.setJSON(sleutel, tellingen);
    return new Response(null, { status: 204, headers });

  } catch (err) {
    // Tellen mag nooit een bezoeker in de weg zitten
    console.warn('Tellen mislukt:', err.message);
    return new Response(null, { status: 204, headers });
  }
};

export const config = { path: '/api/tel' };
