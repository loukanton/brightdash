# BrightDash

AI-nieuwsdashboard voor Nederlandse organisaties. Haalt RSS-feeds op uit ~25 NL- en EN-bronnen,
laat Claude er een korte duiding bij schrijven (Kern / Betekenis / Actie) en toont dat op
[brightdash.nl](https://brightdash.nl).

Product van Bright House Consulting (Vught). Louk Haarhuis werkt eraan, solo.

## Structuur

De repo staat in de submap `brightdash/` binnen de projectmap `BrightDash/`. Alles wat telt zit in
die submap — de buitenste map bevat geen code.

```
public/              statische site, met de hand geschreven HTML
  index.html         de hele frontend: markup, CSS en JS in één bestand (~1550 regels)
  admin.html         beheerpagina: prompts testen, cache legen, feeds verversen
  privacy.html       privacybeleid — bijwerken als er een dienst bijkomt
  disclaimer.html
netlify/lib/
  feeds.mjs          de feedlijst en alle ophaal-, filter- en opslaglogica
netlify/functions/   backend
  refresh-feeds.mjs  cron (*/30), roept refreshFeeds() aan
  refresh.mjs        POST /api/refresh en /api/refresh-feeds — dezelfde refresh, handmatig
  articles.js        GET /api/articles — serveert de opgeslagen artikelen
  analyse.mjs        POST /api/analyse — vraagt Claude om de duiding, cachet het resultaat
  admin-prompt.mjs   GET/POST /api/admin-prompt — leest en schrijft de eigen prompt
  proxy.js           GET /api/proxy?url= — CORS-proxy voor losse feeds
  clear-cache.js     POST /api/clear-cache
netlify.toml         build- en functieconfig
```

## Hoe het werkt

**Opslag** is Netlify Blobs, store `brightdash`, met vier sleutels:

| sleutel | inhoud |
| --- | --- |
| `articles` | array van artikelen, inclusief `insight` als die er al is |
| `meta` | `{ updatedAt, count }` |
| `analyses` | map van `link` → analysetekst, overleeft een feed-refresh |
| `prompt` | eigen prompt uit de admin, overschrijft de categorieprompts |

**Flow:** de cron schrijft elke 30 minuten verse artikelen weg en plakt bestaande analyses er weer
aan vast. De frontend haalt `/api/articles` op en vraagt per artikel `/api/analyse`. Die functie
kijkt eerst in de cache en belt pas Claude als er nog niets ligt.

**Prompts** staan in `analyse.mjs`. Per categorie één (AI, Tech, Overheid, HR, Organisatie, Media,
WoW) plus een default, allemaal met dezelfde `SCHRIJFREGELS` eronder. Die schrijfregels zijn het
hart van het product — de toon is met zorg afgesteld. Pas ze niet aan zonder dat Louk erom vraagt.

**Model:** `claude-sonnet-4-6`, hardcoded in `analyse.mjs`, max 600 tokens.

**Secret:** `ANTHROPIC_API_KEY`, staat in de Netlify-omgevingsvariabelen. Niet in de repo.

**Frontend-state** zit in localStorage onder `bd_theme`, `bd_saved`, `bd_filters`, `bd_onboarded`,
`bd_visits` en `bd_lastvisit`. Geen accounts, geen server-side gebruikersdata.

## Hosting en deploy

Hosting en DNS lopen allebei via Netlify (nsone-nameservers). Een push naar `main` op
`github.com/loukanton/brightdash` triggert automatisch een deploy. Er is geen buildstap: `public/`
gaat er ongewijzigd op.

Bezoekcijfers via Cloudflare Web Analytics — alleen het beacon-script in `index.html`, verder zit
Cloudflare nergens in de keten. Bewust niet op `admin.html`.

Lokaal draaien kan met `netlify dev`, maar de CLI staat niet in `package.json`; die moet je apart
geïnstalleerd hebben.

## Conventies

- Geen build, geen framework, geen bundler. HTML, CSS en vanilla JS, met de hand.
- Kleuren via de CSS-variabelen bovenin `index.html`. Licht en donker allebei bijwerken.
- Alle gebruikerstekst is Nederlands. Code en commentaar ook.
- Functies zijn Netlify v2: `export default async (req, context)` met een `export const config`
  eronder voor het pad of het schema.

## Bekende gaten

- **De admin is niet beveiligd.** `admin.html` staat gewoon publiek op `/admin.html` en de
  endpoints erachter (`/api/clear-cache`, `/api/admin-prompt`, `/api/refresh-feeds`) vragen niet om
  een sleutel. Iedereen die het pad kent kan de cache legen of de prompt herschrijven die alle
  analyses stuurt. Nog niet opgelost.
- **Een eigen prompt zet alle categorieprompts opzij.** Sla je in de admin iets op, dan gebruikt
  `analyse.mjs` die ene prompt voor elke categorie. Leeg opslaan wist hem en zet de
  categorieprompts terug.
- **Refresh is synchroon.** 25 feeds parallel, elk met 5 seconden timeout, binnen de
  functielimiet van Netlify. Komen er veel feeds bij, dan kan dat gaan knellen.

## Werkafspraken

- Committen en pushen alleen als Louk het vraagt. Push gaat live, dus zeg wat er verandert
  voordat je het doet.
- Schrijf in gewone taal, ook in commits en uitleg. Geen jargon, geen omhaal.
- Kom je iets tegen dat kapot is buiten de opdracht om: noem het, repareer het niet ongevraagd.
