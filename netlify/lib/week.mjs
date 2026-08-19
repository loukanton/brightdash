import { getStore } from '@netlify/blobs';

// Bouwt het weekoverzicht: de best gelezen artikelen van een week, met hun
// analyse, en twee alinea's van Claude over de rode draad.
//
// Opslag: `week-2026-08-17` (de maandag) met de kant-en-klare inhoud, en
// `weken` als index van alles wat gepubliceerd is. Eenmaal gemaakt verandert
// een week niet meer, ook niet als het archief eronder opschuift.

const AANTAL = 20;
// Een doorklik weegt zwaarder dan een weergave: iemand die doorklikt heeft
// echt iets met het bericht, iemand die scrollt zag het alleen.
const KLIK_GEWICHT = 5;

const MAANDEN = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

// ── Datums ──
// Alles op twaalf uur 's middags UTC, dan kan een zomertijdsprong nooit een
// dag verschuiven.
function alsDatum(s) { return new Date(`${s}T12:00:00Z`); }
function alsTekst(d) { return d.toISOString().slice(0, 10); }

export function vandaagNL() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Amsterdam' });
}

export function maandagVan(datum) {
  const d = alsDatum(datum);
  const dag = d.getUTCDay();              // 0 = zondag
  d.setUTCDate(d.getUTCDate() + (dag === 0 ? -6 : 1 - dag));
  return alsTekst(d);
}

export function vorigeMaandag(datum) {
  const d = alsDatum(maandagVan(datum));
  d.setUTCDate(d.getUTCDate() - 7);
  return alsTekst(d);
}

export function weekDagen(maandag) {
  const d = alsDatum(maandag);
  return Array.from({ length: 7 }, (_, i) => {
    const dag = new Date(d);
    dag.setUTCDate(d.getUTCDate() + i);
    return alsTekst(dag);
  });
}

export function schrijfDatum(datum) {
  const d = alsDatum(datum);
  return `${d.getUTCDate()} ${MAANDEN[d.getUTCMonth()]}`;
}

export function schrijfPeriode(maandag) {
  const dagen = weekDagen(maandag);
  const van = alsDatum(dagen[0]);
  const tot = alsDatum(dagen[6]);
  const jaar = tot.getUTCFullYear();
  if (van.getUTCMonth() === tot.getUTCMonth()) {
    return `${van.getUTCDate()} tot en met ${tot.getUTCDate()} ${MAANDEN[tot.getUTCMonth()]} ${jaar}`;
  }
  return `${schrijfDatum(dagen[0])} tot en met ${schrijfDatum(dagen[6])} ${jaar}`;
}

// ── Analysetekst ──
// De kopregel eraf, en de labels van oude analyses ook. Wat overblijft zijn
// de alinea's.
export function analyseAlineas(tekst) {
  if (!tekst) return [];
  return String(tekst)
    .split('\n')
    .map(r => r.trim())
    .filter(Boolean)
    .filter(r => !/^kop:/i.test(r))
    .map(r => r.replace(/^(kern|betekenis|actie)\s*:\s*/i, '').trim())
    .filter(Boolean);
}

// ── Verzamelen ──
export async function verzamelWeek(store, maandag) {
  const dagen = weekDagen(maandag);

  const archief = {};
  const tellingen = {};
  for (const dag of dagen) {
    try {
      const a = await store.get(`archief-${dag}`, { type: 'json' });
      if (a) Object.assign(archief, a);
    } catch {}
    try {
      const t = await store.get(`tellingen-${dag}`, { type: 'json' });
      if (t) {
        for (const [link, telling] of Object.entries(t)) {
          if (!tellingen[link]) tellingen[link] = { weergaven: 0, klikken: 0 };
          tellingen[link].weergaven += telling.weergaven || 0;
          tellingen[link].klikken += telling.klikken || 0;
        }
      }
    } catch {}
  }

  let analyses = {};
  try { analyses = await store.get('analyses', { type: 'json' }) || {}; } catch {}

  const items = Object.values(archief)
    .map(a => {
      const telling = tellingen[a.link] || { weergaven: 0, klikken: 0 };
      return {
        ...a,
        analyse: analyses[a.link] || '',
        weergaven: telling.weergaven,
        klikken: telling.klikken,
        score: telling.klikken * KLIK_GEWICHT + telling.weergaven
      };
    })
    .filter(a => a.analyse);

  // Meest gelezen eerst; bij gelijke stand het nieuwste bericht
  items.sort((a, b) => b.score - a.score || new Date(b.pubDate) - new Date(a.pubDate));

  return items.slice(0, AANTAL);
}

