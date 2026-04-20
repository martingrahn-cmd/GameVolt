# GameVolt – Feature-rapport

> Genererad 2026-04-17. Prioriterar tillväxt, retention och monetisering. Respekterar existerande stack: vanilla JS, Supabase, GitHub Pages, optional SDK.

---

## Nuläge (2026-04-17)

- 13 spel live, varav 6 med SDK (Breakout, Connect 4, HoverDash, Golden Glyphs, Sudoku, Axeluga)
- SDK v1: auth (magic link + Google OAuth), cloud save, leaderboards, achievements
- Portalen: spel-katalog, player-shell med sidebar, profil, leaderboards, kategorisidor
- Supabase-schema redo för: favorites, ratings, daily_challenges, streaks
- Saknas i UI: daily challenges, streaks, ratings, favorites, search, trending

---

## Quick wins (1–2 veckor)

### 1. Login Nudge Popup ✅ IMPLEMENTERAD (2026-04-17)
**Vad:** När gäst anropar `leaderboard.submit()` visas en mjuk bottom-toast: "You scored 1,234! Sign in to save it to the leaderboard." Klick på "Sign in" öppnar befintliga login-modalen. Den väntande poängen submitteras automatiskt när användaren loggar in under samma session.
**Beteende:** Max 1 nudge per session (sessionStorage-flagga). Auto-dismissar efter 15 sek. Dismiss-knapp. Fallback-text om score är 0 eller saknas.
**Filer:** `sdk/gamevolt.js` — nudge-DOM, `showNudge()`, `pendingSubmission`, `flushPendingSubmission()`, `leaderboard.submit()` + `notifyStateChange()`-hook.
**Påbyggnader (future):** Visa estimerad rank ("You'd be #7 worldwide!"), trophy-variant vid `achievements.unlock()` för platinum/gold, milestone-trigger (första game over, 10:e run).

### 2. Continue Playing-carousel ✅ REDAN IMPLEMENTERAD
**Vad:** Hem-sida visar de 4 spel användaren senast spelade, sorterat på `lastPlayed`. Varje kort visar thumbnail (med hover-video-preview för spel som har `preview.mp4`), spelets namn, tid sen senast (`3h ago`) och total speltid. Sektionen gömd automatiskt om användaren inte har spelat något än.
**Filer som redan existerar:**
- `js/gv-tracker.js` — lagrar sessioner i `gv_portal` localStorage (`startSession`/`endSession`/`recordEvent`/`getRecentlyPlayed`)
- `play/index.html:23, 731-893` — startar/slutar sessioner via postMessage + pagehide
- `index.html:1778-1783` + `:1230-1299` — HTML + CSS
- `index.html:2467-2514` — JS som hämtar `getRecentlyPlayed(4)` och renderar kort
**Förbättringar möjliga senare:** sync med Supabase för cross-device continue, "remove from history"-knapp, max 8 istället för 4 i bred viewport.

### 3. Favorites ✅ IMPLEMENTERAD (2026-04-17)
**Vad:** Hjärta-knapp i spelarens game bar togglar favorit för aktuellt spel. Egen `/favorites/`-sida listar allt i ett rutnät med remove-knapp per kort och tom-state om användaren inte favoriserat något.
**SDK-API:** `GameVolt.favorites.is(gameId?)`, `GameVolt.favorites.toggle(gameId?)`, `GameVolt.favorites.list()`.
**Backend:** `favorites`-tabell i Supabase (user_id + game_id PK). Gäster lagrar i `gv_favorites` localStorage. På login migreras local → cloud via `flushPendingFavorites()` (upsert ignoreDuplicates), sedan rensas lokal lista.
**Filer:** `sdk/gamevolt.js` (favorites-modul + state-hook), `play/index.html` (heart-btn + CSS + handler), `favorites/index.html` (ny sida, noindex), `index.html` (footer-länk).

### 4. Game Ratings (1–5 stjärnor) ✅ IMPLEMENTERAD (2026-04-17)
**Vad:** 5-stjärnors rating-widget i `/play/`-sidebaren. Hover-preview, klick submittar, optimistic UI uppdaterar direkt. Visar antingen "Your rating: X/5 · Avg Y (N)" för den som betygsatt eller "Avg Y · N ratings" / "Be the first to rate" för andra.
**SDK-API:** `GameVolt.rating.submit(value, gameId?)`, `GameVolt.rating.get(gameId?)`, `GameVolt.rating.getAggregate(gameId?)`.
**Backend:** `ratings`-tabell i Supabase (user_id + game_id PK, rating 1–5). Gäster lagrar `gv_ratings` som `{gameId: value}` i localStorage. På login kör `flushPendingRatings()` en upsert med `onConflict: user_id,game_id` och rensar den lokala listan.
**Aggregering:** `getAggregate()` SELECT:ar alla rating-rader för speltet och genomsnittar klient-side. Fungerar för nuvarande skala — byt till en `get_rating_aggregate(p_game_id)` RPC när ett spel passerar ~10k betyg.
**Filer:** `sdk/gamevolt.js` (rating-modul + flush-hook), `play/index.html` (ny sidebar-sektion, CSS för stjärnor, widget-JS).

