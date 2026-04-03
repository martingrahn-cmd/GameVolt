# TODO

## Klart

- [x] Hint-system v1 (rekommenderad nod + visuell markering + hint-straff).
- [x] Resultatvy per challenge-run (splits, totalpoäng, export).
- [x] Komplett level select med sök, filter och direktnavigering.
- [x] Drag-back undo med lokal straff-feedback (+2,5s).
- [x] Trophy-system: 15 brons, 10 silver, 5 guld, 1 platinum.
- [x] High-score-vy med global statistik och run-detaljer.
- [x] QA-pass över 200 banor, alla validerade.
- [x] Fixed endpoint mode (105/200 banor).
- [x] Inside-out path-profil.
- [x] GameVolt SDK-integration (auth, save, achievements, leaderboards).
- [x] Async multiplayer med Supabase-backade challenges.
- [x] Daily Challenge som primärt multiplayer-läge med topplista.
- [x] PWA med offline-stöd.
- [x] Login-widget i SDK (alla spel).
- [x] Iframe-stöd i GameVolt /play/ wrapper.
- [x] Mobilanpassad layout med inline-panel.

## Att göra

### UX & polish
- [ ] Streak-tracker: visa dagar i rad spelaren klarat daily.
- [ ] Web Share API: dela-knapp som triggar iOS/Android share sheet.
- [ ] Bättre onboarding för nya spelare (tutorial-flow).

### Topplista & statistik
- [ ] Flest vinster (mest 1:a-platser totalt).
- [ ] Längsta streak.
- [ ] Månadens bästa.
- [ ] Snabbaste snittid.

### Backend
- [ ] Anonym Supabase-auth så oinloggade syns på topplistan.
- [ ] Anti-fusk plausibility checks server-side.

### Gameplay-variation
- [ ] Icke-rektangulära spelplaner (T-form, L-form).
- [ ] Kantblockeringar.
- [ ] Obligatoriska waypoints.
- [ ] Envägspilar.

### Drift
- [ ] Release-rutin (tag + changelog).
- [ ] CI smoke-test för level-integrity.
