import { getStore } from "@netlify/blobs";

// Per-categorie prompts
const CATEGORY_PROMPTS = {
  AI: `Analyseer dit AI-nieuwsbericht voor Nederlandse managers en bestuurders.

Geef precies deze 3 onderdelen terug, elk op een nieuwe regel:

Kern: [Wat er technisch of zakelijk gebeurt in AI, max 2 zinnen]
Betekenis: [Wat dit betekent voor organisaties die AI willen adopteren of al gebruiken, max 2 zinnen]
Actie: [Wat een manager of bestuurder nu concreet moet doen of onderzoeken, max 2 zinnen]

Titel: {{title}}
Bron: {{source}}
{{description}}

Regels: altijd alle 3 invullen, bondig, geen inleiding, niet weigeren.`,

  Tech: `Analyseer dit technologienieuws voor Nederlandse managers en bestuurders.

Geef precies deze 3 onderdelen terug, elk op een nieuwe regel:

Kern: [Wat er technisch of zakelijk gebeurt, max 2 zinnen]
Betekenis: [Strategische betekenis voor Nederlandse tech- of energiebedrijven, max 2 zinnen]
Actie: [Concrete actie of aandachtspunt voor een organisatie, max 2 zinnen]

Titel: {{title}}
Bron: {{source}}
{{description}}

Regels: altijd alle 3 invullen, bondig, geen inleiding, niet weigeren.`,

  Overheid: `Analyseer dit overheidsgerelateerde nieuwsbericht voor Nederlandse bestuurders en beleidsmakers.

Geef precies deze 3 onderdelen terug, elk op een nieuwe regel:

Kern: [Wat er beleidsmatig of bestuurlijk gebeurt, max 2 zinnen]
Betekenis: [Impact op Nederlandse (semi-)overheidsorganisaties, max 2 zinnen]
Actie: [Wat een overheidsorganisatie nu moet doen of monitoren, max 2 zinnen]

Titel: {{title}}
Bron: {{source}}
{{description}}

Regels: altijd alle 3 invullen, bondig, geen inleiding, niet weigeren.`,

  HR: `Analyseer dit HR- en arbeidsmarktnieuws voor Nederlandse managers en HR-directeuren.

Geef precies deze 3 onderdelen terug, elk op een nieuwe regel:

Kern: [Wat er in de arbeidsmarkt of organisatie gebeurt, max 2 zinnen]
Betekenis: [Wat dit betekent voor werkgevers en HR-beleid in Nederland, max 2 zinnen]
Actie: [Concrete HR-actie of beleidsaanpassing, max 2 zinnen]

Titel: {{title}}
Bron: {{source}}
{{description}}

Regels: altijd alle 3 invullen, bondig, geen inleiding, niet weigeren.`,

  Organisatie: `Analyseer dit organisatie- en managementnieuws voor Nederlandse bestuurders.

Geef precies deze 3 onderdelen terug, elk op een nieuwe regel:

Kern: [Wat de kern van dit organisatie-inzicht is, max 2 zinnen]
Betekenis: [Wat dit betekent voor strategie en organisatieontwikkeling, max 2 zinnen]
Actie: [Wat een bestuurder of manager hiermee kan doen, max 2 zinnen]

Titel: {{title}}
Bron: {{source}}
{{description}}

Regels: altijd alle 3 invullen, bondig, geen inleiding, niet weigeren.`,

  Media: `Analyseer dit media- en marketingnieuws voor Nederlandse marketing- en communicatieprofessionals.

Geef precies deze 3 onderdelen terug, elk op een nieuwe regel:

Kern: [Wat er in media of marketing gebeurt, max 2 zinnen]
Betekenis: [Wat dit betekent voor Nederlandse merken en marketeers, max 2 zinnen]
Actie: [Concrete marketingactie of strategische overweging, max 2 zinnen]

Titel: {{title}}
Bron: {{source}}
{{description}}

Regels: altijd alle 3 invullen, bondig, geen inleiding, niet weigeren.`,

  WoW: `Analyseer dit nieuws over manier van werken voor Nederlandse managers.

Geef precies deze 3 onderdelen terug, elk op een nieuwe regel:

Kern: [Wat dit zegt over hoe organisaties werken of samenwerken, max 2 zinnen]
Betekenis: [Wat dit betekent voor werkwijze, cultuur of productiviteit, max 2 zinnen]
Actie: [Wat een manager of team concreet kan aanpassen of uitproberen, max 2 zinnen]

Titel: {{title}}
Bron: {{source}}
{{description}}

Regels: altijd alle 3 invullen, bondig, geen inleiding, niet weigeren.`,

  default: `Analyseer dit nieuwsbericht voor Nederlandse managers en bestuurders.

Geef precies deze 3 onderdelen terug, elk op een nieuwe regel:

Kern: [Wat er feitelijk gebeurt, max 2 zinnen]
Betekenis: [Strategische betekenis voor Nederlandse organisaties, max 2 zinnen]
Actie: [Wat een organisatie concreet moet doen of overwegen, max 2 zinnen]

Titel: {{title}}
Bron: {{source}}
{{description}}

Regels: altijd alle 3 invullen, bondig, geen inleiding, niet weigeren.`
};

