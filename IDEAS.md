# GameVolt — Ideas & Backlog

Ideer som inte är akuta men värda att bygga vidare på.

> **Avbockat mot koden 2026-07-25.** Ungefär halva listan var redan byggd men
> aldrig markerad. `[x]` = verifierad i koden. Punkter som bara är *delvis*
> byggda står kvar som `[ ]` med en `—` **Finns:** -not om vad som redan
> existerar, så det som återstår är tydligt.

---

## Iframe / Game Player

Spelaren (`/play/index.html`) laddar spel i en iframe. PostMessage-bridgen skickar redan `game_start`, `game_over`, `high_score`, `achievement`, `level_complete` — men det finns mycket mer att göra med den datan.

- [ ] **Live trophy-toast i parent** — visa achievement-popups i game bar/sidebar istället för bara i spelet. **Finns:** `achievement`-eventet tas emot men loggas bara till GVTracker (`play/index.html`), ingen toast.
- [x] **Mini-leaderboard i sidebar** — top 5 i realtid medan man spelar (`#sidebarLbSection` + "Full Leaderboard →")
- [ ] **Achievement-progress i sidebar** — "12/31 trophies" med progress bar
- [x] **Rate & Favorite** — stjärnbetyg i sidebaren (`#ratingStars`) + hjärta i game baren (`#favBtn`)
- [ ] **Relaterade spel** — "Gillar du detta? Prova även..." **Finns:** en "More Games"-grid (`#sidebarGrid`), men urvalet är inte relaterat till spelet man kör.
- [ ] **Screenshot/share** — **Finns:** en dela-knapp (`#shareBtn`) som delar länken. Kvar: screenshot av canvasen via postMessage.
- [ ] **Game stats live** — visa score/level/tid från spelet i game bar i realtid
- [ ] **Spectator-mode** — streama speldata via postMessage för en "watch live"-vy
- [ ] **Game-specifik info** — visa beskrivning, kontroller, tips i en expanderbar panel
- [ ] **Kommentarer/chat** — enkel kommentarsfunktion per spel (Supabase-tabell)

---

## Avatar System

Idé: låt användare skapa/anpassa sin avatar istället för default Gravatar/initialer.

- [ ] **Preset gallery** — välj bland färdiga avatarer (pixelart, emojis, teman). **Finns:** en "randomize"-knapp i byggaren, men inget galleri av färdiga val.
- [x] **Avatar builder** — modell/hy/hår/frisyr/uttryck/accessoar med live-preview i `/profile/`
- [ ] **Unlockable avatars** — lås upp speciella delar via trophies (t.ex. platinum = exklusiv accessoar)
- [x] **Ready-made system** — utvärderat; vi byggde en egen procedurell SVG-motor i SDK:n i stället för DiceBear/ReadyPlayerMe (noll beroenden, funkar offline)
- [ ] **Visas överallt** — **Finns:** profil, portalens Leaderboards-hubb, Top Players på startsidan och alla 21 spels in-game leaderboards. Kvar: kommentarer och activity feed (finns inte än).
- [x] **Lagras i profiles-tabellen** — kompakt `gv1:`-sträng i befintliga `avatar_url` (ingen DB-migrering)

---

## SDK v2 — Smartare Login Nudge

Idag returnerar SDK:n tyst `Promise.resolve()` för gäster vid `leaderboard.submit()` och `achievements.unlock()`. Användaren fattar aldrig att de missar något. Idén: bygg in smartare nudging direkt i SDK:n så alla spel får det gratis utan kodändringar.

- [x] **Score nudge** — "You scored 1,234! Sign in to save it to the leaderboard" vid `leaderboard.submit()` för gäster
- [ ] **Visa rank** — "You'd be #7 worldwide!" för extra motivation
- [ ] **Trophy nudge** — "Trophy unlocked! Sign in to keep it forever" vid `achievements.unlock()`. **Finns:** nudge-komponenten; den anropas bara från `leaderboard.submit()`.
- [x] **Spara temporärt** — `pendingSubmission` + `flushPendingSubmission()` submittar automatiskt om man loggar in under samma session
- [x] **Max 1 per session** — `sessionStorage`-flaggan `gv_nudge_shown`
- [x] **Google OAuth** — `signInWithOAuth({ provider: 'google' })` i SDK:n
- [ ] **Progress bar** — "You have 5 unsaved trophies and 2 highscores" som en subtil reminder
- [ ] **Milestone nudge** — trigga vid speciella tillfällen: första game over, 10:e spelomgången, ny highscore

