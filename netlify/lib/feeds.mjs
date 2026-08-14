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
  /promo\s*code/i, /coupon/i, /discount code/i, /% off/i, /deal of the/i,
  /best deals/i, /shopping guide/i, /gift guide/i, /black friday/i,
  /cyber monday/i, /prime day/i, /sale alert/i, /voucher/i,
  /recept[e]?/i, /kook/i, /recipe/i, /cooking/i,
  /horoscope/i, /celebrity/i, /fashion week/i, /red carpet/i,
  /sports score/i, /match result/i, /goal.*minute/i,
  /dingo/i, /cat feeder/i, /pet food/i, /gardening tip/i,
  /travel tip/i, /vacation/i, /hotel review/i, /restaurant review/i,
  /lottery/i, /casino/i, /gambling/i,
  /promo code/i, /coupon code/i, /% off/i, /discount/i, /deal alert/i, /best.*deal/i, /saving/i, /voucher/i, /offer/i,
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

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'BrightDash/1.0 RSS Reader' }
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

  // Sorteren, max 200
  items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
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