**Uppföljning för SEO-synk:** JSON-LD `aggregateRating` i `games/X/index.html` är idag statiska estimat (se SEO-REPORT). När riktig data ackumuleras, bygg ett enkelt Node-script som läser Supabase-aggregaten och skriver nya värden in i JSON-LD-blocken. Kan köras manuellt eller som pre-commit-hook. Inte bråttom — börjar ge mening när varje spel har 20+ riktiga betyg.

### 5. "NEW"-badge + senaste-aktivitet-widget
**Vad:** Badge på spel yngre än 14 dagar. Liten widget: "HoverDash fick 100 plays idag".
**Insats:** S | **Impact:** Medium | **Beroenden:** `games.created_at`, `games.play_count`

### 6. Search & filter
**Vad:** Sökfält i hem + play. Filter: kategori, svårighetsgrad.
**Insats:** M | **Impact:** Medium-High
**Filer:** `js/gv-search.js` finns redan — expandera. Lägg `difficulty` i GAMES-config.

### 7. Supabase email customization
**Vad:** Snygg HTML-template för magic link.
**Insats:** S (enbart Supabase-dashboard)
**Impact:** +3–8 % CTR på login-email.

---

## Engagement & retention (2–4 veckor)

### 8. Daily Challenges Live UI
**Vad:** Globalt dagligt uppdrag ("Score 5000 in Snake today"). Toast när klar. Reward: streak-bonus.
**Insats:** M | **Impact:** High (drives DAU)
**Beroenden:** `daily_challenges` + `daily_completions` schema finns
**Filer:** `sdk/gamevolt.js` (`challenge`-objekt), `play/index.html` sidebar, `index.html` widget.

### 9. Streak Tracking & Milestones
**Vad:** "🔥 7 Day Streak" på profil. Milestones: 7, 30, 100 dagar → exklusiv trophy/avatar.
**Insats:** M | **Impact:** High
**Beroenden:** `profiles.current_streak`, `profiles.longest_streak` finns

### 10. Achievement-progress i sidebar
**Vad:** "12/31 Trophies · 80% Bronze" live medan man spelar.
**Insats:** M | **Impact:** Medium
**Beroenden:** postMessage + SDK achievements finns

### 11. Leaderboard-varianter (weekly / monthly / per-mode)
**Vad:** Tabs: "All Time", "This Week", "This Month". Snake (3 modes) → separat per mode.
**Insats:** M | **Impact:** High (förnyar kompetenterna)
**Beroenden:** `scores.mode` + `scores.created_at` finns

### 12. Weekly email digest
**Vad:** "Din vecka på GameVolt: 5 spel, 12 trophies, rank +23 på HoverDash."
**Insats:** M | **Impact:** High (+3–7 % weekly return)
**Beroenden:** Supabase Edge Function + opt-in preference på profil

### 13. Related Games i player
**Vad:** "You might also like" 3 relevanta spel i sidebar eller under iframe på mobil.
**Insats:** S-M | **Impact:** Medium (minskar bounce)
**Synergi:** Stöttar även SEO-rekommendationen om internlänkar.

---

## Social & community (4–8 veckor)

### 14. Friends-system
**Vad:** Vänner, vännerstopscores i sidebar, notifieringar när vän slår ditt record.
**Insats:** L | **Impact:** High (kompetenslås-in)
**Ny tabell:** `friendships(requester_id, recipient_id, status)`

### 15. Public Player Profiles
**Vad:** `/player/[username]/` med avatar, trophies, top scores, favoriter. Delbar URL.
**Insats:** M | **Impact:** Medium (sharing-driver)

### 16. Activity Feed på hem
**Vad:** "🏆 Alex tog Gold på Connect 4 · 🎮 Sam spelar HoverDash · 📈 Sudoku +45 % denna vecka"
**Insats:** L | **Impact:** High (FOMO + social proof)
**Teknik:** Supabase Realtime eller polling var 30 s.

### 17. Comments per spel
**Vad:** Enkel textcomment på spelsida. Max 500 tecken. Senaste 5 visas.
**Insats:** M-L | **Impact:** Medium
**Ny tabell:** `game_comments`

### 18. Game Submission Portal
**Vad:** Externa devs submittar HTML5-spel. Checklist + moderation queue.
**Insats:** L-XL | **Impact:** Very High (exponentiell tillväxt)
**Defererad till Phase 4** — kräver moderation-workflow.

