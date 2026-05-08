import { getStore } from "@netlify/blobs";

const DEFAULT_PROMPT = `Is dit relevant voor een consultant die NL bedrijven en overheden adviseert over digitalisering? Zo ja: schrijf 1 zin wat de consultant ermee kan (max 15 woorden). Zo nee: schrijf alleen een streepje.`;

export default async (request) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const body = await request.json();
    const { link, title, description } = body;

    if (!link || !title) {
      return new Response(JSON.stringify({ error: 'link en title zijn verplicht' }), { status: 400, headers });
    }

    const store = getStore('brightdash-insights');

    // Check cache eerst
    const cacheKey = Buffer.from(link).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 100);

    try {
      const cached = await store.get(cacheKey, { type: 'json' });
      if (cached?.insight) {
        console.log('Cache hit:', title.slice(0, 50));
        return new Response(JSON.stringify({ insight: cached.insight, cached: true }), { status: 200, headers });
      }
    } catch(e) {
      // Geen cache entry — doorgaan
    }

    // Haal huidige prompt op (kan aangepast zijn via admin)
    let prompt = DEFAULT_PROMPT;
    try {
      const promptStore = getStore('brightdash-config');
      const customPrompt = await promptStore.get('prompt', { type: 'text' });
      if (customPrompt) prompt = customPrompt;
    } catch(e) {}

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key niet geconfigureerd' }), { status: 500, headers });
    }

    // Genereer analyse
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 60,
        messages: [{
          role: 'user',
          content: `${prompt}\n\nTitel: ${title}\nSamenvatting: ${description || ''}`
        }]
      })
    });

    const data = await res.json();
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), { status: 500, headers });
    }

    const insight = (data.content?.find(b => b.type === 'text')?.text || '').trim().replace(/\*\*/g, '');

    // Sla op in cache
    await store.setJSON(cacheKey, { insight, link, generatedAt: new Date().toISOString() });

    return new Response(JSON.stringify({ insight, cached: false }), { status: 200, headers });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/analyse" };
