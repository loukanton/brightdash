import { getStore } from '@netlify/blobs';

export const FEEDS = [
  { name: 'Emerce',           lang: 'nl', tag: 'Media',       url: 'https://www.emerce.nl/rss' },
  { name: 'Computable',       lang: 'nl', tag: 'Tech',        url: 'https://www.computable.nl/feed/' },
  { name: 'Frankwatching',    lang: 'nl', tag: 'Media',       url: 'https://www.frankwatching.com/feed/' },
  { name: 'Marketingfacts',   lang: 'nl', tag: 'Media',       url: 'https://www.marketingfacts.nl/feed' },
  { name: 'Techzine',         lang: 'nl', tag: 'Tech',        url: 'https://www.techzine.nl/feed/' },
  { name: 'NOS Tech',         lang: 'nl', tag: 'Tech',        url: 'https://feeds.nos.nl/nosnieuwstech' },
  { name: 'Digitale Overheid',lang: 'nl', tag: 'Overheid',    url: 'https://www.digitaleoverheid.nl/feed/' },
  { name: 'PW de Gids',       lang: 'nl', tag: 'HR',          url: 'https://www.pwdegids.nl/rss' },
  { name: 'Tweakers',         lang: 'nl', tag: 'Tech',        url: 'https://tweakers.net/feeds/nieuws.xml' },
  { name: 'Sprout',           lang: 'nl', tag: 'Organisatie', url: 'https://www.sprout.nl/feed' },
  { name: 'AG Connect',       lang: 'nl', tag: 'Tech',        url: 'https://www.agconnect.nl/rss.xml' },
  { name: 'iGovernment',      lang: 'nl', tag: 'Overheid',    url: 'https://www.igovernment.nl/rss' },
  { name: 'The Next Web',     lang: 'en', tag: 'Tech',        url: 'https://thenextweb.com/latest/feed' },
  { name: 'TLDR AI',          lang: 'en', tag: 'AI',          url: 'https://tldr.tech/api/rss/ai' },
  { name: 'TLDR Tech',        lang: 'en', tag: 'Tech',        url: 'https://tldr.tech/api/rss/tech' },
  { name: 'The Rundown',      lang: 'en', tag: 'AI',          url: 'https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml' },
  { name: "Ben's Bites",      lang: 'en', tag: 'AI',          url: 'https://news.bensbites.com/feed' },
  { name: 'VentureBeat',      lang: 'en', tag: 'AI',          url: 'https://venturebeat.com/category/ai/feed/' },
  { name: 'The Verge',        lang: 'en', tag: 'Tech',        url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica',     lang: 'en', tag: 'Tech',        url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'Wired',            lang: 'en', tag: 'Tech',        url: 'https://www.wired.com/feed/rss' },
  { name: 'Google AI',        lang: 'en', tag: 'AI',          url: 'https://blog.google/technology/ai/rss/' },
  { name: 'MIT Tech Rev',     lang: 'en', tag: 'Tech',        url: 'https://www.technologyreview.com/feed/' },
  { name: 'MIT Sloan',        lang: 'en', tag: 'Organisatie', url: 'https://sloanreview.mit.edu/feed/' },
  { name: 'McKinsey',         lang: 'en', tag: 'Organisatie', url: 'https://www.mckinsey.com/insights/rss' },
];

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? (m[1] || m[2] || '').trim() : '';
}

// HTML-entiteiten omzetten naar gewone tekens (&#8217; wordt ', &amp; wordt &)
function decodeEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

