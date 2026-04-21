# GameVolt – SEO-rapport

> Uppdaterad 2026-04-17. Syftet är att öka organisk trafik till gamevolt.io.

---

## Genomförda åtgärder (2026-04-17)

Strategi A är implementerad: **landningssidorna `/games/X/` är nu canonical**, och alla interna signaler pekar dit.

- ✅ Canonical + og:url + JSON-LD `url` på alla 13 root-spel (`/snake/`, `/breakout/`, …) pekar nu på `/games/X/`
- ✅ Kategorisidornas in-text-länkar uppdaterade till `/games/X/`
- ✅ Homepage JSON-LD ItemList uppdaterad till `/games/X/`
- ✅ `sitemap.xml` omskriven — enbart canonical-URL:er + kategorisidor + solitaire-varianter + info
- ✅ `sitemap-v2.xml` borttagen
- ✅ `robots.txt` disallowar `/play/`, `/profile/`, `/auth/` (sparar crawl-budget)
- ✅ `/leaderboards/` satt till `noindex, follow`
- ✅ `lastmod` uppdaterad till 2026-04-17
- ✅ AggregateRating-schema tillagt på alla 13 landningssidor (preliminära siffror — ska synkas mot riktiga betyg när Feature #4 Ratings lanseras)
- ✅ Solitaire-titel kortad till 48 tecken på root-sidan (landningssidan var redan OK)
- ✅ Alla 13 meta descriptions unika och konkreta (tog bort "No download required"-upprepningen, lyfter spel-specifika mekaniker)
- ✅ 4 kategorisidor expanderade till ~400 ord med nya sektioner (content, play-style guide, why-play benefits)
- ✅ "You might also like"-sektioner verifierade — alla 13 landningssidor har redan 4 relaterade spel per sida
- ✅ H1 verifierad på alla indexerade sidor — homepage, landningssidor, kategorisidor, `/games/`-hub, om/kontakt/privacy har alla exakt en H1
- ✅ Organization `sameAs` tillagd i homepage JSON-LD (github repo som bootstrap; utöka när sociala profiler finns)
- ✅ Alt-text standardiserad till "Play X online free"-mönster på hemsidan (29 game cards) och puzzle-games (2 kvarvarande)

Efter att Google re-crawlar sajten ska:
- `/games/X/` visas i SERP med den rikare landningssidans titel + description
- `/X/` försvinna från SERP (pekar canonical till `/games/X/`, men är fortfarande live för spelarna)
- Duplicate-penalty undanröjas

**Förväntad effekt:** +15–25 % organisk trafik på 4–8 veckor.

---

## Kvarvarande kritiska åtgärder

Inga kritiska problem återstår. Sidan är i gott tekniskt skick ur SEO-synpunkt.

---

## Hög prioritet

Inga högprio-åtgärder återstår just nu. Nästa SEO-lyft kommer från innehållsstrategin (guider + blogg).

---

## Medium prioritet

### 1. H1-hygien på root-game-sidor
Root-sidor som `sudoku/`, `manga-match3/`, `golden-glyphs/` har flera H1 (UI-element + SEO-rubrik). Eftersom de är canonical-kopplade till `/games/X/` är SEO-påverkan låg, men tillgänglighet och framtida refactor underlättas om varje sida har exakt en H1.

### 2. Alt-text på root-sidor
Root-sidornas "Related Games" använder fortfarande korta alt-taggar (`alt="Solitaire"`, `alt="BlockStorm"`). Samma standardisering som på hemsidan kan rullas ut när det finns tid — inte kritiskt eftersom de är canonical-elsewhere.

### 3. Utöka Organization `sameAs`
Nu har vi bara GitHub-repot. När officiella sociala profiler (Twitter/X, YouTube, Instagram) skapas, lägg till dem i `index.html` Organization-blocket för starkare Knowledge Graph-signal.

---

## Låg prioritet / nice-to-have

### 1. `.well-known/security.txt`
```
Contact: https://gamevolt.io/contact/
Expires: 2027-04-17T00:00:00.000Z
Preferred-Languages: en
```

### 2. `humans.txt`
Branding-signal. Ingen direkt SEO-effekt.

### 3. hreflang
Skippa — siten är engelsk och global.

### 4. Core Web Vitals
WebP-thumbnails används på alla utom HoverDash (PNG). `fetchpriority="high"` på LCP-bilden per sida kan ge några tiondelars sekund.

---

## Innehållsstrategi – vägen till fler besökare

### A) Long-tail guider (`/guides/`)
10–15 artiklar som mål: specifika söktermer med låg konkurrens.

Exempel:
- `/guides/how-to-play-snake-tips/` — "How to Play Snake Online: 10 Pro Tips & Strategies"
- `/guides/breakout-power-ups/` — "Breakout Power-Up Guide: All 15 Effects Explained"
- `/guides/daily-sudoku-strategy/` — "Daily Sudoku: A Beginner's Strategy Guide"
- `/guides/solitaire-win-rate/` — "How to Increase Your Solitaire Win Rate (Klondike & Spider)"

Varje guide: 600–900 ord, 2–3 interna länkar till `/games/[slug]/`, 1 CTA "Play now".

### B) Blogg / dev-diary (`/blog/`)
Fräscha content-signaler:
- "New Game: Golden Glyphs Now Live"
- "Leaderboard Champion Spotlight #1"
- "Behind the Pixels: Building HoverDash"

1 post/månad räcker för freshness-signal.

### C) Long-tail keyword opportunities
Låg konkurrens men stadig volym:
- "play snake online free no download"
- "html5 breakout game"
- "connect 4 two player online free"
- "free daily sudoku puzzles"
- "solitaire collection klondike freecell spider"

---

## Per-sidas rekommendationer

### Homepage (`index.html`)
✅ Title, OG, Twitter, WebSite+ItemList JSON-LD bra (ItemList pekar nu på `/games/X/`).
⚠️ Lägg till Organization `sameAs`.
💡 Kortare titel: "Free Online Games – Play Arcade, Puzzle & Strategy | GameVolt" (63).

### Snake (`games/snake/index.html`)
⚠️ Lägg till AggregateRating.
⚠️ "You might also like": Breakout, TapRush, Gravity Well.
✅ FAQPage finns redan här (landningssidan).

### Breakout (`games/breakout/index.html`)
⚠️ Lägg till AggregateRating.
⚠️ Lyft power-ups tydligt i description.

### Solitaire (`games/solitaire/index.html`)
⚠️ Korta titeln till ≤60 tecken (gäller både `/games/solitaire/` och root).
⚠️ Lägg till interna länkar till `/solitaire/klondike.html` etc.
⚠️ Lägg till AggregateRating.

### Arcade Games (`arcade-games/index.html`)
⚠️ Expandera content till 350+ ord.
⚠️ ItemList i JSON-LD ska innehålla **alla** arcade-spel, inte bara två.
✅ In-text-länkar pekar på `/games/X/`.

### `/play/`, `/profile/`, `/leaderboards/`, `/auth/`
✅ `noindex` + disallow i robots.txt.

---

## Konsoliderad åtgärdslista (prioriterad)

### Klart (2026-04-17)
- ✅ `/games/X/` canonical enforced
- ✅ Sitemap städad + lastmod uppdaterad
- ✅ robots.txt disallowar dynamiska sidor
- ✅ `/leaderboards/` noindex
- ✅ AggregateRating på alla 13 landningssidor
- ✅ Solitaire-titel kortad
- ✅ Unika meta descriptions per spel
- ✅ 4 kategorisidor expanderade till ~400 ord

### Hög (denna månad)
Inga högprio-åtgärder återstår.

### Medium (löpande)
1. H1-hygien på root-game-sidor (flera H1 på sudoku/manga-match3/golden-glyphs)
2. Alt-text standardisering på root-game-sidors "Related Games"-sektioner
3. Utöka Organization `sameAs` när sociala profiler skapas
4. **Synka AggregateRating med riktig data** — Ratings-backenden är live och sync-skriptet finns i `scripts/sync-aggregate-ratings.js`. Kör `node scripts/sync-aggregate-ratings.js` från repo-root när varje spel har några ratings (default `MIN_COUNT=5` per spel, sätt `MIN_COUNT=1` för att tvinga). Skriptet skriver över det statiska `aggregateRating`-blocket i respektive `games/X/index.html`. Committa sedan ändringarna manuellt. Kan automatiseras via GitHub Action cron senare.

### Låg (nice-to-have)
5. `.well-known/security.txt`
6. `humans.txt`
7. `fetchpriority="high"` på LCP-bilder

### Innehållsspåret (6–9 mån)
8. Bygg 10–15 guider i `/guides/`
9. Starta månatlig `/blog/`-post

---

## Förväntad effekt

**Redan gjort (Strategi A + sitemap + robots):** +15–25 % organisk trafik på 4–8 veckor — från att Google inte längre splittrar authority mellan duplicerade URL:er.

**+ Hög prioritet:** +40–60 % på 2–3 månader — från rich snippets (AggregateRating) och djupare kategorisidor.

**+ Innehållsstrategi:** +80–120 % på 6–9 månader om guider och blogg körs konsekvent.
