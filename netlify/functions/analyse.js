export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { title, description, link } = await req.json();

    if (!title) {
      return new Response(JSON.stringify({ insight: null }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const prompt = `Je bent een strategisch adviseur voor Nederlandse managers en bestuurders in energie, tech en overheid. Schrijf scherp, kort en direct — geen academische taal.

Analyseer dit artikel in exact 3 regels met deze labels:
Kern: [1-2 zinnen — wat speelt er, waarom relevant]
Betekenis: [1 zin — strategische implicatie]
Actie: [1 concrete actie of beslispunt]

Titel: ${title}
${description ? `Info: ${description.slice(0, 300)}` : ''}

Geef ALLEEN de 3 regels terug, geen bullets, geen inleiding, geen afsluiting.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
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

    const data = await response.json();
    const insight = data?.content?.[0]?.text?.trim() || null;

    return new Response(JSON.stringify({ insight }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (err) {
    console.error('Analyse error:', err);
    return new Response(JSON.stringify({ insight: null }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: '/api/analyse'
};
