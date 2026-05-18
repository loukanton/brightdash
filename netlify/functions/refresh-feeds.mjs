import { getStore } from '@netlify/blobs';

const FEEDS = [
  { name: 'Emerce',           lang: 'nl', tag: 'Media',       url: 'https://www.emerce.nl/rss' },
  { name: 'Computable',       lang: 'nl', tag: 'Tech',        url: 'https://www.computable.nl/feed/' },
  { name: 'Frankwatching',    lang: 'nl', tag: 'Media',       url: 'https://www.frankwatching.com/feed/' },
  { name: 'Marketingfacts',   lang: 'nl', tag: 'Media',       url: 'https://www.marketingfacts.nl/feed' },
  { name: 'Techzine',         lang: 'nl', tag: 'Tech',        url: 'https://www.techzine.nl/feed/' },
  { name: 'NOS Tech',         lang: 'nl', tag: 'Tech',        url: 'https://feeds.nos.nl/nosnieuwstech' },
  { name: 'Digitale Overheid',lang: 'nl', tag: 'Overheid',    url: 'https://www.digitaleoverheid.nl/feed/' },
  { name: 'PW de Gids',       lang: 'nl', tag: 'HR',          url: 'https://www.pwdegids.nl/rss' },
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

function parseItems(xml, feedName, lang, tag) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const block of blocks.slice(0, 15)) {
    const title = extractTag(block, 'title');
    const link  = extractTag(block, 'link') || (block.match(/<link>([^<]+)/)||[])[1] || '';
    const desc  = extractTag(block, 'description').replace(/<[^>]+>/g,'').slice(0, 600);
    const date  = extractTag(block, 'pubDate') || extractTag(block, 'published') || new Date().toISOString();
    if (!title || !link) continue;
    items.push({ title, link, description: desc, pubDate: date, source: feedName, lang, tag });
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

export default async (req, context) => {
  try {
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

    // Koppel bestaande analyses — geen nieuwe genereren hier
    items.forEach(item => {
      if (cached[item.link]) item.insight = cached[item.link];
    });

    // Opslaan
    await store.setJSON('articles', items);
    await store.setJSON('meta', { updatedAt: new Date().toISOString(), count: items.length });

    const withInsight = items.filter(i => i.insight).length;
    console.log(`Saved ${items.length} items (${withInsight} with cached insight)`);

    return new Response(JSON.stringify({ ok: true, count: items.length, withInsight }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('refresh-feeds error:', err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  schedule: '0 * * * *'
};
