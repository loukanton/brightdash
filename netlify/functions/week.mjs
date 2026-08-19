import { getStore } from '@netlify/blobs';
import { schrijfDatum } from '../lib/week.mjs';

// Serveert /week (de index) en /week/2026-08-17 (één overzicht).
// De pagina wordt hier serverside opgebouwd: geen JavaScript nodig om de
// inhoud te zien, want dat was het hele punt.

const BASIS = 'https://brightdash.nl';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const STIJL = `
:root { --gold:#B8922A; --gold-border:#DFC870; --ink:#1A1714; --ink-3:#4A4540; --muted:#8A8178; --rule:#E8E2D8; --bg:#FAF8F4; --white:#FFFFFF; }
:root.donker { --gold:#C9A84C; --gold-border:#6A5010; --ink:#EEEAE4; --ink-3:#A09890; --muted:#706860; --rule:#2E2A26; --bg:#111009; --white:#181512; }
* { box-sizing:border-box; margin:0; padding:0; }
body { background:var(--bg); color:var(--ink); font-family:'Instrument Sans',system-ui,sans-serif; font-size:16px; line-height:1.65; -webkit-text-size-adjust:100%; }
a { color:inherit; }
.balk { background:var(--white); border-bottom:2px solid var(--ink); padding:14px 20px; }
.balk-inner, .inhoud, .voet-inner { max-width:720px; margin:0 auto; }
.logo { font-family:'Lora',Georgia,serif; font-size:22px; text-decoration:none; }
.logo b { font-weight:700; } .logo i { font-style:italic; color:var(--gold); }
.inhoud { padding:40px 20px 60px; }
.kruimel { font-size:12px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:var(--gold); margin-bottom:12px; }
h1 { font-family:'Lora',Georgia,serif; font-size:34px; line-height:1.2; margin-bottom:12px; }
.periode { color:var(--muted); font-size:14px; margin-bottom:28px; }
.intro p { font-size:17px; line-height:1.7; color:var(--ink-3); margin-bottom:14px; }
.intro { border-left:3px solid var(--gold); padding-left:18px; margin-bottom:44px; }
ol.berichten { list-style:none; counter-reset:bericht; }
li.bericht { counter-increment:bericht; border-top:1px solid var(--rule); padding:28px 0; }
li.bericht h2 { font-family:'Lora',Georgia,serif; font-size:22px; line-height:1.3; margin-bottom:8px; }
li.bericht h2::before { content:counter(bericht); color:var(--gold); font-family:'Instrument Sans',sans-serif; font-size:13px; font-weight:700; margin-right:10px; vertical-align:3px; }
.bron { font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:14px; }
li.bericht p.alinea { color:var(--ink-3); margin-bottom:10px; }
.origineel { display:inline-block; margin-top:8px; font-size:14px; font-weight:600; color:var(--gold); text-decoration:none; border:1px solid var(--gold-border); border-radius:5px; padding:7px 14px; }
.origineel:hover { background:var(--gold); color:#fff; }
.origtitel { font-size:12px; color:var(--muted); margin-top:10px; }
nav.omliggend { display:flex; justify-content:space-between; gap:16px; margin-top:44px; padding-top:24px; border-top:1px solid var(--rule); font-size:14px; }
nav.omliggend a { color:var(--gold); text-decoration:none; font-weight:600; }
ul.weken { list-style:none; }
ul.weken li { border-top:1px solid var(--rule); padding:20px 0; }
ul.weken a { font-family:'Lora',Georgia,serif; font-size:20px; text-decoration:none; }
ul.weken a:hover { color:var(--gold); }
.voet { border-top:1px solid var(--rule); padding:24px 20px; font-size:13px; color:var(--muted); }
.voet a { color:var(--muted); }
@media (max-width:600px) { h1 { font-size:27px; } .inhoud { padding:28px 16px 48px; } }
`;

// Zelfde thema als op de site: de keuze staat in localStorage, anders volgt
// hij de instelling van het apparaat.
const THEMA = `try{var t=localStorage.getItem('bd_theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('donker')}catch(e){}`;

