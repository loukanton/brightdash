const FEEDS = [
  { name:'TLDR AI',       tag:'TLDR AI',       cls:'t-indigo', lang:'en', url:'https://tldr.tech/api/rss/ai'                        },
  { name:'TLDR Tech',     tag:'TLDR Tech',     cls:'t-blue',   lang:'en', url:'https://tldr.tech/api/rss/tech'                      },
  { name:'The Rundown',   tag:'The Rundown',   cls:'t-amber',  lang:'en', url:'https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml'        },
  { name:"Ben's Bites",   tag:"Ben's Bites",   cls:'t-amber',  lang:'en', url:'https://bensbites.beehiiv.com/feed'                  },
  { name:'VentureBeat',   tag:'VentureBeat',   cls:'t-red',    lang:'en', url:'https://venturebeat.com/category/ai/feed/'           },
  { name:'The Verge',     tag:'The Verge',     cls:'t-blue',   lang:'en', url:'https://www.theverge.com/rss/index.xml'              },
  { name:'Ars Technica',  tag:'Ars Technica',  cls:'t-slate',  lang:'en', url:'https://feeds.arstechnica.com/arstechnica/index'     },
  { name:'Google AI',     tag:'Google AI',     cls:'t-green',  lang:'en', url:'https://blog.google/technology/ai/rss/'              },
  { name:'Tweakers',      tag:'Tweakers',      cls:'t-red',    lang:'nl', url:'https://tweakers.net/feeds/nieuws.xml'               },
  { name:'Emerce',        tag:'Emerce',        cls:'t-teal',   lang:'nl', url:'https://www.emerce.nl/rss'                           },
  { name:'Computable',    tag:'Computable',    cls:'t-green',  lang:'nl', url:'https://www.computable.nl/feed/'                     },
  { name:'Frankwatching', tag:'Frankwatching', cls:'t-orange', lang:'nl', url:'https://www.frankwatching.com/feed/'                 },
  { name:'Marketingfacts',tag:'Mktgfacts',     cls:'t-orange', lang:'nl', url:'https://www.marketingfacts.nl/feed'                  },
  { name:'AG Connect',    tag:'AG Connect',    cls:'t-teal',   lang:'nl', url:'https://www.agconnect.nl/rss.xml'                    },
  { name:'Sprout',        tag:'Sprout',        cls:'t-orange', lang:'nl', url:'https://www.sprout.nl/feed'                          },
  { name:'NOS Tech',      tag:'NOS Tech',      cls:'t-red',    lang:'nl', url:'https://feeds.nos.nl/nosnieuwstech'                  },
  { name:'MIT Sloan',     tag:'MIT Sloan',     cls:'t-violet', lang:'en', url:'https://sloanreview.mit.edu/feed/'                   },
  { name:'McKinsey',      tag:'McKinsey',      cls:'t-slate',  lang:'en', url:'https://www.mckinsey.com/insights/rss'               },
  { name:'The Stack',     tag:'The Stack',     cls:'t-slate',  lang:'en', url:'https://thestack.technology/latest/rss/'             },
  { name:'MIT Tech Rev',  tag:'MIT Tech Rev',  cls:'t-slate',  lang:'en', url:'https://www.technologyreview.com/feed/'             },
];

const PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';
const RAW_PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  url => url,
];

function extractTag(block, tag) {
  const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
  if (cdata) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (plain) return plain[1].replace(/<[^>]*>/g, '').trim();
  return null;
}

function parseXML(xml, feed) {
  const items = [];
  const re = xml.includes('<item>') ? /<item>([\s\S]*?)<\/item>/g : /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    const title = extractTag(b, 'title');
    const link  = extractTag(b, 'link') || extractTag(b, 'guid') || (b.match(/<link[^>]+href="([^"]+)"/) || [])[1];
    const desc  = extractTag(b, 'description') || extractTag(b, 'summary') || extractTag(b, 'content');
    const date  = extractTag(b, 'pubDate') || extractTag(b, 'published') || extractTag(b, 'updated');
    if (!title || !link) continue;
    const clean = (desc || '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&#\d+;/g,'').trim().slice(0, 200);
    items.push({
      title: title.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#\d+;/g,'').trim(),
      link: link.trim(), description: clean,
      pubDate: date ? new Date(date).toISOString() : new Date().toISOString(),
      source: feed.name, tag: feed.tag, cls: feed.cls, lang: feed.lang
    });
    if (items.length >= 8) break;
  }
  return items;
}

async function fetchFeed(feed) {
  try {
    const r = await fetch(`${PROXY}${encodeURIComponent(feed.url)}&count=8`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const d = await r.json();
      if (d.status === 'ok' && d.items?.length) {
        return d.items.slice(0, 8).map(i => ({
          title: (i.title||'').replace(/&amp;/g,'&').replace(/&#\d+;/g,'').trim(),
          link: i.link || '#',
          description: (i.description||i.content||'').replace(/<[^>]*>/g,'').replace(/&[a-z]+;/g,' ').trim().slice(0,200),
          pubDate: i.pubDate ? new Date(i.pubDate).toISOString() : new Date().toISOString(),
          source: feed.name, tag: feed.tag, cls: feed.cls, lang: feed.lang
        }));
      }
    }
  } catch(e) {}
  for (const proxy of RAW_PROXIES) {
    try {
      const r = await fetch(proxy(feed.url), { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const xml = await r.text();
      if (xml.includes('<item>') || xml.includes('<entry>')) return parseXML(xml, feed);
    } catch(e) { continue; }
  }
  return [];
}

export default async () => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800"
  };
  try {
    const results = await Promise.allSettled(FEEDS.map(fetchFeed));
    const items = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    return new Response(JSON.stringify({ lastUpdated: new Date().toISOString(), items }), { status: 200, headers });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/feeds" };
