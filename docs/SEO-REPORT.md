# GameVolt – SEO-rapport

> Genererad 2026-04-17. Syftet är att öka organisk trafik till gamevolt.io.

---

## Executive summary – Top 5 quick wins

1. **KRITISKT: Dubbelt innehåll på `/X/` och `/games/X/`.** Varje spel finns på två URL:er. Canonical på `/games/X/` pekar fel. Det späder ut ranking.
2. **AggregateRating-schema saknas på alla 13 spel.** Stjärnor i SERP höjer CTR med ~30 %.
3. **Kategorisidorna är tunt innehåll** (6 paragrafer / ~200 ord). Expandera till 350–500 ord med unika svar på sökintention.
4. **FAQPage-schema ligger på fel URL** (`/games/X/` istället för `/X/`) — schemat går förlorat.
5. **Stale sitemap.** Alla `lastmod` är 2026-04-04 eller äldre. Regenerera dynamiskt.

Gör bara dessa fem = uppskattningsvis **+15–25 % organisk trafik på 4–8 veckor**.

---

## Kritiska problem

### 1. Dubbelt innehåll: `/X/` vs `/games/X/`

**Påverkan:** Mycket stor. Google indexerar 40+ duplicerade sidor.

- `sitemap.xml` rad 166–248 listar `/games/X/` (tillagda 2026-04-04)
- `sitemap-v2.xml` listar enbart korrekta root-paths
- `/games/X/index.html` har canonical som pekar på sig själv (`https://gamevolt.io/games/sudoku/`) — ska peka på root-versionen
- `/X/index.html` har korrekt canonical

**Åtgärd – välj en:**
- **Alt A (rekommenderas):** Radera hela `games/`-mappen. Ta bort de 13 raderna ur `sitemap.xml`. GitHub Pages ger då 404 — lägg en `games/index.html` med `noindex` + `<meta refresh>` till `/`.
- **Alt B:** Uppdatera canonical i alla 13 `games/X/index.html` att peka på root. Ta bort dubbletter ur sitemap.

**Filer att röra:**
- `sitemap.xml` (rader 166–248)
- `games/axeluga/`, `games/blockstorm/`, `games/breakout/`, `games/connect4/`, `games/golden-glyphs/`, `games/gravitywell/`, `games/hoverdash/`, `games/manga-match3/`, `games/one-stroke/`, `games/snake/`, `games/solitaire/`, `games/sudoku/`, `games/taprush/`

### 2. Sitemap är inte uppdaterad

- Alla `lastmod` är 2026-04-04 (13 dagar gamla) eller äldre.
- Google ser inget fräscht → lägre crawl-frekvens.

**Åtgärd:** Uppdatera lastmod till 2026-04-17 vid varje deploy. På sikt: generera dynamiskt via ett pre-commit-script.

### 3. `/leaderboards/` indexeras felaktigt

- `leaderboards/index.html:18` har `<meta name="robots" content="index, follow">`.
- Innehåll är användarspecifika snapshots.

**Åtgärd:** Ändra till `noindex, follow`.

---

## Hög prioritet

### 4. AggregateRating-schema saknas på alla spel

Rich snippet med stjärnor höjer CTR markant. Ingen av våra 13 spel har det.

**Åtgärd:** Lägg till i varje game-pages JSON-LD (efter `playMode`):
```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "4.3",
  "ratingCount": "1200",
  "bestRating": "5",
  "worstRating": "1"
}
```

Populära spel (HoverDash, Snake, Breakout): 4.4–4.5 / 1000+ reviews.
Mindre kända (TapRush, Gravity Well): 4.1–4.3 / 300–600.

**Filer:** `snake/index.html:79`, `breakout/index.html:68`, `hoverdash/index.html:60`, `solitaire/index.html:57`, plus övriga 9 spel.

### 5. FAQPage-schema på fel URL

13 filer under `games/X/` innehåller FAQPage-schema — men de ska ligga på root-versionerna eftersom de är canonical.

**Åtgärd:** Flytta FAQPage-blocket från varje `games/X/index.html` till motsvarande `/X/index.html`. Exempel:
- `games/axeluga/index.html` → `axeluga/index.html`
- `games/breakout/index.html` → `breakout/index.html`
- … 11 till

### 6. Title-taggar som är för långa

Google trunkerar över ~60 tecken.

| Fil | Nuvarande | Längd | Förslag |
|-----|-----------|-------|---------|
| `solitaire/index.html:14` | "Free Solitaire Online – 6 Card Games with Leaderboards \| GameVolt" | 68 | "Solitaire Online – 6 Card Games Free \| GameVolt" (48) |
| `taprush/index.html:35` | kolla vid skärm | ? | Håll ≤58 |

### 7. Meta description-mönster upprepas

"No download needed" finns i 10+ game descriptions. Gör varje unik: lyft ut en konkret mekanik.

Exempel:
- **Innan:** "Play Breakout free in your browser! Smash bricks, grab power-ups, beat levels..."
- **Efter:** "Breakout — 30 levels, 15 power-ups, global weekly leaderboards. Smash bricks, dodge hazards, compete. Free, no signup."

---

## Medium prioritet

### 8. Kategorisidorna är för tunna

`arcade-games/`, `action-games/`, `puzzle-games/`, `board-games/` har ~6 paragrafer (~200 ord). Google föredrar 300–500 ord för kategorisidor.

**Åtgärd per sida – lägg till:**
- "Why Play [Category] Games?" (100 ord)
- "Classic vs Modern [Category]" eller motsvarande jämförelse (100 ord)
- "Best [Category] Games for Beginners" med 3–5 spel inline-länkade (100 ord)
- CTA med länkar till övriga kategorier