function pagina({ titel, beschrijving, canoniek, inhoud, jsonld }) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(titel)} | BrightDash</title>
<meta name="description" content="${esc(beschrijving)}">
<link rel="canonical" href="${esc(canoniek)}">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(beschrijving)}">
<meta property="og:url" content="${esc(canoniek)}">
<meta property="og:type" content="article">
<meta property="og:image" content="${BASIS}/og-image.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Instrument+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>${STIJL}</style>
<script>${THEMA}</script>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
<div class="balk"><div class="balk-inner"><a class="logo" href="/"><b>Bright</b><i>Dash</i></a></div></div>
<main class="inhoud">
${inhoud}
</main>
<footer class="voet"><div class="voet-inner">
<a href="/">BrightDash</a> · <a href="/week">Alle weekoverzichten</a> · <a href="/privacy">Privacybeleid</a> · © 2026 Bright House Consulting
</div></footer>
</body>
</html>`;
}

function nietGevonden(boodschap) {
  return new Response(pagina({
    titel: 'Niet gevonden',
    beschrijving: 'Deze pagina bestaat niet.',
    canoniek: `${BASIS}/week`,
    inhoud: `<h1>Niet gevonden</h1><p class="periode">${esc(boodschap)}</p><nav class="omliggend"><a href="/week">Alle weekoverzichten</a><a href="/">Naar het nieuws</a></nav>`
  }), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function renderOverzicht(data, vorige, volgende) {
  const berichten = data.items.map(a => `
  <li class="bericht">
    <h2>${esc(a.kop)}</h2>
    <p class="bron">${esc(a.source)}${a.tag ? ` · ${esc(a.tag)}` : ''} · ${esc(schrijfDatum(new Date(a.pubDate).toISOString().slice(0, 10)))}</p>
    ${a.alineas.map(p => `<p class="alinea">${esc(p)}</p>`).join('\n    ')}
    <a class="origineel" href="${esc(a.link)}" rel="noopener nofollow" target="_blank">Lees het originele artikel bij ${esc(a.source)} →</a>
    ${a.title && a.title !== a.kop ? `<p class="origtitel">Oorspronkelijke titel: ${esc(a.title)}</p>` : ''}
  </li>`).join('\n');

  const inhoud = `
<p class="kruimel">Weekoverzicht</p>
<h1>${esc(data.titel)}</h1>
<p class="periode">${esc(data.periode)} · ${data.items.length} ${data.items.length === 1 ? 'bericht' : 'berichten'}</p>
${data.intro.length ? `<div class="intro">${data.intro.map(p => `<p>${esc(p)}</p>`).join('')}</div>` : ''}
<ol class="berichten">${berichten}
</ol>
<nav class="omliggend">
  <span>${vorige ? `<a href="/week/${esc(vorige.maandag)}">← ${esc(vorige.titel)}</a>` : ''}</span>
  <span>${volgende ? `<a href="/week/${esc(volgende.maandag)}">${esc(volgende.titel)} →</a>` : ''}</span>
</nav>`;

  return pagina({
    titel: data.titel,
    beschrijving: data.intro[0] || `De best gelezen berichten van ${data.periode} op BrightDash, met analyse.`,
    canoniek: `${BASIS}/week/${data.maandag}`,
    inhoud,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: data.titel,
      datePublished: data.gemaaktOp,
      inLanguage: 'nl-NL',
      mainEntityOfPage: `${BASIS}/week/${data.maandag}`,
      author: { '@type': 'Organization', name: 'Bright House Consulting' },
      publisher: { '@type': 'Organization', name: 'BrightDash' }
    }
  });
}

function renderIndex(weken) {
  const lijst = weken.map(w => `
  <li>
    <a href="/week/${esc(w.maandag)}">${esc(w.titel)}</a>
    <p class="periode" style="margin:4px 0 0">${esc(w.periode)} · ${w.aantal} berichten</p>
  </li>`).join('\n');

  return pagina({
    titel: 'Weekoverzichten',
    beschrijving: 'Elke week de best gelezen berichten over AI, technologie en organisatie, met analyse.',
    canoniek: `${BASIS}/week`,
    inhoud: `
<p class="kruimel">Archief</p>
<h1>Weekoverzichten</h1>
<p class="periode">Elke maandag de best gelezen berichten van de week ervoor, met de analyse erbij.</p>
${weken.length ? `<ul class="weken">${lijst}\n</ul>` : '<p class="periode">Het eerste overzicht verschijnt maandag.</p>'}
<nav class="omliggend"><a href="/">Naar het nieuws van vandaag</a><span></span></nav>`
  });
}

export default async (req, context) => {
  const store = getStore('brightdash');
  const maandag = context?.params?.maandag;

  let weken = [];
  try { weken = await store.get('weken', { type: 'json' }) || []; } catch {}

  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=1800, s-maxage=86400'
  };

  if (!maandag) {
    return new Response(renderIndex(weken), { headers });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(maandag)) {
    return nietGevonden('Dat is geen geldige datum.');
  }

  let data = null;
  try { data = await store.get(`week-${maandag}`, { type: 'json' }); } catch {}
  if (!data) return nietGevonden('Er is geen overzicht van die week.');

  const i = weken.findIndex(w => w.maandag === maandag);
  const volgende = i > 0 ? weken[i - 1] : null;      // nieuwer
  const vorige = i >= 0 && i < weken.length - 1 ? weken[i + 1] : null;

  return new Response(renderOverzicht(data, vorige, volgende), { headers });
};

export const config = { path: ['/week', '/week/:maandag'] };
