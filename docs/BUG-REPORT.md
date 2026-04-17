# GameVolt – Buggrapport

> Genererad 2026-04-17 via kodanalys av hela repot. Bugs är verifierade mot faktiska filer. Severity: Critical → Low.

---

## Kritiska buggar (fix nu)

### 1. Saknad origin-validering i postMessage-lyssnare (play/index.html)
- **Severity:** Critical (säkerhet)
- **Fil:** `play/index.html:859-893`
- **Symptom:** Två `window.addEventListener('message')`-handlare accepterar meddelanden från alla origins (`'*'`). Vem som helst kan spoofa poäng, achievements och GA4-events via en crafted iframe/parent.
- **Rotorsak:** Ingen `event.origin`-kontroll före användning av `event.data`.
- **Fix:**
  ```js
  window.addEventListener('message', function(event) {
    if (event.origin !== window.location.origin) return;
    // ...befintlig logik
  });
  ```

### 2. Spel postar med target origin `'*'`
- **Severity:** Critical (säkerhet)
- **Filer:** `hoverdash/index.html:592` plus övriga spel som använder `gvPost()`-hjälparen i GAMEVOLT.md
- **Symptom:** `window.parent.postMessage({...}, '*')` skickar payload till vilken mottagare som helst som lyssnar.
- **Fix:** Byt målet till `window.location.origin` i `gvPost`-helpern och uppdatera alla spel samt mallen i GAMEVOLT.md.

### 3. Regex matchar inte bindestreck i game IDs
- **Severity:** High (funktionell)
- **Fil:** `index.html:2516` och `index.html:2690`
- **Symptom:** `/game=(\w+)/` matchar inte `manga-match3`, `golden-glyphs`, `one-stroke`. "Senast spelad"-indikatorer visas inte och trending-listan hoppar över dessa spel.
- **Fix:** Byt till `/game=([\w-]+)/` på båda ställena.

### 4. Property-namn-mismatch: `sessionCount` vs `sessions`
- **Severity:** High (funktionell)
- **Fil:** `index.html:2551` läser `d.sessionCount`, men `js/gv-tracker.js:34` skriver `sessions`.
- **Symptom:** Trending-sektionen räknar alltid 1 session per spel, sortering blir fel.
- **Fix:** Ändra till `d.sessions || 1` i `index.html:2551`.

### 5. Hårdkodade Supabase-credentials på fyra platser
- **Severity:** High (säkerhet + maintainability)
- **Filer:** `sdk/gamevolt.js:11-12`, `play/index.html:943-944`, `index.html:2588-2589`, `auth/callback/index.html`
- **Symptom:** Nyckel-rotation kräver edit på fyra ställen. Om RLS någonsin blir felkonfigurerad exponeras databasen.
- **Fix:** Skapa `/js/gv-config.js` med exports för `SUPABASE_URL` + `SUPABASE_ANON_KEY`. Importera i alla fyra filer. Verifiera RLS på alla tabeller.

---

## Hög severity

### 6. Dubbla sitemaps med motstridiga URL-scheman
- **Severity:** High (SEO / navigation)
- **Filer:** `sitemap.xml` vs `sitemap-v2.xml`
- **Symptom:** `sitemap.xml` listar `/games/X/` (rad 166–248), men spelen ligger på root (`/snake/`, `/breakout/` …). `sitemap-v2.xml` använder rätt root-paths. Båda är registrerade i `robots.txt`. Google hittar både live och 404-URL:er → duplicate content.
- **Fix:** Ta bort `/games/X/`-entries ur `sitemap.xml`, eller behåll enbart `sitemap-v2.xml` och ta bort den gamla.

### 7. robots.txt och sitemap motsäger varandra
- **Severity:** High (SEO)
- **Filer:** `robots.txt:3` vs `sitemap.xml`
- **Symptom:** `Disallow: /games/` krockar med 17 URL:er under `/games/` i `sitemap.xml`. Antingen crawlas aldrig dessa eller så upptäcks de ändå och markeras som disallowed.
- **Fix:** Bestäm en sanning — antingen ta bort `Disallow: /games/` eller ta bort URL:erna i sitemap.

### 8. Otillräcklig gameId-validering i postMessage-flödet
- **Severity:** High
- **Fil:** `play/index.html:866-872`
- **Symptom:** Payload accepteras så länge `gameId` matchar `currentGame` — men det finns inget bevis på att meddelandet faktiskt kom från game-iframen.
- **Fix:** Verifiera `event.source === iframeElement.contentWindow` innan data processas.

### 9. Hela `/games/X/`-hierarkin duplicerar hela root-spel
- **Severity:** High (SEO + underhåll)
- **Fil:** `games/*/index.html` (13 filer)
- **Symptom:** Dubbelt innehåll live på två URL:er, och canonical på `/games/X/` pekar på sig själv istället för root-versionen.
- **Fix:** Antingen (a) radera `/games/`-mappen och redirecta via meta refresh, eller (b) uppdatera canonical i alla `/games/X/index.html` att peka på `/X/`.

---

## Medium severity