---

## Discovery & personalization

### 19. Trending / Most Played sort
**Vad:** Hem-tabs: "All", "Trending", "Top Rated", "New".
**Insats:** M | **Impact:** High (koncentrerar trafik)
**Beroenden:** `games.play_count` existerar

### 20. Avatar-system
**Vad:** Preset-galleri med 20+ avatarer. Unlockable: platinum på ett spel → exklusiv avatar.
**Insats:** M | **Impact:** Medium
**Data:** `profiles.avatar_id` + `profiles.unlocked_cosmetics` (JSON)

### 21. Dark/Light tema
**Vad:** Toggle i header. Sparas i localStorage, respektera `prefers-color-scheme`.
**Insats:** S-M | **Impact:** Low-Medium (QoL)
**Redan nu:** CSS-variabler finns, enkel add.

---

## Monetisering (start efter 10k DAU)

### 22. Rewarded Video Ads
**Vad:** Optional: "Watch 15s ad for +1 life / +50 coins." Spelar-initierad.
**Insats:** L | **Impact:** Medium ($400–800/mån initialt)
**Partner:** AdMob eller Poki/CrazyGames nätverk
**Golden Glyphs har redan ad-abstraktion** — använd som template.

### 23. Cosmetic skins
**Vad:** Avatar-skins och trail-effekter, låses via trophies eller $1–3 köp.
**Insats:** M | **Impact:** Low-Medium

### 24. Tip jar / Ko-fi
**Vad:** "❤️ Support GameVolt"-knapp i footer.
**Insats:** M (Stripe/Ko-fi integration) | **Impact:** Low men ren marginal

### 25. Premium Battle Pass
**Status:** Defererad till Phase 5. Cosmetic-only för att undvika pay-to-win.

---

## Technical & polish

### 26. PWA install prompt + offline mode
**Vad:** "Install GameVolt" banner. Cache game-assets så de fungerar offline.
**Insats:** M | **Impact:** Medium-High (hem-skärm = fler daily opens)
**Filer:** `manifest.json` finns. `sw.js` finns — utöka cache-strategi.

### 27. Accessibility / colorblind mode
**Vad:** Toggle för deuteranopi/protanopi/tritanopi palette. Keyboard-only stöd.
**Insats:** M-L (per spel) | **Impact:** Medium (8 % av män är färgblinda)

### 28. A/B testing framework
**Vad:** Liten utility `runABTest(name, variants)` + localStorage-bucketing + GA4-tagg.
**Insats:** M | **Impact:** Medium (möjliggör fortsatt optimering)

### 29. Admin analytics dashboard
**Vad:** `/admin/` (lösenordsskyddad): DAU, topp-spel, retention, revenue.
**Insats:** L | **Impact:** Medium (datadrivna beslut)

---

## SDK v2 & migration

### 30. SDK rollout till resterande spel
**Uppdaterad status (2026-04-17 efter kod-audit):** Tabellen i GAMEVOLT.md var inaktuell. Verkligheten:

- **Fullt integrerade (10 spel):** Breakout, Connect 4, BlockStorm, HoverDash, Axeluga, Gravity Well, Sudoku, Golden Glyphs, One Stroke, Manga Match (sista `registerMigration` tillagd 2026-04-17).
- **Partiella (1):** Solitaire — `init` finns på freecell-varianten, men ingen variant har leaderboard / achievements / registerMigration.
- **Saknas helt (2):** Snake, TapRush.

**Återstående arbete:**
- **Snake** (30–45 min): init + score-submit + trophies + registerMigration. Hög impact (populärt spel, 3 modes = 3 leaderboards).
- **TapRush** (30–45 min): samma.
- **Solitaire** (1–2 h): lägg leaderboard + achievements + registerMigration på varje variant (Klondike, FreeCell, Spider, Pyramid, TriPeaks, Golf). Per-variant leaderboards via `mode`.

Parallellt arbete — kan spridas över flera sessioner.

### 31. Auto-migration vid första login
**Vad:** Gäst-data (localStorage) → cloud sker tyst, visa bara toast "Synced!".
**Insats:** S-M | **Impact:** High (noll dataförlust vid signup)
**Status:** Logik finns i SDK; säkerställ att alla spel anropar `save.registerMigration()`.

### 32. Cross-game stats på profil
**Vad:** "🎮 847 games · ⏱️ 42h · 🏆 Top 5 % på 3 spel" — aggregate från scores-tabellen.
**Insats:** M | **Impact:** Medium
**Beroenden:** `total_play_time_seconds` i `profiles` finns

---

## Content (6–12 veckor)

### 33. Guides & strategy-sidor
**Vad:** `/guides/`-hub med 10–15 long-tail-artiklar. Stödjer även SEO-rapport.
**Insats:** M (författande) | **Impact:** Medium (SEO + retention)

