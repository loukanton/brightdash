import { getStore } from "@netlify/blobs";

export default async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const body = await req.json();
    const { title, description, link, source, category, testMode, customPrompt, forceRefresh } = body;

    if (!title) {
      return new Response(JSON.stringify({ error: 'Titel vereist' }), { status: 400, headers });
    }

    const store = getStore('brightdash');

    // In normale modus: controleer cache (tenzij forceRefresh of testMode)
    if (!testMode && !forceRefresh && link) {
      try {
        const cached = await store.get('analyses', { type: 'json' });
        if (cached && cached[link]) {
          return new Response(JSON.stringify({ insight: cached[link], fromCache: true }), { status: 200, headers });
        }
      } catch {}
    }

    // Laad opgeslagen prompt (tenzij testMode met customPrompt)
    let promptTemplate = customPrompt;
    if (!promptTemplate) {
      try {
        const promptData = await store.get('prompt', { type: 'json' });
        promptTemplate = promptData?.prompt;
      } catch {}
    }

    // Standaard prompt als fallback
    if (!promptTemplate) {
      promptTemplate = `Analyseer dit nieuwsbericht voor Nederlandse managers en bestuurders in energie, overheid en tech.

Geef precies deze 3 onderdelen terug, elk op een nieuwe regel:

Kern: [Wat er feitelijk gebeurt, max 1 zin]
Betekenis: [Strategische betekenis voor Nederlandse organisaties, max 1 zin]
Actie: [Wat een organisatie concreet moet doen of overwegen, 1 actieve zin]

Titel: {{title}}
Bron: {{source}}
{{description}}

Wees bondig. Geen inleiding. Geen herhaling van de titel.`;
    }

    // Vervang variabelen
    const prompt = promptTemplate
      .replace(/\{\{title\}\}/g, title || '')
      .replace(/\{\{description\}\}/g, description ? description.slice(0, 300) : '')
      .replace(/\{\{source\}\}/g, source || '')
      .replace(/\{\{category\}\}/g, category || '');

    // Roep Anthropic API aan
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
    const insight = data?.content?.[0]?.text?.trim();

    if (!insight) {
      return new Response(JSON.stringify({ error: 'Geen analyse ontvangen van API' }), { status: 500, headers });
    }

    // Sla op in cache (alleen als het geen testMode is)
    if (!testMode && link) {
      try {
        let cached = {};
        try {
          cached = await store.get('analyses', { type: 'json' }) || {};
        } catch {}
        cached[link] = insight;
        await store.setJSON('analyses', cached);
      } catch (e) {
        console.warn('Cache opslaan mislukt:', e.message);
      }
    }

    return new Response(JSON.stringify({ insight, testMode: !!testMode }), { status: 200, headers });

  } catch (err) {
    console.error('Analyse fout:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/analyse" };
