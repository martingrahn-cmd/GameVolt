# GameVolt – Buggrapport

> Genererad 2026-04-17. Enbart buggar som är **verifierade i kod** och som faktiskt är trasiga just nu. Förbättringsförslag, polish, pågående migrationer och arkitekturdiskussioner hör hemma i FEATURE-REPORT.md eller SEO-REPORT.md.

---

## Bekräftade buggar

### 1. Regex missar bindestreck i game IDs
- **Severity:** High (funktionellt trasigt)
- **Filer:** `index.html:2516` och `index.html:2690`
- **Kod:**
  ```js
  var match = href && href.match(/game=(\w+)/);
  ```
- **Symptom:** `\w` matchar inte bindestreck. Länkar till `/play/?game=manga-match3`, `/play/?game=golden-glyphs` och `/play/?game=one-stroke` extraherar slugen felaktigt (matchar bara "manga", "golden", "one").
- **Konsekvens:** "Senast spelad"-indikatorer visas inte på dessa tre spel, och trending-sektionen räknar inte deras plays.
- **Fix:** Byt till `/game=([\w-]+)/` på båda raderna.

### 2. Property-namn stämmer inte: `sessionCount` vs `sessions`
- **Severity:** High (funktionellt trasigt)
- **Fil:** `index.html:2551`
- **Kod:**
  ```js
  all.push({ id: id, playTime: d.totalPlayTimeMs, sessions: d.sessionCount || 1 });
  ```
- **Rotorsak:** `js/gv-tracker.js:31,44` skriver propertyn `sessions`, inte `sessionCount`. `d.sessionCount` är alltid `undefined` → fallback `|| 1`.
- **Konsekvens:** Trending-listan visar alltid 1 session per spel. Sorteringen är i praktiken baserad enbart på `playTime`, inte på vad koden ser ut att göra.
- **Fix:** Läs rätt property:
  ```js
  sessions: d.sessions || 1
  ```

### 3. postMessage-listeners saknar origin-kontroll
- **Severity:** Medium (säkerhet — inte aktivt exploiterbar men en öppen dörr)
- **Fil:** `play/index.html:859-872`
- **Kod:**
  ```js
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'gamevolt_ga4' && typeof gtag === 'function') {
      gtag('event', event.data.event, event.data.params || {});
    }
  });

  window.addEventListener('message', function(event) {
    if (!event.data || event.data.type !== 'gamevolt') return;
    // ...
  });
  ```
- **Symptom:** En crafted parent-sida kan embedda `play/index.html` i sin egen iframe och skicka fake GA4-events eller scores. Kräver visserligen att någon embeddar GameVolt och skickar medvetet, men tröskeln är noll.
- **Fix:** Kontrollera källan innan data används:
  ```js
  window.addEventListener('message', function(event) {
    if (event.origin !== window.location.origin) return;
    // ...
  });
  ```
  Och/eller verifiera `event.source === iframe.contentWindow` för game-listenern.

---

## Sammanfattning

| # | Severity | Fil | Fix-storlek |
|---|----------|-----|-------------|
| 1 | High | `index.html:2516,2690` | 1 tecken per rad |
| 2 | High | `index.html:2551` | Byt properta |
| 3 | Medium | `play/index.html:859,866` | 2 rader |

Tre buggar. Samtliga kan fixas på under 10 minuter.

---

## Vad som inte är med (och varför)

Första versionen av rapporten listade 21 punkter. Efter en strikt omvärdering togs följande bort:

- **Hårdkodade Supabase-credentials** — anon-nyckeln är designad att vara publik, RLS är skyddet. Ingen bugg.
- **postMessage med target `'*'`** — anti-pattern men ingen aktiv sårbarhet så länge alla parter är samma origin.
- **`/games/X/` dubbletter + sitemap-inkonsekvens** — pågående migration, dokumenterad i `GAMEVOLT-SEO-CLEANUP.md`. Hör hemma i SEO-rapporten (där finns den).
- **Service worker cachar inte thumbnails / saknar cache-busting** — medvetna arkitekturval, inte fel. Kan förbättras men är inte trasigt.
- **`loadSidebarLeaderboard()` utan retry** — graceful degradation, inte bugg.
- **HoverDash PNG istället för WebP** — stilistisk inkonsekvens, inte bugg.
- **GA4-listener saknas på `/profile/`** — profilsidan embeddar inte spel idag. Skulle vara relevant om/när den gör det.
- **Alt-text, casing, `/leaderboards/` robots-tagg** — hör hemma i SEO-rapporten (där finns de).
- **Supabase-credentials på fyra platser** — DRY-polish, inte bugg.
- **404-sidan** — design-val (easter egg), inte bugg.
