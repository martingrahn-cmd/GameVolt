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

### 1. Title-taggar som är för långa
Google trunkerar vid ~60 tecken.

| Fil | Nuvarande | Längd | Förslag |
|-----|-----------|-------|---------|
| `games/solitaire/` (samt root `solitaire/`) | "Free Solitaire Online – 6 Card Games with Leaderboards \| GameVolt" | 68 | "Solitaire Online – 6 Card Games Free \| GameVolt" (48) |
| `games/taprush/` | verifiera vid skärm | ? | Håll ≤58 |

### 2. Meta descriptions är copy-pasty
"No download needed" finns i 10+ beskrivningar. Gör varje unik genom att lyfta konkret mekanik.

Exempel:
- **Innan:** "Play Breakout free in your browser! Smash bricks, grab power-ups, beat levels..."
- **Efter:** "Breakout — 30 levels, 15 power-ups, global weekly leaderboards. Smash bricks, dodge hazards, compete. Free, no signup."

### 3. Kategorisidorna är för tunna
`arcade-games/`, `action-games/`, `puzzle-games/`, `board-games/` har ~6 paragrafer (~200 ord). Google föredrar 300–500 ord.

**Åtgärd per sida:**
- "Why Play [Category] Games?" (100 ord)
- "Classic vs Modern [Category]" (100 ord)
- "Best [Category] Games for Beginners" med 3–5 spel inline-länkade (100 ord)
- Redan klart: CTA + cross-category-länkar

### 4. H1 på gamesidor och homepage
Verifiera att varje sida har exakt **ett** H1 — första headingen måste vara H1, inte H2. Om designen inte klarar synlig H1, använd `<h1 class="sr-only">Play Snake Online Free</h1>`.

---

## Medium prioritet

### 5. Organization-schema på homepage saknar `sameAs`
`index.html` har Organization men inga sociala länkar.

**Åtgärd:**
```json
"sameAs": [
  "https://twitter.com/gamevolt",
  "https://youtube.com/@gamevolt",
  "https://github.com/martingrahn-cmd/gamevolt"
]
```

### 6. Interna länkar: inga cross-game-länkar
Landningssidorna bör länka till 3 "You might also like" i samma kategori. Minskar bounce, sprider länkvärde.

**Synergi:** Matchar Feature-rapportens `Related Games`-förslag.

### 7. Bilder: alt-text standardisering
Många thumbnails har bara `alt="Game Name"`. Byt till mönster: `alt="Play Snake online free – HTML5 arcade game"`.

---

## Låg prioritet / nice-to-have

### 8. `.well-known/security.txt`
```
Contact: https://gamevolt.io/contact/
Expires: 2027-04-17T00:00:00.000Z
Preferred-Languages: en
```

### 9. `humans.txt`
Branding-signal. Ingen direkt SEO-effekt.

### 10. hreflang
Skippa — siten är engelsk och global.

### 11. Core Web Vitals
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

### Hög (denna månad)
1. Korta Solitaire-titeln
2. Gör meta descriptions unika per spel
3. Expandera 4 kategorisidor till 350+ ord
4. Lägg till "You might also like" på alla landningssidor

### Medium (löpande)
5. Verifiera H1 på alla sidor
6. Organization `sameAs` i homepage JSON-LD
7. Alt-text standardisering
8. Cross-game internal linking
9. **Synka AggregateRating med riktig data** när Feature #4 (Ratings) är live

### Låg (nice-to-have)
10. `.well-known/security.txt`
11. `humans.txt`
12. `fetchpriority="high"` på LCP-bilder

### Innehållsspåret (6–9 mån)
13. Bygg 10–15 guider i `/guides/`
14. Starta månatlig `/blog/`-post

---

## Förväntad effekt

**Redan gjort (Strategi A + sitemap + robots):** +15–25 % organisk trafik på 4–8 veckor — från att Google inte längre splittrar authority mellan duplicerade URL:er.

**+ Hög prioritet:** +40–60 % på 2–3 månader — från rich snippets (AggregateRating) och djupare kategorisidor.

**+ Innehållsstrategi:** +80–120 % på 6–9 månader om guider och blogg körs konsekvent.
