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

  const store = getStore('brightdash-config');

  // GET — huidige prompt ophalen
  if (request.method === "GET") {
    try {
      const prompt = await store.get('prompt', { type: 'text' });
      return new Response(JSON.stringify({ prompt: prompt || DEFAULT_PROMPT }), { status: 200, headers });
    } catch(e) {
      return new Response(JSON.stringify({ prompt: DEFAULT_PROMPT }), { status: 200, headers });
    }
  }

  // POST — prompt opslaan of testen
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { action, prompt, testTitle, testDescription } = body;

      if (action === 'save') {
        await store.set('prompt', prompt);
        // Leeg de analyse-cache zodat nieuwe prompt wordt gebruikt
        const insightStore = getStore('brightdash-insights');
        const keys = await insightStore.list();
        await Promise.all(keys.blobs.map(b => insightStore.delete(b.key)));
        return new Response(JSON.stringify({ ok: true, message: `Prompt opgeslagen. ${keys.blobs.length} gecachte analyses gewist.` }), { status: 200, headers });
      }

      if (action === 'test') {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return new Response(JSON.stringify({ error: 'API key niet geconfigureerd' }), { status: 500, headers });

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            messages: [{ role: 'user', content: `${prompt}\n\nTitel: ${testTitle}\nSamenvatting: ${testDescription || ''}` }]
          })
        });
        const data = await res.json();
        const result = (data.content?.find(b => b.type === 'text')?.text || '').trim().replace(/\*\*/g, '');
        return new Response(JSON.stringify({ result }), { status: 200, headers });
      }

    } catch(e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
};

export const config = { path: "/api/admin/prompt" };
