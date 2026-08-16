import { getStore } from "@netlify/blobs";

// Gedeelde schrijfinstructies voor alle prompts
const SCHRIJFREGELS = `
Schrijfregels (strikt volgen):
- Schrijf één doorlopende alinea van 2 tot 4 korte zinnen. Geen labels, geen kopjes, geen opsommingen.
- De eerste zin is feitelijk: wat is er gebeurd? Schrijf alsof je het aan een collega uitlegt bij de koffieautomaat. Geen vaktaal, geen omhaal.
- Daarna wat het betekent: alleen wat direct uit het artikel volgt, geen extrapolaties. Elke zin is één gedachte, geen bijzinnen. Begin niet met "Dit betekent dat".
- Een afsluitende actiezin mag alleen als er een stap is die NIET al vanzelf uit de rest volgt. Zou een slimme lezer die stap zelf bedenken? Laat hem dan weg. Begin zo'n zin met een concreet werkwoord (bijv. Evalueer / Bespreek / Test / Stel bij / Vraag / Vergelijk). Gebruik nooit "Zorg dat" of "Onderzoek of". Verboden: adviezen die op elk bericht passen, zoals "Bespreek dit met je team", "Evalueer je strategie" of "Volg de ontwikkelingen".
- Heeft het artikel weinig inhoud (aankondiging, evenement, fotoreportage): schrijf dan alleen die ene feitelijke zin, kort en droog. Vul nooit op.
- Leg nooit uit wat je weglaat. Geen sterretjes, geen kanttekeningen, geen commentaar op het artikel zelf.
- Geen inleiding, geen afsluiting, geen tekst buiten de alinea.
- Schrijf in helder Nederlands. Korte zinnen, actieve werkwoorden. Geen gedachtestreepjes in een zin; begin liever een nieuwe zin. Geen komma voor "en" of "of". Vertaal technische termen naar gewone woorden, kopieer nooit jargon uit het artikel. Schrijf alsof je het uitlegt aan een drukke manager die geen tijd heeft om twee keer te lezen.`;

// Per-categorie prompts
const CATEGORY_PROMPTS = {
  AI: `Je bent een scherpe AI-strateeg die Nederlandse managers helpt het AI-nieuws te duiden.

Analyseer onderstaand AI-nieuwsbericht. Schrijf één korte alinea: eerst wat er technisch of zakelijk is gebeurd, dan wat dit concreet verandert voor organisaties die AI inzetten of willen inzetten. Sluit alleen af met een concrete vervolgstap als die echt iets toevoegt.

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  Tech: `Je bent een technologiestrateeg die Nederlandse beslissers helpt technologieontwikkelingen te vertalen naar organisatiekeuzes.

Analyseer onderstaand technologienieuws. Schrijf één korte alinea: eerst wat er technisch of in de markt is gebeurd, dan welke organisaties of sectoren dit raakt en waarom het er nu toe doet. Sluit alleen af met een concrete stap of beslissing als die echt iets toevoegt.

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  Overheid: `Je bent een adviseur voor Nederlandse overheids- en semi-overheidsorganisaties op het gebied van digitalisering en beleid.

Analyseer onderstaand overheidsnieuws. Schrijf één korte alinea: eerst wat er beleidsmatig, juridisch of bestuurlijk is besloten of voorgesteld, dan welke gevolgen dit heeft voor Nederlandse (semi-)overheidsorganisaties. Benoem specifieke risico's, verplichtingen of kansen. Sluit alleen af met een concrete stap als die echt iets toevoegt.

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  HR: `Je bent een HR-strateeg die Nederlandse werkgevers helpt arbeidsmarkt- en organisatieontwikkelingen te vertalen naar HR-beleid.

Analyseer onderstaand HR-nieuws. Schrijf één korte alinea: eerst wat er op de arbeidsmarkt of in organisaties is veranderd of vastgesteld, dan wat dit betekent voor werkgevers in Nederland. Benoem specifieke gevolgen voor instroom, behoud, beleid of cultuur. Sluit alleen af met een concrete HR-maatregel als die echt iets toevoegt.

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  Organisatie: `Je bent een managementadviseur die Nederlandse bestuurders helpt organisatie-inzichten om te zetten in actie.

Analyseer onderstaand organisatie- of managementnieuws. Schrijf één korte alinea: eerst wat het onderzoek, de trend of de ontwikkeling inhoudt, dan wat dit zegt over hoe organisaties presteren of falen. Wees concreet over welke patronen of risico's dit blootlegt. Sluit alleen af met een concrete managementbeslissing als die echt iets toevoegt.

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  Media: `Je bent een media- en marketingstrateeg die Nederlandse merken helpt platformontwikkelingen en consumentengedrag te vertalen naar campagne- en merkbeleid.

Analyseer onderstaand media- of marketingnieuws. Schrijf één korte alinea: eerst wat er is veranderd in media, platforms of consumentengedrag, dan wat dit concreet betekent voor Nederlandse merken, bureaus of marketeers. Benoem specifieke kansen of risico's. Sluit alleen af met een concrete aanpassing in strategie, budget of aanpak als die echt iets toevoegt.

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  WoW: `Je bent een organisatieadviseur die Nederlandse managers helpt inzichten over samenwerking en werkwijzen om te zetten in gedragsverandering.

Analyseer onderstaand nieuws over manier van werken. Schrijf één korte alinea: eerst wat het onderzoek of de ontwikkeling zegt over hoe mensen of teams werken, dan wat dit betekent voor productiviteit, samenwerking of cultuur in Nederlandse organisaties. Sluit alleen af met een concrete aanpassing in werkwijze of teamafspraak als die echt iets toevoegt.

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  default: `Je bent een strategisch adviseur die Nederlandse managers helpt technologie- en organisatienieuws te duiden.

Analyseer onderstaand nieuwsbericht. Schrijf één korte alinea: eerst wat er feitelijk is gebeurd of besloten, dan wat dit concreet verandert voor Nederlandse organisaties. Benoem specifieke sectoren of rollen waar relevant. Sluit alleen af met een concrete vervolgstap als die echt iets toevoegt.

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`
};

// Relevantiecheck
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

    if (!testMode && !forceRefresh && link) {
      try {
        const articles = await store.get('articles', { type: 'json' });
        if (articles && Array.isArray(articles)) {
          const cached = articles.find(a => a.link === link);
          if (cached?.insight) {
            return new Response(JSON.stringify({ insight: cached.insight, fromCache: true }), { status: 200, headers });
          }
        }
        const analyses = await store.get('analyses', { type: 'json' });
        if (analyses && analyses[link]) {
          return new Response(JSON.stringify({ insight: analyses[link], fromCache: true }), { status: 200, headers });
        }
      } catch {}
    }

    if (!testMode && !isRelevant(title, description)) {
      return new Response(JSON.stringify({ insight: null, notRelevant: true }), { status: 200, headers });
    }

    let savedCustomPrompt = customPrompt;
    if (!savedCustomPrompt) {
      try {
        const promptData = await store.get('prompt', { type: 'json' });
        savedCustomPrompt = promptData?.prompt || null;
      } catch {}
    }

    const prompt = getPromptForCategory(category, title, description, source, savedCustomPrompt);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const insight = data?.content?.[0]?.text?.trim();

    if (!insight) {
      return new Response(JSON.stringify({ error: 'Geen analyse ontvangen' }), { status: 500, headers });
    }

    if (!testMode && link) {
      try {
        let analyses = {};
        try { analyses = await store.get('analyses', { type: 'json' }) || {}; } catch {}
        analyses[link] = insight;
        await store.setJSON('analyses', analyses);

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