// Relevantiecheck — is dit artikel relevant genoeg om te analyseren?
const IRRELEVANT_KEYWORDS = [
  'recipe', 'cooking', 'sports', 'celebrity', 'fashion', 'beauty',
  'horoscope', 'lottery', 'entertainment', 'movie review', 'tv show',
  'dingo', 'cat feeder', 'pet food', 'gardening', 'garden tips',
  'travel tips', 'vacation', 'hotel review', 'restaurant review'
];

function isRelevant(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  return !IRRELEVANT_KEYWORDS.some(kw => text.includes(kw));
}

function getPromptForCategory(category, title, description, source, customPrompt) {
  if (customPrompt) {
    return customPrompt
      .replace(/\{\{title\}\}/g, title || '')
      .replace(/\{\{description\}\}/g, description ? description.slice(0, 300) : '')
      .replace(/\{\{source\}\}/g, source || '')
      .replace(/\{\{category\}\}/g, category || '');
  }

  const cat = (category || '').toLowerCase();
  let template = CATEGORY_PROMPTS.default;
  if (cat.includes('ai')) template = CATEGORY_PROMPTS.AI;
  else if (cat.includes('tech')) template = CATEGORY_PROMPTS.Tech;
  else if (cat.includes('overheid')) template = CATEGORY_PROMPTS.Overheid;
  else if (cat.includes('hr')) template = CATEGORY_PROMPTS.HR;
  else if (cat.includes('organisatie')) template = CATEGORY_PROMPTS.Organisatie;
  else if (cat.includes('media')) template = CATEGORY_PROMPTS.Media;
  else if (cat.includes('wow') || cat.includes('way')) template = CATEGORY_PROMPTS.WoW;

  return template
    .replace(/\{\{title\}\}/g, title || '')
    .replace(/\{\{description\}\}/g, description ? description.slice(0, 300) : '')
    .replace(/\{\{source\}\}/g, source || '');
}

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

    // Controleer cache (tenzij forceRefresh of testMode)
    if (!testMode && !forceRefresh && link) {
      try {
        // Check in articles blob
        const articles = await store.get('articles', { type: 'json' });
        if (articles && Array.isArray(articles)) {
          const cached = articles.find(a => a.link === link);
          if (cached?.insight) {
            return new Response(JSON.stringify({ insight: cached.insight, fromCache: true }), { status: 200, headers });
          }
        }
        // Check in analyses blob als fallback
        const analyses = await store.get('analyses', { type: 'json' });
        if (analyses && analyses[link]) {
          return new Response(JSON.stringify({ insight: analyses[link], fromCache: true }), { status: 200, headers });
        }
      } catch {}
    }

    // Relevantiecheck
    if (!testMode && !isRelevant(title, description)) {
      const notRelevant = 'Dit artikel is niet direct relevant voor Nederlandse managers en bestuurders in tech, energie of overheid.';
      return new Response(JSON.stringify({ insight: null, notRelevant: true, message: notRelevant }), { status: 200, headers });
    }

    // Laad custom prompt
    let savedCustomPrompt = customPrompt;
    if (!savedCustomPrompt) {
      try {
        const promptData = await store.get('prompt', { type: 'json' });
        savedCustomPrompt = promptData?.prompt || null;
      } catch {}
    }

    const prompt = getPromptForCategory(category, title, description, source, savedCustomPrompt);

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
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const insight = data?.content?.[0]?.text?.trim();

    if (!insight) {
      return new Response(JSON.stringify({ error: 'Geen analyse ontvangen' }), { status: 500, headers });
    }

    // Sla op in BEIDE blobs voor synchronisatie
    if (!testMode && link) {
      try {
        // 1. Update analyses blob
        let analyses = {};
        try { analyses = await store.get('analyses', { type: 'json' }) || {}; } catch {}
        analyses[link] = insight;
        await store.setJSON('analyses', analyses);

        // 2. Update ook direct in articles blob
        try {
          const articles = await store.get('articles', { type: 'json' });
          if (articles && Array.isArray(articles)) {
            const idx = articles.findIndex(a => a.link === link);
            if (idx !== -1) {
              articles[idx].insight = insight;
              await store.setJSON('articles', articles);
            }
          }
        } catch {}
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