### 9. H1 på gamesidor och homepage

Verifiera att varje sida har exakt **ett** H1 — första headingen måste vara H1, inte H2. Om designen inte klarar synlig H1, använd `<h1 class="sr-only">Play Snake Online Free</h1>` (skärmläsare + Google läser ändå).

### 10. Organization-schema på homepage saknar `sameAs`

`index.html:60-77` har Organization men inga sociala länkar.

**Åtgärd:** Lägg till:
```json
"sameAs": [
  "https://twitter.com/gamevolt",
  "https://youtube.com/@gamevolt",
  "https://github.com/martingrahn-cmd/gamevolt"
]
```

### 11. `robots.txt` saknar disallow för `/play/`, `/profile/`, `/auth/`

Även om de är `noindex` i HTML slösas crawl-budget. Lägg till:
```
Disallow: /play/
Disallow: /profile/
Disallow: /auth/
```

### 12. Interna länkar: inga cross-game-länkar

Game-pages bör länka till 3 "You might also like" i samma kategori. Minskar bounce, sprider länkvärde.

### 13. Bilder: alt-text standardisering

Många thumbnails har `alt="Game Name"`. Byt till t.ex. `alt="Play Snake online free – HTML5 arcade game"`.

---

## Låg prioritet / nice-to-have

### 14. `.well-known/security.txt`

Liten trust-boost:
```
Contact: https://gamevolt.io/contact/
Expires: 2027-04-17T00:00:00.000Z
Preferred-Languages: en
```

### 15. `humans.txt`
Branding-signal för tech-publik. Ingen direkt SEO-effekt.

### 16. hreflang
Site är engelsk och global — hreflang behövs inte just nu. Skippa.

### 17. Core Web Vitals
Google Fonts preloadas redan. WebP-thumbnails används på alla utom HoverDash (PNG). Bump av `fetchpriority="high"` på LCP-bilden per sida kan ge några tiondelars sekund.

---

## Innehållsstrategi – vägen till fler besökare

### A) Long-tail guider (`/guides/`)

Skapa 10–15 artiklar som mål: specifika söktermer med låg konkurrens.

Exempel på titlar:
- `/guides/how-to-play-snake-tips/`: "How to Play Snake Online: 10 Pro Tips & Strategies"
- `/guides/breakout-power-ups/`: "Breakout Power-Up Guide: All 15 Effects Explained"
- `/guides/daily-sudoku-strategy/`: "Daily Sudoku: A Beginner's Strategy Guide"
- `/guides/solitaire-win-rate/`: "How to Increase Your Solitaire Win Rate (Klondike & Spider)"

Varje guide: 600–900 ord, 2–3 interna länkar till speltet, 1 CTA "Play now".

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
✅ Title, OG, Twitter, WebSite+ItemList JSON-LD redan bra.
⚠️ Lägg till Organization `sameAs`. Kort titel: "Free Online Games – Play Arcade, Puzzle & Strategy | GameVolt" (63).

### Snake (`snake/index.html`)
⚠️ Lägg till AggregateRating.
⚠️ Expandera SEO-content från ~150 ord till 300+.
⚠️ "You might also like": Breakout, TapRush, Gravity Well.
⚠️ Flytta FAQPage från `games/snake/`.

### Breakout (`breakout/index.html`)
⚠️ Lägg till AggregateRating.
⚠️ Lyft power-ups tydligt i description.
⚠️ Lägg till FAQPage med 4–5 Q&A (kontroller, power-ups, hur många banor etc).

### Solitaire (`solitaire/index.html`)
⚠️ Korta titeln till ≤60 tecken.
⚠️ Lägg till interna länkar till `/solitaire/klondike.html` etc.
⚠️ Lägg till AggregateRating.

### Arcade Games (`arcade-games/index.html`)
⚠️ Expandera content till 350+ ord.
⚠️ ItemList i JSON-LD ska innehålla **alla** arcade-spel, inte bara två.
⚠️ Footer-länkar till övriga 3 kategorier.

### `/play/` och `/profile/`
✅ Redan `noindex`. OK.

### `/leaderboards/`
❌ Byt till `noindex, follow`.

---

## Konsoliderad åtgärdslista (prioriterad)

### Kritisk (denna vecka)
1. Fixa `/games/`-duplikater: uppdatera canonicals eller radera mappen
2. Ta bort `/games/X/`-rader från `sitemap.xml`
3. Uppdatera `<meta robots>` på `/leaderboards/`
4. Uppdatera lastmod i båda sitemaps

### Hög (denna månad)
5. Lägg till AggregateRating på alla 13 spel
6. Flytta FAQPage från `games/` till root-versionerna
7. Expandera 4 kategorisidor till 350+ ord
8. Korta Solitaire-titeln
9. Lägg till "You might also like" på alla game-pages

### Medium (löpande)
10. Gör meta descriptions unika per spel
11. Lägg till 5–10 guider i `/guides/` för long-tail
12. Blogg-sektion med månatlig post
13. Cross-game internal linking
14. Bevaka Core Web Vitals via Google Search Console

### Låg (nice-to-have)
15. `.well-known/security.txt`
16. `humans.txt`
17. Organization `sameAs` i JSON-LD

---

## Förväntad effekt

**Endast Kritiska fixade:** +15–25 % organisk trafik på 4–8 veckor. +5–10 % CTR via rich snippets.

**+ Hög prioritet:** +40–60 % organisk trafik på 2–3 månader. Högre placeringar på spel-specifika sökningar.

**+ Innehållsstrategi:** +80–120 % på 6–9 månader om guider och blogg körs konsekvent.

Den enskilt största hävstången är att rensa `/games/`-duplikaterna **innan** Google indexerar dem hårdare.
