import { getStore } from '@netlify/blobs';

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const FEEDS = [
  { name: 'TLDR AI',        lang: 'en', url: 'https://tldr.tech/api/rss/ai' },
  { name: 'TLDR Tech',      lang: 'en', url: 'https://tldr.tech/api/rss/tech' },
  { name: 'The Rundown',    lang: 'en', url: 'https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml' },
  { name: 'VentureBeat',    lang: 'en', url: 'https://venturebeat.com/category/ai/feed/' },
  { name: 'The Verge',      lang: 'en', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica',   lang: 'en', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'Google AI',      lang: 'en', url: 'https://blog.google/technology/ai/rss/' },
  { name: 'MIT Tech Rev',   lang: 'en', url: 'https://www.technologyreview.com/feed/' },
  { name: 'MIT Sloan',      lang: 'en', url: 'https://sloanreview.mit.edu/feed/' },
  { name: 'McKinsey',       lang: 'en', url: 'https://www.mckinsey.com/insights/rss' },
  { name: 'The Stack',      lang: 'en', url: 'https://thestack.technology/latest/rss/' },
  { name: 'Bloomberg Tech', lang: 'en', url: 'https://feeds.bloomberg.com/technology/news.rss' },
  { name: 'Tweakers',       lang: 'nl', url: 'https://tweakers.net/feeds/nieuws.xml' },
  { name: 'Emerce',         lang: 'nl', url: 'https://www.emerce.nl/rss' },
  { name: 'Computable',     lang: 'nl', url: 'https://www.computable.nl/feed/' },
  { name: 'Frankwatching',  lang: 'nl', url: 'https://www.frankwatching.com/feed/' },
  { name: 'Marketingfacts', lang: 'nl', url: 'https://www.marketingfacts.nl/feed' },
  { name: 'AG Connect',     lang: 'nl', url: 'https://www.agconnect.nl/rss.xml' },
  { name: 'Sprout',         lang: 'nl', url: 'https://www.sprout.nl/feed' },
  { name: 'NOS Tech',       lang: 'nl', url: 'https://feeds.nos.nl/nosnieuwstech' },
  { name: 'CIO.nl',         lang: 'nl', url: 'https://www.cio.nl/rss.xml' },
  { name: 'Techzine',       lang: 'nl', url: 'https://www.techzine.nl/feed/' },
  { name: 'iGovernment',    lang: 'nl', url: 'https://www.igovernment.nl/rss.xml' },
  { name: 'Binnenl.Bestuur',lang: 'nl', url: 'https://www.binnenlandsbestuur.nl/rss/digitaal' },
  { name: "Ben's Bites",    lang: 'en', url: 'https://news.bensbites.com/feed' },
];

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? (m[1] || m[2] || '').trim() : '';
}

function parseItems(xml, feedName, lang) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const block of blocks.slice(0, 8)) {
    const title = extractTag(block, 'title');
    const link  = extractTag(block, 'link') || (block.match(/<link>([^<]+)/)||[])[1] || '';
    const desc  = extractTag(block, 'description').replace(/<[^>]+>/g,'').slice(0,200);
    const date  = extractTag(block, 'pubDate') || extractTag(block, 'published') || new Date().toISOString();
    if (!title || !link) continue;
    items.push({ title, link, description: desc, pubDate: date, source: feedName, lang });
  }
  return items;
}

async function fetchFeed(feed) {
  try {
    const url = CORS_PROXY + encodeURIComponent(feed.url);
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseItems(xml, feed.name, feed.lang);
  } catch { return []; }
}

async function generateInsight(title, description) {
  try {
    const prompt = `Je bent een strategisch adviseur voor Nederlandse managers in energie, tech en overheid.

Analyseer dit artikel in 3 bullets:
• Relevant? [Waarom relevant voor NL bedrijven/(semi-)overheid]
• Betekenis: [Strategische betekenis]
• Actie: [Concrete actie of aandachtspunt]

Titel: ${title}
${description ? `Info: ${description.slice(0, 200)}` : ''}

Alleen de 3 bullets, geen inleiding.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    return data?.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

export default async (req, context) => {
  try {
    const store = getStore('brightdash');

    // Fetch all feeds in parallel
    const results = await Promise.allSettled(FEEDS.map(f => fetchFeed(f)));
    let items = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

    // Deduplicate by link
    const seen = new Set();
    items = items.filter(i => { if (seen.has(i.link)) return false; seen.add(i.link); return true; });

    // Sort newest first
    items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    items = items.slice(0, 160);

    // Load existing cache
    let cached = {};
    try {
      const raw = await store.get('articles', { type: 'json' });
      if (raw) raw.forEach(i => { cached[i.link] = i.insight; });
    } catch {}

    // Generate insights for new items (max 40 at a time to stay within time limit)
    let generated = 0;
    for (const item of items) {
      if (cached[item.link]) {
        item.insight = cached[item.link];
      } else if (generated < 40) {
        item.insight = await generateInsight(item.title, item.description);
        generated++;
      }
    }

    // Save to blob store
    await store.setJSON('articles', items);
    await store.setJSON('meta', { updatedAt: new Date().toISOString(), count: items.length });

    console.log(`Refresh done: ${items.length} items, ${generated} new insights`);

    return new Response(JSON.stringify({ ok: true, count: items.length, newInsights: generated }), {
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
  schedule: '0 6,10,14,18 * * *'  // 4x per dag: 08:00, 12:00, 16:00, 20:00 NL-tijd
};
