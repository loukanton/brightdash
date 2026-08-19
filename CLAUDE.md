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
  tel.mjs            POST /api/tel — telt weergaven en doorklikken per artikel
  clear-cache.js     POST /api/clear-cache
netlify.toml         build- en functieconfig
```

## Hoe het werkt

**Opslag** is Netlify Blobs, store `brightdash`, met vijf sleutels:

| sleutel | inhoud |
| --- | --- |
| `articles` | array van artikelen, inclusief `insight` als die er al is |
| `meta` | `{ updatedAt, count }` |
| `analyses` | map van `link` → analysetekst, overleeft een feed-refresh en het legen van de cache |
| `prompt` | eigen prompt uit de admin, overschrijft de categorieprompts |
| `relevance` | map van `link` → true / 'twijfel' / false uit de AI-relevantiecheck; twijfel is één keer afgekeurd en krijgt één herkansing, false is definitief |
| `archief-JJJJ-MM-DD` | per dag een map van `link` → titel, Nederlandse kop, bron, categorie, datum, taal en afbeelding, voor elk artikel dat een analyse heeft. Alleen toevoegen, nooit opschonen |
| `tellingen-JJJJ-MM-DD` | per dag een map van `link` → `{ weergaven, klikken }` |

**Flow:** de cron schrijft elke 30 minuten verse artikelen weg en plakt bestaande analyses er weer
aan vast. De frontend haalt `/api/articles` op en vraagt per artikel `/api/analyse`. Die functie
kijkt eerst in de cache en belt pas Claude als er nog niets ligt.

**Archief.** De artikelenlijst rouleert, dus van een analyse van vorige week zijn titel, bron en
datum straks weg. Aan het eind van elke refresh legt `bewaarArchief()` in `feeds.mjs` daarom de
gegevens vast van elk artikel dat een analyse heeft, in een blob per dag. De dag komt van de
publicatiedatum in Nederlandse tijd, niet UTC. Bestaande regels worden nooit overschreven; alleen
de Nederlandse kop wordt bijgewerkt als een analyse opnieuw is gegenereerd.

**Tellingen.** `/api/tel` houdt per dag bij hoe vaak een artikel is bekeken en hoe vaak er is
doorgeklikt naar de bron. De frontend telt een weergave pas als het artikel anderhalve seconde voor
minstens de helft in beeld staat, hooguit één keer per bezoek, en stuurt alles gebundeld met
`sendBeacon`. Geen cookies, geen bezoekersgegevens, alleen tellers per link. De telling is bij
benadering: gelijktijdige schrijfacties kunnen elkaar overschrijven, en het endpoint is publiek dus
de cijfers zijn te beïnvloeden. Voor een volgorde is dat goed genoeg; gebruik ze nergens anders voor.

**Relevantiefilter** in twee lagen, allebei in `feeds.mjs`. Eerst de regexpatronen
(koopgidsen, reviews, entertainment, The Download-digests). Daarna beoordeelt Haiku
(`claude-haiku-4-5-20251001`) per refresh de onbeoordeelde titels in één batchcall; goedkeuringen
staan in de blob-sleutel `relevance`, afkeuringen worden elke refresh opnieuw beoordeeld. Twee
vangrails: keurt een batch meer dan een kwart af, dan wordt die batch genegeerd; en de check valt
open (geen API-sleutel of een fout betekent alles laten staan).

**Prompts** staan in `analyse.mjs`. Per categorie één (AI, Tech, Overheid, HR, Organisatie, Media,
WoW) plus een default, allemaal met dezelfde `SCHRIJFREGELS` eronder. Die schrijfregels zijn het
hart van het product — de toon is met zorg afgesteld. Pas ze niet aan zonder dat Louk erom vraagt.

De analyse begint met een regel `Kop:` met een Nederlandse kop; de frontend toont die als
titel met de originele titel er klein onder, en verbergt de beschrijving zodra de analyse er
staat. Daarna maximaal drie korte alinea's zonder labels: eerst wat er is gebeurd, dan
wat het betekent, en alleen als die echt iets toevoegt een afsluitende actiezin die met een
werkwoord begint. De frontend geeft elke alinea een gekleurd streepje (blauw, groen, amber); een
analyse van één alinea krijgt goud, het teken voor dun nieuws. Oude analyses in de cache hebben
nog Kern/Betekenis/Actie-labels; de frontend stript ze in `analyseTekst()` en vouwt elke sectie
tot één alinea.

**Herbeoordeling** werkt met de drie standen in `relevance`. Eén afkeuring verbergt het artikel en
geeft één herkansing bij de volgende refresh; een tweede afkeuring is definitief. De noodrem
(batch met meer dan een kwart afkeuringen wordt genegeerd) slaat daardoor niet meer aan op de
kleine herkansingsbatch.

**Model:** `claude-sonnet-4-6`, hardcoded in `analyse.mjs`, max 600 tokens.

**Secrets** staan in de Netlify-omgevingsvariabelen, nooit in de repo — die is publiek:

- `ANTHROPIC_API_KEY` — voor de analyses
- `ADMIN_PASSWORD` — het wachtwoord van de admin

**Toegang tot de admin.** `admin.html` vraagt om het wachtwoord, bewaart het in sessionStorage en
stuurt het als `x-admin-key` mee. De server controleert dat in `netlify/lib/auth.mjs` tegen
`ADMIN_PASSWORD`, met een hashvergelijking van vaste lengte. Staat de variabele niet ingesteld, dan
gaan de endpoints op slot (503) in plaats van open.

Achter het wachtwoord: `/api/admin-check`, `/api/admin-prompt`, `/api/clear-cache` en
`/api/refresh-feeds`. Publiek blijven `/api/articles`, `/api/analyse` en `/api/proxy` — die heeft de
site zelf nodig.

`/api/refresh` is het uitzonderingsgeval. Dat is de self-heal die `articles.js` aanroept als de
lijst leeg is, en die mag zonder wachtwoord — maar alleen zolang de lijst ook echt leeg is. Staat er
al iets, dan gelden de adminregels weer.

**Frontend-state** zit in localStorage onder `bd_theme`, `bd_saved`, `bd_filters`, `bd_onboarded`,
`bd_installtip`,
`bd_visits`, `bd_lastvisit` en `bd_dagstart`. Geen accounts, geen server-side gebruikersdata.

## Hosting en deploy

Hosting en DNS lopen allebei via Netlify (nsone-nameservers). Een push naar `main` op
`github.com/loukanton/brightdash` triggert automatisch een deploy. Er is geen buildstap: `public/`
gaat er ongewijzigd op.

Bezoekcijfers via Cloudflare Web Analytics — alleen het beacon-script in `index.html`, verder zit
Cloudflare nergens in de keten. Bewust niet op `admin.html`.

Lokaal draaien kan met `netlify dev`, maar de CLI staat niet in `package.json`; die moet je apart
geïnstalleerd hebben.

Let op: Netlify zet omgevingsvariabelen bij de deploy in de functies. Voeg je er later een toe, dan
ziet de code hem pas na een nieuwe deploy. Een lege commit is genoeg.

## Conventies

- Geen build, geen framework, geen bundler. HTML, CSS en vanilla JS, met de hand.
- Kleuren via de CSS-variabelen bovenin `index.html`. Licht en donker allebei bijwerken.
- Alle gebruikerstekst is Nederlands. Code en commentaar ook.
- Functies zijn Netlify v2: `export default async (req, context)` met een `export const config`
  eronder voor het pad of het schema.

## Bekende gaten

- **`/api/analyse` is publiek en kost geld.** De site moet erbij kunnen, dus er zit geen slot op.
  Wie het endpoint kent kan analyses laten genereren op jouw Anthropic-rekening. Er is geen
  rate limiting.
- **De admin-pagina zelf is opvraagbaar.** Het slot zit op de endpoints, niet op het HTML-bestand;
  `/admin.html` levert nog steeds de lege schil met het inlogscherm. De data zit veilig, de
  aanwezigheid van de pagina niet.
- **Een eigen prompt zet alle categorieprompts opzij.** Sla je in de admin iets op, dan gebruikt
  `analyse.mjs` die ene prompt voor elke categorie. Leeg opslaan wist hem en zet de
  categorieprompts terug.
- **Refresh is synchroon.** 25 feeds parallel, elk met 5 seconden timeout, binnen de
  functielimiet van Netlify. Komen er veel feeds bij, dan kan dat gaan knellen.
- **Gelijktijdige schrijfacties kunnen elkaar overschrijven.** De `analyses`-map wordt per
  aanroep in zijn geheel gelezen en teruggeschreven, zonder slot. Schrijven twee
  analyse-aanroepen tegelijk, dan wint de laatste en verliest de andere zijn update. Zeldzaam
  en zelfherstellend (de frontend vraagt een ontbrekende analyse gewoon opnieuw aan), maar bij
  batchwerk zoals hergeneratie kan het rondes kosten. Let op bij verificatie: `/api/articles`
  wordt 5 minuten gecachet op het Netlify-edge; controleer met een cache-buster
  (`?t=<timestamp>`), anders kijk je naar oude data.
- **Tweakers en Techzine blokkeren Netlify.** Tweakers weigert het IP-adres van het
  datacenter, Techzine heeft botdetectie. Een andere User-Agent helpt niet (getest). De feeds
  staan nog in de lijst en falen stil. Nette oplossing: de redactie mailen om toegang vragen.

## Werkafspraken

- Committen en pushen alleen als Louk het vraagt. Push gaat live, dus zeg wat er verandert
  voordat je het doet.
- Schrijf in gewone taal, ook in commits en uitleg. Geen jargon, geen omhaal.
- Kom je iets tegen dat kapot is buiten de opdracht om: noem het, repareer het niet ongevraagd.