// Irrelevante artikelen filteren
const IRRELEVANT_PATTERNS = [
  // Koopgidsen en aanbiedingen
  /promo\s*code/i, /coupon/i, /discount code/i, /% off/i, /deal of the/i,
  /best deals/i, /deal alert/i, /shopping guide/i, /gift guide/i,
  /black friday/i, /cyber monday/i, /prime day/i, /sale alert/i, /voucher/i,
  /\bbest\b.*\(20\d\d\)/i, /^\d+ best /i, /top \d+ .*\(20\d\d\)/i,
  // Productreviews van gadgets
  /review.*\(20\d\d\)/i, /^review:/i, /\breview\s*:/i, /we tested/i, /hands.on with/i,
  // Entertainment en lifestyle
  /\btrailer\b/i, /to stream this/i, /best (movies|shows|series|films)\b/i,
  /^the download:/i,
  /recept[e]?/i, /kook/i, /recipe/i, /cooking/i,
  /horoscope/i, /celebrity/i, /fashion week/i, /red carpet/i,
  /sports score/i, /match result/i,
  /dingo/i, /cat feeder/i, /pet food/i, /gardening tip/i,
  /travel tip/i, /vacation/i, /hotel review/i, /restaurant review/i,
  /lottery/i, /casino/i, /gambling/i,
  /movie review/i, /tv review/i, /album review/i,
];

function isArticleRelevant(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  return !IRRELEVANT_PATTERNS.some(pattern => pattern.test(text));
}

function parseItems(xml, feedName, lang, tag) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const block of blocks.slice(0, 15)) {
    const title = decodeEntities(extractTag(block, 'title'));
    const link  = extractTag(block, 'link') || (block.match(/<link>([^<]+)/)||[])[1] || '';
    const desc  = decodeEntities(extractTag(block, 'description')).replace(/<[^>]+>/g,'').slice(0, 600);
    const date  = extractTag(block, 'pubDate') || extractTag(block, 'published') || new Date().toISOString();
    if (!title || !link) continue;
    if (!isArticleRelevant(title, desc)) continue;
    // Filter coupon/promo URLs direct
    if (/coupon|promo.?code|discount|turbotax|voucher/i.test(link)) continue;
    // Afbeelding ophalen
    const imgMatch = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i) ||
                     block.match(/url=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/i) ||
                     block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
    const image = imgMatch ? imgMatch[1] : '';
    items.push({ title, link, description: desc, pubDate: date, source: feedName, lang, tag, image });
  }
  return items;
}

