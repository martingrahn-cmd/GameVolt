# NOW

## Fokus just nu

1. Bygga om multiplayer-vyn till Daily Challenge som primärt läge.
2. Topplista och statistik kring daily challenges.

## Senast klart (2026-04-01)

- **GameVolt SDK-integration**: Supabase-backade challenges, cloud save, login-widget.
- **Async multiplayer**: Skapa challenge → dela länk → motståndare spelar → resultatjämförelse (realtime).
- **Iframe-stöd**: Spelet fungerar i GameVolt's /play/ wrapper med challenge-param forwarding.
- **PWA**: Service worker, offline-stöd, installérbar app.
- **Login-widget**: Diskret floating pill i SDK:t (alla spel får den gratis).

## Nästa steg: Daily Challenge redesign

### Problemet
- Multiplayer-knappen startar spelet direkt på mobil innan man hunnit välja
- "Utmana en vän" skapar massor av orphan-challenges som ingen joinar
- För många val: daily / utmana vän / matchkod / seed — rörigt

### Lösning
Ersätt nuvarande multiplayer-vy med **en enda ingång: Daglig Challenge**:

- **5 fasta banor per dag**, samma seed för alla (`daily-YYYY-MM-DD`)
- **Spela → se resultat → jämför med alla** den dagen
- Ingen seed-hantering, inget att dela manuellt

### Topplista-idéer
- Dagens resultat (alla som spelat idag, sorterat på poäng)
- Flest vinster (mest 1:a-platser totalt)
- Längsta streak (dagar i rad man spelat)
- Snabbaste snittid
- Månadens bästa

### "Utmana en vän"
Finns kvar som sekundär feature men inte i fokus. Kan gömmas bakom en "Mer"-knapp.

## Övrigt att fixa

- Dropdown (3/5/10 banor) behöver tydligare visuell indikator
- Web Share API för iOS share sheet
- Synka One Stroke-repot (GameVolt-kopian är source of truth just nu)

## Parkerat

- Icke-rektangulära banformer
- Waypoints / envägspilar
- Release-rutin och CI
