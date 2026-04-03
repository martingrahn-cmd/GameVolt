# NOW

## Fokus just nu

1. UX-polish på daglig challenge (mobil + desktop).
2. Överväga anonym auth för oinloggade spelare.

## Senast klart (2026-04-03)

- **Daily Challenge som primärt multiplayer-läge**: Ersatte seed/matchkod-setup med en clean lobby — 5 banor per dag, samma för alla, topplista.
- **Daglig topplista**: Supabase RPC (`get_daily_leaderboard`) visar bästa poäng per spelare.
- **Ett försök per dag** (förbered, avaktiverat under utveckling).
- **Login-widget i SDK**: Alla GameVolt-spel får diskret floating login-pill automatiskt. Döljs i iframe.
- **Iframe-stöd**: Challenge-param vidarebefordras genom GameVolt's `/play/` wrapper.
- **GameVolt SDK challenge-modul**: create, get, submit, list, onResult, getDailyLeaderboard.
- **PWA**: Service worker, offline-stöd, installérbar app.
- **Resultatjämförelse**: Cloud-baserad jämförelse vid 1v1-challenges (realtime).

## Nästa steg

- Streak-tracker (dagar i rad man spelat daily).
- Topplista-varianter: flest vinster, månadens bästa, snabbaste snittid.
- Web Share API för iOS share sheet.
- Anonym auth (Supabase) så oinloggade syns på topplistan med genererat handle.

## Parkerat

- Icke-rektangulära banformer (T, L, kors).
- Waypoints / envägspilar.
- Ljud & haptics.
- Puzzle editor.
- Release-rutin och CI.