// AI-relevantiecheck: beoordeelt titels in één batch met Haiku.
// Geeft een map van link naar true (relevant) of false terug.
// Bij een fout of ontbrekende API-sleutel: lege map, dan blijft alles staan.
async function checkRelevance(items) {
  if (!process.env.ANTHROPIC_API_KEY || items.length === 0) return {};
  const lijst = items.map((it, i) => `${i}. [${it.source}] ${it.title}`).join('\n');
  const prompt = `Je filtert nieuwsartikelen voor een dashboard over AI, tech, digitale overheid, HR en organisatie, gericht op Nederlandse managers en beslissers.

NIET relevant: koopgidsen, productreviews van gadgets, kortingsacties, entertainment (films, series, trailers, games), sport, lifestyle en nieuwsbrieven die meerdere losse onderwerpen in één bericht bundelen.

WEL relevant: alles waar een manager of beslisser iets mee kan, ook als het maar zijdelings over technologie of organisaties gaat. Productnieuws en marktnieuws van vakmedia (zoals Tweakers of The Verge) is relevant; alleen hun koopgidsen en gadgetreviews niet. Twijfel je, dan is het relevant.

Antwoord met alleen een JSON-array met de nummers van artikelen die NIET relevant zijn. Geen andere tekst. Voorbeeld: [2,7]

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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    const text = data?.content?.[0]?.text || '[]';
    const afgekeurd = JSON.parse(text.match(/\[[\d,\s]*\]/)?.[0] || '[]');
    // Noodrem alleen tegen totale wissingen. Kleinere missers vangt het
    // twee-kansen-systeem op: onterecht afgekeurde artikelen komen bij
    // de herkansing vanzelf terug.
    if (items.length >= 20 && afgekeurd.length > items.length * 0.6) {
      console.warn(`Relevantiecheck genegeerd: ${afgekeurd.length} van ${items.length} afgekeurd, dat is te veel`);
      return {};
    }
    const map = {};
    items.forEach((it, i) => { map[it.link] = !afgekeurd.includes(i); });
    return map;
  } catch (e) {
    console.warn(`Relevantiecheck mislukt: ${e.message}`);
    return {};
  }
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        // Browserachtige headers: sommige sites weigeren onbekende botnamen
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
    if (!res.ok) { console.warn(`Feed ${feed.name} returned ${res.status}`); return []; }
    const xml = await res.text();
    return parseItems(xml, feed.name, feed.lang, feed.tag);
  } catch (e) {
    console.warn(`Feed ${feed.name} failed: ${e.message}`);
    return [];
  }
}

// Haalt alle feeds op en schrijft ze naar de blob store.
// Bestaande analyses blijven behouden; er worden hier geen nieuwe gegenereerd.
export async function refreshFeeds() {
  const store = getStore('brightdash');

  // Feeds ophalen in parallel
  const results = await Promise.allSettled(FEEDS.map(f => fetchFeed(f)));
  let items = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

  console.log(`Fetched ${items.length} raw items from ${FEEDS.length} feeds`);

  // Dedupliceren
  const seen = new Set();
  items = items.filter(i => { if (seen.has(i.link)) return false; seen.add(i.link); return true; });

  // Sorteren
  items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // AI-relevantiecheck. Per link kent de cache drie standen:
  // true = goedgekeurd, 'twijfel' = één keer afgekeurd (krijgt één
  // herkansing), false = twee keer afgekeurd, definitief weg.
  // Zo herstelt een te strenge beoordeling zichzelf binnen één refresh,
  // zonder dat alle oude rommel elke keer opnieuw wordt beoordeeld.
  let relevance = {};
  try { relevance = await store.get('relevance', { type: 'json' }) || {}; } catch {}
  const onbeoordeeld = items.filter(i => !(i.link in relevance) || relevance[i.link] === 'twijfel');
  const oordeel = await checkRelevance(onbeoordeeld);
  for (const [link, ok] of Object.entries(oordeel)) {
    if (ok) relevance[link] = true;
    else relevance[link] = relevance[link] === 'twijfel' ? false : 'twijfel';
  }
  const voorFilter = items.length;
  items = items.filter(i => relevance[i.link] !== false && relevance[i.link] !== 'twijfel');
  if (voorFilter > items.length) console.log(`Relevantiefilter: ${voorFilter - items.length} artikelen weggelaten`);

  // Alleen beoordelingen bewaren van links die nu nog in de feeds zitten,
  // anders groeit de cache eindeloos
  const bewaren = {};
  for (const link of Object.keys(relevance)) {
    if (seen.has(link)) bewaren[link] = relevance[link];
  }
  await store.setJSON('relevance', bewaren);

  // Max 200
  items = items.slice(0, 200);

  // Bestaande analyses uit cache bewaren
  let cached = {};
  try {
    const raw = await store.get('articles', { type: 'json' });
    if (raw && Array.isArray(raw)) {
      raw.forEach(i => { if (i.link && i.insight) cached[i.link] = i.insight; });
    }
  } catch {}

  // Ook uit de losse analyses-map, die een leeggemaakte artikelenlijst overleeft
  try {
    const analyses = await store.get('analyses', { type: 'json' });
    if (analyses) {
      for (const [link, insight] of Object.entries(analyses)) {
        if (!cached[link]) cached[link] = insight;
      }
    }
  } catch {}

  // Koppel bestaande analyses — geen nieuwe genereren hier
  items.forEach(item => {
    if (cached[item.link]) item.insight = cached[item.link];
  });

  // Opslaan
  await store.setJSON('articles', items);
  await store.setJSON('meta', { updatedAt: new Date().toISOString(), count: items.length });

  const withInsight = items.filter(i => i.insight).length;
  console.log(`Saved ${items.length} items (${withInsight} with cached insight)`);

  return { count: items.length, withInsight };
}