### 10. Service Worker precacher inte spel-thumbnails
- **Severity:** Medium (prestanda)
- **Fil:** `sw.js:3-12`
- **Symptom:** Thumbnails laddas från nätverket varje sida-visning.
- **Fix:** Lägg till de viktigaste thumbnails i `PRECACHE_URLS`, eller cache-first för `/assets/thumbnails/*.webp`.

### 11. Ingen cache-busting vid SDK-uppdateringar
- **Severity:** Medium
- **Fil:** `sw.js` (`CACHE_NAME = "gamevolt-v1"`)
- **Symptom:** Fixar i `sdk/gamevolt.js` når inte användare förrän `CACHE_NAME` bumpas. Risk för att gamla klienter kör buggig SDK i veckor.
- **Fix:** Automatisera versionsbump (t.ex. commit-hash som CACHE_NAME) eller använd hash i filnamn (`gamevolt.abc123.js`).

### 12. `loadSidebarLeaderboard()` saknar felhantering
- **Severity:** Medium
- **Fil:** `play/index.html:948-1012`
- **Symptom:** Nätverksfel eller RLS-fel ger en tom sidebar utan feedback, istället för "Leaderboard unavailable".
- **Fix:** Lägg till `.catch()` med enkel retry (max 2 försök) och visa fallback-text.

### 13. Inkonsekvent thumbnail-format på HoverDash
- **Severity:** Medium (prestanda + SEO)
- **Filer:** Alla referenser till `/hoverdash/og-image.png`
- **Symptom:** PNG (~50 KB) istället för WebP (~10 KB) som övriga spel använder.
- **Fix:** Konvertera till WebP och uppdatera alla refs.

### 14. GA4-postMessage-listener saknas på `profile/index.html`
- **Severity:** Medium (analytics)
- **Symptom:** Om profilsidan någonsin embeddar spel förloras GA4-events.
- **Fix:** Lägg till samma listener som i `play/index.html` (om profilsidan planerar att embedda spel).

### 15. `gv-search.js` har hårdkodad spelregister
- **Severity:** Medium
- **Fil:** `js/gv-search.js:1-13`
- **Symptom:** Nya spel måste synkas manuellt i sökresultaten.
- **Fix:** Generera registret från en gemensam `/js/games-registry.json` som konsumeras av både `index.html`, `play/index.html` och sökmodulen.

### 16. Saknad robots-tag på `/leaderboards/`
- **Severity:** Medium (SEO)
- **Fil:** `leaderboards/index.html:18`
- **Symptom:** Sidan innehåller användarspecifika snapshots men är `index, follow`.
- **Fix:** Byt till `<meta name="robots" content="noindex, follow">`.

### 17. Ghost `/games/` i robots men inte alla gamla ghost-URL:er blockerade
- **Severity:** Medium (SEO)
- **Fil:** `robots.txt`
- **Symptom:** Blockerar `/game/` men inte t.ex. `/play/` (stor crawl-budget slösas på iframe-sidor) eller `/auth/`.
- **Fix:** Lägg till `Disallow: /play/`, `Disallow: /auth/`, `Disallow: /profile/` (alla redan noindex).

---

## Låg severity

### 18. Två listeners forwarder samma events till GA4
- **Severity:** Low
- **Fil:** `play/index.html:859-893`
- **Symptom:** Om både `gamevolt_ga4`- och `gamevolt`-messages skickas för samma händelse dupliceras events i GA4.
- **Fix:** En listener som router på `event.data.type`.

### 19. Alt-text saknas eller är generisk på vissa bilder
- **Severity:** Low (tillgänglighet)
- **Symptom:** Flera thumbnails har bara `alt="Game Name"` istället för "Play X online free".
- **Fix:** Standardisera `alt`-text mönster: `alt="Play {Game Name} online – free HTML5 game"`.

### 20. Inkonsekvent casing på interna game-IDs
- **Severity:** Low
- **Symptom:** Mix av `hoverdash`, `HoverDash`, `hover-dash` i olika filer.
- **Fix:** Dokumentera ett slug-format (lowercase med bindestreck) och refaktorera internt.

### 21. `404.html` är ett easter egg men har ingen SEO-signal
- **Severity:** Low
- **Symptom:** Flappy Bird på 404 är kul, men sidan bör tydligt säga "Page not found" och länka tillbaka till hem/kategorier för Google.
- **Fix:** Lägg till en minimal textsektion med H1 "Page not found" och länkar + `<meta name="robots" content="noindex">`.

---

## Sammanfattning

| Severity | Antal | Exempel |
|----------|-------|---------|
| Critical | 5 | postMessage origin, regex, property mismatch |
| High | 4 | Sitemap-duplikat, `/games/`-hierarki |
| Medium | 8 | SW cache, thumbnails, noindex |
| Low | 4 | Alt-text, casing, 404-sida |
| **Totalt** | **21** | |

### Rekommenderad ordning
1. Fixa postMessage-säkerhet (1, 2, 8) + regex/property-mismatch (3, 4) — **samma kväll**.
2. Städa sitemap + robots + `/games/`-duplikat (6, 7, 9) — **samma vecka**.
3. SW-cache + credentials-centralisering (5, 10, 11) — **nästa sprint**.
4. Polish (12–21) — löpande.