### 34. Blogg / Dev Diary
**Vad:** `/blog/` med månatlig post: nya spel, champion-spotlights, postmortems.
**Insats:** M (infrastructure) + löpande författande | **Impact:** Medium (SEO + community)

### 35. Game Guides (user-generated wiki)
**Vad:** Users kan skriva guider, community röstar.
**Insats:** L | **Impact:** Medium | **Defererad** tills playerbasen är större.

---

## Prioriteringsmatris

| # | Feature | Impact | Insats | Ratio |
|---|---------|--------|--------|-------|
| 1 | Login Nudge | ⭐⭐⭐⭐⭐ | S | 5.0 |
| 2 | Continue Playing | ⭐⭐⭐⭐⭐ | S | 5.0 |
| 3 | Favorites | ⭐⭐⭐⭐ | S | 4.0 |
| 4 | Game Ratings | ⭐⭐⭐⭐ | S | 4.0 |
| 5 | SDK rollout (Snake, TapRush, Solitaire) | ⭐⭐⭐⭐⭐ | S×3 | 4.0 |
| 6 | Daily Challenges UI | ⭐⭐⭐⭐⭐ | M | 4.0 |
| 7 | Streak Tracking | ⭐⭐⭐⭐⭐ | M | 4.0 |
| 8 | Search & Filter | ⭐⭐⭐⭐ | M | 3.5 |
| 9 | Trending Sort | ⭐⭐⭐⭐ | M | 3.5 |
| 10 | Related Games | ⭐⭐⭐ | S | 3.0 |
| 11 | Leaderboard Variants | ⭐⭐⭐⭐ | M | 3.0 |
| 12 | Email Digest | ⭐⭐⭐⭐ | M | 3.0 |
| 13 | PWA Install | ⭐⭐⭐⭐ | M | 3.0 |
| 14 | Friends | ⭐⭐⭐⭐⭐ | L | 2.5 |
| 15 | Public Profiles | ⭐⭐⭐ | M | 2.5 |
| 16 | Activity Feed | ⭐⭐⭐⭐ | L | 2.0 |
| 17 | Rewarded Ads | ⭐⭐⭐ | L | 1.5 |

---

## 90-dagars roadmap

### Månad 1 – Quick wins + SDK-rollout
- Vecka 1–2: Login Nudge, Continue Playing, Favorites, Ratings
- Vecka 3–4: Daily Challenges UI, Streak Tracking, Search & Filter
- Parallellt: SDK till TapRush, Snake (BlockStorm + Solitaire partial behöver också kompletteras)

**Förväntat:** +20–30 % login rate, bättre daily return, 92 % av katalogen SDK-klar.

### Månad 2 – Engagement & social
- Vecka 5–6: Trending sort, Achievement progress, Leaderboard-varianter, Related Games
- Vecka 7–8: Friends-system (backend), Public Profiles, Email Digest
- Parallellt: SDK-komplettering till Solitaire-varianterna (100 % SDK täckning)

**Förväntat:** +15–25 % session-längd, viral/word-of-mouth, konkurrensmoment.

### Månad 3 – Monetisering & polish
- Vecka 9–10: Rewarded Ads, Avatar Cosmetics, PWA install, Accessibility
- Vecka 11–12: Comments, Tip Jar, Email customization, Dark/Light theme

**Förväntat:** First revenue ($500–1100/mån), stronger community, polerad UX.

---

## Deferade (post-90-dagar)

- Real-time Activity Feed
- Game Submission Portal
- User-generated Game Guides
- Blogg / Dev Diary (kan dock starta tidigare om tid finns)
- Analytics Dashboard
- A/B testing
- Premium Battle Pass (revisit vid 50k+ MAU)

---

## Förväntade outcomes (90 dagar)

| Metric | Nu | Mål |
|--------|----|-----|
| Login rate | 5–8 % | 15–20 % |
| DAU | baseline | +40–60 % |
| Session-längd | baseline | +30–50 % |
| 7-day retention | baseline | +15–25 % |
| Revenue | 0 kr | $500–1100 / mån |
| SDK-coverage | 46 % | 100 % |

---

## Noter till Martin

1. **Parallellisera SDK-rollout** — vänta inte på nya features. Snake + TapRush + Solitaire-varianter är enda spelen utan full integration.
2. **Börja med Login Nudge** — en SDK-ändring ger effekt i alla spel samtidigt.
3. **Mät efter månad 1** — låt data styra månad 2–3.
4. **Moderations-budget** — comments/reviews/guides kräver review. Batch 1×/vecka räcker länge.
5. **Mobil-först i varje test** — alla nya komponenter måste fungera i iframe på telefon.
6. **Community = moat** — friends/streaks/leaderboards gör det smärtsamt att lämna.
