# GameVolt — Ideas & Backlog

Ideer som inte är akuta men värda att bygga vidare på.

---

## Iframe / Game Player

Spelaren (`/play/index.html`) laddar spel i en iframe. PostMessage-bridgen skickar redan `game_start`, `game_over`, `high_score`, `achievement`, `level_complete` — men det finns mycket mer att göra med den datan.

- [ ] **Live trophy-toast i parent** — visa achievement-popups i game bar/sidebar istället för bara i spelet
- [ ] **Mini-leaderboard i sidebar** — top 5 i realtid medan man spelar
- [ ] **Achievement-progress i sidebar** — "12/31 trophies" med progress bar
- [ ] **Rate & Favorite** — stjärnbetyg + hjärta direkt i spelaren
- [ ] **Relaterade spel** — "Gillar du detta? Prova även..." under/bredvid spelaren
- [ ] **Screenshot/share** — ta screenshot av canvasen via postMessage, dela på sociala medier
- [ ] **Game stats live** — visa score/level/tid från spelet i game bar i realtid
- [ ] **Spectator-mode** — streama speldata via postMessage för en "watch live"-vy
- [ ] **Game-specifik info** — visa beskrivning, kontroller, tips i en expanderbar panel
- [ ] **Kommentarer/chat** — enkel kommentarsfunktion per spel (Supabase-tabell)

---

## Avatar System

Idé: låt användare skapa/anpassa sin avatar istället för default Gravatar/initialer.

- [ ] **Preset gallery** — välj bland färdiga avatarer (pixelart, emojis, teman)
- [ ] **Avatar builder** — bygg ihop ansikte/hår/ögon/mun-kombos (paper doll-stil)
- [ ] **Unlockable avatars** — lås upp speciella avatarer via trophies (t.ex. platinum i ett spel = exklusiv avatar)
- [ ] **Ready-made system** — utforska befintliga lösningar (DiceBear, Boring Avatars, ReadyPlayerMe)
- [ ] **Visas överallt** — leaderboard, profil, kommentarer, activity feed
- [ ] **Lagras i profiles-tabellen** — `avatar_url` eller `avatar_config` JSON

---

## SDK v2 — Smartare Login Nudge

Idag returnerar SDK:n tyst `Promise.resolve()` för gäster vid `leaderboard.submit()` och `achievements.unlock()`. Användaren fattar aldrig att de missar något. Idén: bygg in smartare nudging direkt i SDK:n så alla spel får det gratis utan kodändringar.

- [ ] **Score nudge** — "You scored 1,234! Sign in to save it to the leaderboard" popup vid `leaderboard.submit()` för gäster
- [ ] **Visa rank** — "You'd be #7 worldwide!" för extra motivation
- [ ] **Trophy nudge** — "Trophy unlocked! Sign in to keep it forever" vid `achievements.unlock()` för gäster
- [ ] **Spara temporärt** — håll score/trophies i minnet, submitta automatiskt om de loggar in under samma session
- [ ] **Max 1 per session** — sessionStorage-flagga så det inte spammar
- [ ] **Google OAuth** — ett klick istället för magic link, minskar friktion enormt
- [ ] **Progress bar** — "You have 5 unsaved trophies and 2 highscores" som en subtil reminder
- [ ] **Milestone nudge** — trigga vid speciella tillfällen: första game over, 10:e spelomgången, ny highscore

Allt byggs i `sdk/gamevolt.js` — noll ändringar i spelen. Se även `TODO-login-nudge.md`.

---

## Engagement & Retention
- [ ] **Daily challenges system** — globalt dagligt uppdrag som ger bonuspoäng
- [ ] **Streak tracking** — visa current/longest streak på profilen, belöna med guld/avatarer
- [ ] **Notifications** — "Your highscore on HoverDash was beaten by Player123!"
- [ ] **Weekly digest** — email med "din vecka på GameVolt" (kräver Supabase edge functions)

---

## Community

- [ ] **Ratings & reviews** — 1-5 stjärnor per spel, visa snittbetyg på kortet
- [ ] **Favorites** — hjärta-knapp, "My Games"-sida
- [ ] **Trending/Most Played** — sortering baserat på play_count
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
- [ ] **Google OAuth** — ett klick istället för email-flödet (minskar friktion)
- [ ] **PWA improvements** — offline-stöd, install prompt, push notifications
- [ ] **Performance dashboard** — Grafana/analytics för speltid, retention, populäraste spel
- [ ] **A/B testing** — testa olika CTA:er, layouter, ordning på spel
- [ ] **Game submission portal** — låt andra devs submita spel till GameVolt
