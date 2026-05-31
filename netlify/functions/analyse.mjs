import { getStore } from "@netlify/blobs";

// Gedeelde schrijfinstructies voor alle prompts
const SCHRIJFREGELS = `
Schrijfregels (strikt volgen):
- Kern: 1 feitelijke zin. Wat is er gebeurd of aangekondigd? Geen interpretatie.
- Betekenis: 1-2 zinnen. Wat is de strategische impact voor Nederlandse organisaties? Wees specifiek — noem sectoren, rollen of scenario's waar dit relevant is. Begin NIET met "Dit betekent dat".
- Actie: 1 korte actiezin. Begin met een concreet werkwoord dat past bij dit artikel (bijv. Evalueer / Bespreek / Test / Stel bij / Anticipeer op / Vraag je leverancier / Zet op de agenda / Vergelijk). Gebruik NOOIT "Zorg dat" of "Onderzoek of". De actie moet logisch volgen uit dit specifieke artikel — niet generiek zijn.
- Geen herhaling tussen de drie secties.
- Geen inleiding, geen afsluiting, geen extra tekst buiten de drie secties.
- Als het artikel weinig inhoud heeft: schrijf korter, vul niet op met algemeenheden.
- Schrijf in helder Nederlands. Korte zinnen, actieve werkwoorden. Geen managementjargon, geen wollige formuleringen ("in het kader van", "ten aanzien van", "met het oog op"). Wel inhoudelijk en concreet — de lezer is een beslisser, geen leek.`;

// Per-categorie prompts
const CATEGORY_PROMPTS = {
  AI: `Je bent een scherpe AI-strateeg die Nederlandse managers helpt het AI-nieuws te duiden.

Analyseer onderstaand AI-nieuwsbericht. Geef exact dit format terug, elk onderdeel op een nieuwe regel:

Kern: [Wat er technisch of zakelijk is gebeurd of aangekondigd — feitelijk, max 1 zin]
Betekenis: [Wat dit concreet verandert voor organisaties die AI inzetten of willen inzetten — benoem specifieke implicaties voor gebruik, kosten, risico of concurrentiepositie]
Actie: [Één concrete vervolgstap die direct voortkomt uit dit nieuws]

Titel: {{title}}
Bron: {{source}}
{{description}}
${SCHRIJFREGELS}`,

  Tech: `Je bent een technologiestrateeg die Nederlandse beslissers helpt technologieontwikkelingen te vertalen naar organisatiekeuzes.

Analyseer onderstaand technologienieuws. Geef exact dit format terug:

Kern: [Wat er technisch of in de markt is gebeurd — feitelijk, max 1 zin]
Betekenis: [Welke organisaties of sectoren dit raakt en waarom het er nu toe doet — wees specifiek over de impact]
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
        max_tokens: 600,
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
