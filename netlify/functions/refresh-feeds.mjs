import { getStore } from '@netlify/blobs';

const FEEDS = [
  // ── Nederlands ──
  { name: 'Emerce',          lang: 'nl', tag: 'Media',       url: 'https://www.emerce.nl/rss' },
  { name: 'Computable',      lang: 'nl', tag: 'Tech',        url: 'https://www.computable.nl/feed/' },
  { name: 'Frankwatching',   lang: 'nl', tag: 'Media',       url: 'https://www.frankwatching.com/feed/' },
  { name: 'Marketingfacts',  lang: 'nl', tag: 'Media',       url: 'https://www.marketingfacts.nl/feed' },
  { name: 'Techzine',        lang: 'nl', tag: 'Tech',        url: 'https://www.techzine.nl/feed/' },
  { name: 'NOS Tech',        lang: 'nl', tag: 'Tech',        url: 'https://feeds.nos.nl/nosnieuwstech' },
  { name: 'MT/Sprout',       lang: 'nl', tag: 'Organisatie', url: 'https://www.mt.nl/feed' },
  { name: 'AG Connect',      lang: 'nl', tag: 'Tech',        url: 'https://www.agconnect.nl/rss/nieuws.rss' },
  { name: 'Digitale Overheid',lang:'nl', tag: 'Overheid',    url: 'https://www.digitaleoverheid.nl/feed/' },
  { name: 'Binnenl.Bestuur', lang: 'nl', tag: 'Overheid',    url: 'https://www.binnenlandsbestuur.nl/rss/digitaal' },
  { name: 'PW de Gids',      lang: 'nl', tag: 'HR',          url: 'https://www.pwdegids.nl/rss' },
  { name: 'Sprout',          lang: 'nl', tag: 'Organisatie', url: 'https://www.sprout.nl/feed' },

  // ── Internationaal ──
  { name: 'TLDR AI',         lang: 'en', tag: 'AI',          url: 'https://tldr.tech/api/rss/ai' },
  { name: 'TLDR Tech',       lang: 'en', tag: 'Tech',        url: 'https://tldr.tech/api/rss/tech' },
  { name: 'The Rundown',     lang: 'en', tag: 'AI',          url: 'https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml' },
  { name: "Ben's Bites",     lang: 'en', tag: 'AI',          url: 'https://news.bensbites.com/feed' },
  { name: 'VentureBeat',     lang: 'en', tag: 'AI',          url: 'https://venturebeat.com/category/ai/feed/' },
  { name: 'The Verge',       lang: 'en', tag: 'Tech',        url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica',    lang: 'en', tag: 'Tech',        url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'Wired',           lang: 'en', tag: 'Tech',        url: 'https://www.wired.com/feed/rss' },
  { name: 'Google AI',       lang: 'en', tag: 'AI',          url: 'https://blog.google/technology/ai/rss/' },
  { name: 'MIT Tech Rev',    lang: 'en', tag: 'Tech',        url: 'https://www.technologyreview.com/feed/' },
  { name: 'MIT Sloan',       lang: 'en', tag: 'Organisatie', url: 'https://sloanreview.mit.edu/feed/' },
  { name: 'McKinsey',        lang: 'en', tag: 'Organisatie', url: 'https://www.mckinsey.com/insights/rss' },
  { name: 'HBR',             lang: 'en', tag: 'Organisatie', url: 'https://hbr.org/rss/topic/technology' },
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
    const desc  = extractTag(block, 'description').replace(/<[^>]+>/g,'').slice(0,300);
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
    if (!res.ok) {
      console.warn(`Feed ${feed.name} returned ${res.status}`);
      return [];
    }
    const xml = await res.text();
    return parseItems(xml, feed.name, feed.lang, feed.tag);
  } catch (e) {
    console.warn(`Feed ${feed.name} failed: ${e.message}`);
    return [];
  }
}

async function generateInsight(title, description, customPrompt) {
  try {
    const defaultPrompt = `Analyseer dit nieuwsbericht voor Nederlandse managers en bestuurders in energie, overheid en tech.

Geef precies deze 3 onderdelen terug, elk op een nieuwe regel:

Kern: [Wat er feitelijk gebeurt, max 2 zinnen]
Betekenis: [Strategische betekenis voor Nederlandse organisaties, max 2 zinnen]
Actie: [Wat een organisatie concreet moet doen of overwegen, max 2 actieve zinnen]

Titel: ${title}
${description ? `Info: ${description.slice(0, 300)}` : ''}

Wees bondig. Geen inleiding. Geen herhaling van de titel.`;

    const prompt = customPrompt
      ? customPrompt
          .replace(/\{\{title\}\}/g, title)
          .replace(/\{\{description\}\}/g, description || '')
          .replace(/\{\{source\}\}/g, '')
          .replace(/\{\{category\}\}/g, '')
      : defaultPrompt;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-timeout': '8000'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
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

    // Feeds ophalen
    const results = await Promise.allSettled(FEEDS.map(f => fetchFeed(f)));
    let items = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

    console.log(`Fetched ${items.length} raw items from ${FEEDS.length} feeds`);

    // Dedupliceren
    const seen = new Set();
    items = items.filter(i => { if (seen.has(i.link)) return false; seen.add(i.link); return true; });

    // Sorteren en trimmen
    items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    items = items.slice(0, 200);

    // Cache laden
    let cached = {};
    try {
      const raw = await store.get('articles', { type: 'json' });
      if (raw && Array.isArray(raw)) raw.forEach(i => { if (i.link && i.insight) cached[i.link] = i.insight; });
    } catch {}

    // Custom prompt laden
    let customPrompt = null;
    try {
      const promptData = await store.get('prompt', { type: 'json' });
      customPrompt = promptData?.prompt || null;
    } catch {}

    // Analyses genereren (max 40 nieuwe per run)
    let generated = 0;
    for (const item of items) {
      if (cached[item.link]) {
        item.insight = cached[item.link];
      } else if (generated < 20) {
        item.insight = await generateInsight(item.title, item.description, customPrompt);
        generated++;
      }
    }

    // Opslaan
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
  schedule: '0 * * * *'
};
