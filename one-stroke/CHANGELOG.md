# Changelog

Alla noterbara ändringar i projektet.

## [2026-04-03]

### Added
- **Daily Challenge**: Nytt primärt multiplayer-läge. 5 banor per dag, samma seed för alla.
- **Daglig topplista**: Supabase-backad leaderboard med bästa poäng per spelare per dag.
- **GameVolt SDK integration**: Auth, cloud save, achievements, leaderboards och ny challenge-modul.
- **Login-widget**: Diskret floating pill i SDK:t — alla spel får den automatiskt. Döljs i iframe.
- **Iframe-stöd**: Spelet fungerar i GameVolt's `/play/` wrapper med challenge-param forwarding.
- **PWA**: Service worker, manifest, offline-stöd, installérbar på hemskärmen.
- **Cloud challenge-system**: Skapa challenge → dela UUID-länk → motståndaren spelar → resultatjämförelse.
- **Realtime resultat**: Supabase Realtime notifierar när motståndaren spelat klart (1v1).

### Changed
- Multiplayer-vyn ersatt med clean Daily Challenge lobby (bort med seed-fält, matchkod, dropdown).
- "Multiplayer"-tab omdöpt till "Daglig".
- Mobil: tab-meny stänger inte panelen vid "Daglig" — visar lobbyn först.
- Challenge-länk genereras som URL (`?challenge=UUID`) istället för Base64-matchkod.
- Topplistan visar riktiga användarnamn (inte "Du").

### Fixed
- Timer startar inte förrän spelaren trycker "Redo".
- Upsert-stöd för challenge_runs (UPDATE RLS-policy).

## [2026-03-28]

### Added
- **Fixed endpoint mode**: 105/200 banor har fast slutpunkt (guld "E").
- **Inside-out path-profil**: centrumstart, straffar perimeter-hogging.
- Hint-system v1 med hint-knapp och tangentbordsstöd (H).
- Komplett level select med sök, svårighetsfilter och statusfilter.
- Drag-back undo med lokal straff-feedback (+2,5s).
- Challenge-run historik (senaste 20 runs).
- Trophy-system: 31 achievements i 4 tiers.
- Global high-score statistik per svårighetsgrad.
- Detaljerad run-resultatvy med PB-jämförelse.
- Standardiserat challenge-summary schema v1.

### Changed
- Ny huvudmeny med Single-player, Multiplayer, High-score, Achievement, Credit.
- Challenge-score tar hänsyn till hints, undo och reset.
- Fail/reset-feedback visar progress.

### Refactored
- Level format v2 → v3 (endMode + end coordinate).
- Bröt ut `trophies.js` och `formatting.js` från app.js.

## [2026-03-19]

### Added
- Modulär kodstruktur i `src/` med core, data och game.
- Kampanj med 200 banor i 4 svårighetsband.
- Seedad Challenge Mix (3/5/10 banor).
- Challenge-resultatvy med splits och export.

### Changed
- Visuell riktning: Circuit Atelier.
- Progression rebalanserad (nivå 3–4).

### Fixed
- Nivå 4 verifierad lösningsbar.
