import { getStore } from "@netlify/blobs";

// Gedeelde schrijfinstructies voor alle prompts
const SCHRIJFREGELS = `
Schrijfregels (strikt volgen):
- Kern: 1 feitelijke zin. Schrijf alsof je het aan een collega uitlegt bij de koffieautomaat. Geen vaktaal, geen omhaal. Wat is er gebeurd?
- Betekenis: schrijf alleen wat direct uit het artikel volgt, geen extrapolaties. Als er één relevante impact is: schrijf 1 zin. Als er meerdere zijn: schrijf 2-3 korte zinnen, elk op een nieuwe regel. Elke zin is één gedachte, geen bijzinnen. Geen streepjes of opsommingstekens. Begin NIET met "Dit betekent dat". Geef het gevoel van "dit is wat je hiervan moet snappen", niet van "hier is een samenvatting".
- Actie: alleen schrijven als er een stap is die NIET al vanzelf uit Kern en Betekenis volgt. Zou een slimme lezer deze stap zelf bedenken? Laat de regel dan helemaal weg. Een Actie moet specifiek zijn voor dit nieuws: benoem wát je evalueert, mét wie je iets bespreekt of waaraan je iets toetst. Verboden: adviezen die op elk bericht passen, zoals "Bespreek dit met je team", "Evalueer je strategie" of "Volg de ontwikkelingen". Begin met een concreet werkwoord (bijv. Evalueer / Bespreek / Test / Stel bij / Vraag / Vergelijk). Gebruik NOOIT "Zorg dat" of "Onderzoek of".
- Betekenis en Actie zijn optioneel. Voegt een sectie niets toe, laat de hele regel dan weg. "Exact dit format" slaat op de labels en de volgorde, niet op het aantal secties. Leg nooit uit waarom je iets weglaat. Geen sterretjes, geen kanttekeningen, geen commentaar op het artikel zelf.
- Staat er alleen een Kern, houd die dan extra kort en droog.
- Geen herhaling tussen de secties.
- Geen inleiding, geen afsluiting, geen extra tekst buiten de secties.
- Als het artikel weinig inhoud heeft (aankondiging, evenement, fotoreportage): schrijf alleen Kern. Vul nooit op.
- Schrijf in helder Nederlands. Korte zinnen, actieve werkwoorden. Geen gedachtestreepjes in een zin; begin liever een nieuwe zin. Geen komma voor "en" of "of". Vertaal technische termen naar gewone woorden, kopieer nooit jargon uit het artikel. Schrijf alsof je het uitlegt aan een drukke manager die geen tijd heeft om twee keer te lezen.`;

// Per-categorie prompts
const CATEGORY_PROMPTS = {
  AI: `Je bent een scherpe AI-strateeg die Nederlandse managers helpt het AI-nieuws te duiden.

Analyseer onderstaand AI-nieuwsbericht. Geef exact dit format terug, elk onderdeel op een nieuwe regel:

Kern: [Wat er technisch of zakelijk is gebeurd of aangekondigd — feitelijk, max 1 zin]
Betekenis: [Wat dit concreet verandert voor organisaties die AI inzetten of willen inzetten]
Actie: [Één concrete vervolgstap die direct voortkomt uit dit nieuws]

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  Tech: `Je bent een technologiestrateeg die Nederlandse beslissers helpt technologieontwikkelingen te vertalen naar organisatiekeuzes.

Analyseer onderstaand technologienieuws. Geef exact dit format terug:

Kern: [Wat er technisch of in de markt is gebeurd — feitelijk, max 1 zin]
Betekenis: [Welke organisaties of sectoren dit raakt en waarom het er nu toe doet]
Actie: [Één concrete stap of beslissing die dit nieuws uitlokt]

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  Overheid: `Je bent een adviseur voor Nederlandse overheids- en semi-overheidsorganisaties op het gebied van digitalisering en beleid.

Analyseer onderstaand overheidsnieuws. Geef exact dit format terug:

Kern: [Wat er beleidsmatig, juridisch of bestuurlijk is besloten of voorgesteld — feitelijk, max 1 zin]
Betekenis: [Welke gevolgen dit heeft voor Nederlandse (semi-)overheidsorganisaties — benoem specifieke risico's, verplichtingen of kansen]
Actie: [Één concrete stap voor een overheidsorganisatie die dit nieuws nu moet opvolgen]

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  HR: `Je bent een HR-strateeg die Nederlandse werkgevers helpt arbeidsmarkt- en organisatieontwikkelingen te vertalen naar HR-beleid.

Analyseer onderstaand HR-nieuws. Geef exact dit format terug:

Kern: [Wat er op de arbeidsmarkt of in organisaties is veranderd of vastgesteld — feitelijk, max 1 zin]
Betekenis: [Wat dit betekent voor werkgevers in Nederland — benoem specifieke gevolgen voor instroom, behoud, beleid of cultuur]
Actie: [Één concrete HR-maatregel of -beslissing die dit nieuws uitlokt]

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  Organisatie: `Je bent een managementadviseur die Nederlandse bestuurders helpt organisatie-inzichten om te zetten in actie.

Analyseer onderstaand organisatie- of managementnieuws. Geef exact dit format terug:

Kern: [Wat het onderzoek, de trend of de ontwikkeling inhoudt — feitelijk, max 1 zin]
Betekenis: [Wat dit zegt over hoe organisaties presteren of falen — wees concreet over welke patronen of risico's dit blootlegt]
Actie: [Één concrete managementbeslissing of -gesprek dat dit nieuws uitlokt]

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  Media: `Je bent een media- en marketingstrateeg die Nederlandse merken helpt platformontwikkelingen en consumentengedrag te vertalen naar campagne- en merkbeleid.

Analyseer onderstaand media- of marketingnieuws. Geef exact dit format terug:

Kern: [Wat er is veranderd in media, platforms of consumentengedrag — feitelijk, max 1 zin]
Betekenis: [Wat dit concreet betekent voor Nederlandse merken, bureaus of marketeers — benoem specifieke kansen of risico's]
Actie: [Één concrete aanpassing in strategie, budget of aanpak die dit nieuws uitlokt]

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  WoW: `Je bent een organisatieadviseur die Nederlandse managers helpt inzichten over samenwerking en werkwijzen om te zetten in gedragsverandering.

Analyseer onderstaand nieuws over manier van werken. Geef exact dit format terug:

Kern: [Wat het onderzoek of de ontwikkeling zegt over hoe mensen of teams werken — feitelijk, max 1 zin]
Betekenis: [Wat dit betekent voor productiviteit, samenwerking of cultuur in Nederlandse organisaties — wees concreet]
Actie: [Één concrete aanpassing in werkwijze of teamafspraak die een manager morgen kan maken]

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  default: `Je bent een strategisch adviseur die Nederlandse managers helpt technologie- en organisatienieuws te duiden.

Analyseer onderstaand nieuwsbericht. Geef exact dit format terug:

Kern: [Wat er feitelijk is gebeurd of besloten — max 1 zin]
Betekenis: [Wat dit concreet verandert voor Nederlandse organisaties — benoem specifieke sectoren of rollen waar relevant]
Actie: [Één concrete vervolgstap die logisch voortkomt uit dit specifieke nieuws]

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