Allt byggs i `sdk/gamevolt.js` — noll ändringar i spelen. Se även `TODO-login-nudge.md`.

---

## Engagement & Retention
- [ ] **Daily challenges system** — **Finns:** `GameVolt.challenge`-API + `get_daily_leaderboard`, använt av One Stroke (daily/weekly) och Golden Glyphs. Kvar: ett *globalt* dagligt uppdrag över hela portalen.
- [ ] **Streak tracking** — **Finns:** `current_streak` / `longest_streak` i `profiles`-tabellen, men inget i UI:t visar dem. Kvar: visa på profilen + belöning.
- [ ] **Notifications** — "Your highscore on HoverDash was beaten by Player123!"
- [ ] **Weekly digest** — email med "din vecka på GameVolt" (kräver Supabase edge functions)

---

## Community

- [ ] **Ratings & reviews** — **Finns:** `GameVolt.rating`-API, stjärnsättning i spelaren och ett "Top Rated"-filter på startsidan som aggregerar snittbetyg. Kvar: visa snittbetyget på själva spelkortet, och recensionstext.
- [x] **Favorites** — hjärta-knapp + `/favorites/` ("My Games")
- [x] **Trending/Most Played** — "🔥 Trending"-filter på startsidan (sorterar på speltid från GVTracker; en serversidig `play_count` vore mer rättvis)
- [ ] **Player profiles** — publika profiler med trophies, top scores, favoriter
- [ ] **Friends/follow** — se vänners aktivitet och tävla mot dem

---

## Monetization

- [ ] **Rewarded ads** — frivilliga videoannonser för bonusliv/guld (ad-abstraktion redan i Golden Glyphs)
- [ ] **Premium cosmetics** — exklusiva skins/trails som bara finns via ads eller donation
- [ ] **Tip jar** — "Buy me a coffee"-integration

---

## Tech / Polish

- [ ] **Customize Supabase email template** — snygga upp magic link-mailet
- [x] **Google OAuth** — implementerat i SDK:n (se "SDK v2" ovan)
- [ ] **PWA improvements** — offline-stöd, install prompt, push notifications
- [ ] **Performance dashboard** — Grafana/analytics för speltid, retention, populäraste spel
- [ ] **A/B testing** — testa olika CTA:er, layouter, ordning på spel
- [ ] **Game submission portal** — låt andra devs submita spel till GameVolt

---

## Trophies & Toast Timing

Status från audit 2026-05-29 över alla 17 spel (15 har lokala trofésystem, 2 saknar helt).

### Lägg till saknade trofésystem
- [x] **Snake** — 31 troféer + leaderboard (2026-07-09), defs i `sql/snake-achievements.sql`
- [x] **Solitaire** — 31 gemensamma defs under spel-id `solitaire` (`sql/solitaire-achievements.sql`); leaderboarden migrerad till Supabase 2026-07-24

### Konvertera batched → live toasting
Spel där trofé-toasten i dag visas först vid game over fast den **kunde** poppa direkt när villkoret nås mitt i spelet:
- [ ] **HoverDash** — endless runner med långa sessioner; per-run-troféer (100m / 1000m / 5000m, "Coin Collector 100 in one game", "Near Miss King", "Shield Up" etc.) buntas i `Ending()` vid death. Flytta checken till respektive event (m-tröskel, coin/shield/magnet-pickup, near-miss).
- [ ] **Type or Die (Zombie mode)** — `recordRun()` är enda chokepoint. Per-run-mål som "boss-slayer", "kills-50", "combo-10", "wave-3" kan poppa direkt vid event. Speed Test kan stå kvar batched (15/30/60 s är kort).

### Acceptabelt batched (ingen åtgärd)
Rond-baserade spel där "game over" = puzzle/match clear, vilket *är* ögonblicket man tar troféen:
- **Sudoku** (puzzle win) · **Minesweeper** (board win) · **Connect 4** (match end) · **Manga Match** (stage clear)

### Redan Live (ingen åtgärd)
Chain Reaction, Asteroid Storm, Breakout, Golden Glyphs, One Stroke. *(Mixed: BlockStorm, Axeluga, Gravity Well, Tap Rush.)*