// ── Intro ──
// Twee alinea's over de rode draad, plus een titel voor de pagina. Zonder dit
// is het een lijstje; hiermee is het een overzicht.
async function schrijfIntro(items, maandag) {
  const terugval = {
    titel: `Het nieuws van ${schrijfPeriode(maandag)}`,
    intro: []
  };
  if (!process.env.ANTHROPIC_API_KEY || items.length === 0) return terugval;

  const lijst = items.map((a, i) => `${i + 1}. [${a.source}] ${a.kop || a.title}`).join('\n');
  const prompt = `Hieronder staan de best gelezen berichten van BrightDash over de week van ${schrijfPeriode(maandag)}. BrightDash is een nieuwsoverzicht over AI, technologie, digitale overheid, HR en organisatie voor Nederlandse managers en beslissers.

Schrijf een korte inleiding bij dit weekoverzicht.

Antwoord precies zo:
- Eerst een regel die begint met "Titel:" gevolgd door een titel voor deze pagina. Hooguit acht woorden, feitelijk, benoemt het belangrijkste onderwerp van de week. Geen clickbait, geen dubbele punt, geen jaartal.
- Daarna een lege regel.
- Daarna twee alinea's, elk op een eigen regel, samen hooguit honderdtwintig woorden. De eerste alinea benoemt de rode draad: wat verbindt deze berichten, of wat viel op. De tweede alinea zegt wat dat betekent voor Nederlandse organisaties.

Schrijfregels: korte zinnen, actieve werkwoorden, helder Nederlands. Geen vaktaal, geen Engelse termen die een Nederlands woord hebben. Geen opsommingen, geen kopjes, geen labels. Verzin niets wat niet uit de lijst blijkt; zie je geen rode draad, zeg dan gewoon dat de week verdeeld was en noem de twee grootste onderwerpen. Schrijf niet over BrightDash zelf en spreek de lezer niet aan met "u".

${lijst}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    const tekst = data?.content?.[0]?.text?.trim();
    if (!tekst) return terugval;

    const regels = tekst.split('\n').map(r => r.trim()).filter(Boolean);
    const titelRegel = regels.find(r => /^titel:/i.test(r));
    const titel = titelRegel ? titelRegel.replace(/^titel:\s*/i, '').trim() : terugval.titel;
    const intro = regels.filter(r => !/^titel:/i.test(r));
    return { titel: titel || terugval.titel, intro };
  } catch (e) {
    console.warn(`Intro schrijven mislukt: ${e.message}`);
    return terugval;
  }
}

// ── Maken ──
export async function maakWeek(maandag, { overschrijven = false } = {}) {
  const store = getStore('brightdash');

  if (!overschrijven) {
    try {
      const bestaand = await store.get(`week-${maandag}`, { type: 'json' });
      if (bestaand) return { maandag, overgeslagen: true, aantal: bestaand.items?.length || 0 };
    } catch {}
  }

  const items = await verzamelWeek(store, maandag);
  if (items.length === 0) return { maandag, leeg: true, aantal: 0 };

  const { titel, intro } = await schrijfIntro(items, maandag);

  const pagina = {
    maandag,
    periode: schrijfPeriode(maandag),
    titel,
    intro,
    gemaaktOp: new Date().toISOString(),
    items: items.map(a => ({
      link: a.link,
      kop: a.kop || a.title,
      title: a.title,
      source: a.source,
      tag: a.tag,
      pubDate: a.pubDate,
      alineas: analyseAlineas(a.analyse),
      weergaven: a.weergaven,
      klikken: a.klikken
    }))
  };

  await store.setJSON(`week-${maandag}`, pagina);

  // Index bijwerken, nieuwste eerst
  let weken = [];
  try { weken = await store.get('weken', { type: 'json' }) || []; } catch {}
  weken = weken.filter(w => w.maandag !== maandag);
  weken.push({ maandag, titel, periode: pagina.periode, aantal: pagina.items.length });
  weken.sort((a, b) => (a.maandag < b.maandag ? 1 : -1));
  await store.setJSON('weken', weken);

  return { maandag, aantal: pagina.items.length, titel };
}
