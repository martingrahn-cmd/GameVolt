# GameVolt – Buggrapport

> Uppdaterad 2026-04-17. Alla tre verifierade buggar är nu åtgärdade.

---

## Åtgärdade buggar

### ✅ 1. Regex missar bindestreck i game IDs
- **Filer:** `index.html:2516, 2690`
- **Fix:** Bytte `/game=(\w+)/` till `/game=([\w-]+)/` på båda raderna.
- **Effekt:** "Senast spelad"-indikatorer och trending-listan fungerar nu för `manga-match3`, `golden-glyphs` och `one-stroke`.

### ✅ 2. Property-namn stämmer inte: `sessionCount` vs `sessions`
- **Fil:** `index.html:2551`
- **Fix:** `d.sessionCount` → `d.sessions` så att värdet som `js/gv-tracker.js` faktiskt skriver hämtas korrekt.
- **Effekt:** Trending-sorteringen är nu baserad på både playtime och korrekt antal sessions.

### ✅ 3. postMessage-listeners saknade origin-kontroll
- **Fil:** `play/index.html:858-867`
- **Fix:** La till `if (event.origin !== window.location.origin) return;` överst i båda listenersarna (GA4-forwarder och game-event-listenern).
- **Effekt:** External origins kan inte längre injicera fake events, scores eller achievements.

---

## Sammanfattning

| # | Fil | Status |
|---|-----|--------|
| 1 | `index.html:2516, 2690` | ✅ Fixad |
| 2 | `index.html:2551` | ✅ Fixad |
| 3 | `play/index.html:858-867` | ✅ Fixad |

Totalt: **3/3 verifierade buggar åtgärdade.**

---

## Rekommenderade uppföljningar (inte buggar, men värda noll-stund)

Dessa togs bort från den första rapporten eftersom de inte är trasiga just nu, men finns som polish:

- Samla Supabase-credentials i `/js/gv-config.js` istället för fyra olika filer
- Cache-busting för SDK-uppdateringar (bump `CACHE_NAME` i `sw.js` vid deploy)
- Retry/fallback på `loadSidebarLeaderboard()` vid nätverksfel
- Byt HoverDash OG-image från `.png` till `.webp`
- Standardisera alt-text på thumbnails

Ingen av dessa blockerar användare idag.
