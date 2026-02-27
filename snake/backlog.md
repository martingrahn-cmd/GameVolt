# Snake-spelet (3 lägen) - Backlog

**Senast uppdaterad:** 2025-12-29

---

## Namnförslag (behöver bestämmas)
- Snake Neo
- Snake Triple
- Snake Remix
- Snake 3-in-1
- ???

---

## 🔴 Buggar

| # | Beskrivning | Läge | Prioritet | Status |
|---|-------------|------|-----------|--------|
| - | Inga kända just nu | - | - | - |

---

## 🟡 Saknas (viktigt för portaler)

| # | Beskrivning | Läge | Prioritet | Status |
|---|-------------|------|-----------|--------|
| 1 | Ljud av/på i spelet (ej bara paus) | 16-bit | 🔴 Hög | TODO |
| 2 | Ljud av/på i spelet | Nokia 3310 | 🔴 Hög | TODO |
| 3 | Click-ljud på knappar/menyer | Alla | 🟡 Medel | Delvis (kod finns, ej implementerat överallt) |

---

## 🟢 Nice-to-have (polish)

| # | Beskrivning | Läge | Prioritet | Status |
|---|-------------|------|-----------|--------|
| 4 | Nokia ringsignal (Gran Vals 8-bit) | Nokia 3310 | 🟢 Låg | Generator klar, WAV ej skapad |
| 5 | Testa mobile touch | Alla | 🟡 Medel | TODO |
| 6 | Preload-skärm/loading | Alla | 🟢 Låg | TODO |

---

## 🔵 Framtida (för portal-godkännande)

| # | Beskrivning | Läge | Prioritet | Status |
|---|-------------|------|-----------|--------|
| 7 | SDK-integration (Poki/CrazyGames) | Alla | Väntar på svar | TODO |
| 8 | Levels/progression | 16-bit | Idé | Koncept diskuterat |
| 9 | Daily challenge | 16-bit | Idé | TODO |
| 10 | Achievements/unlocks | Alla | Idé | TODO |

---

## ✅ Klart (denna session)

| # | Beskrivning | Läge | Datum |
|---|-------------|------|-------|
| ✓ | Wraparound spök-fix (spline) | 16-bit | 2025-12-29 |
| ✓ | Musik startar efter tutorial | 16-bit | 2025-12-29 |
| ✓ | CRT scanlines optimering (performance) | 16-bit | 2025-12-29 |
| ✓ | Highscore-lista med scrollning & medaljer | Alla | 2025-12-29 |
| ✓ | impact() audio alias fix | Alla | 2025-12-29 |

---

## Anteckningar

### Portalstatus
- **Poki:** Ej inskickad. SDK efter godkännande.
- **CrazyGames:** Ej inskickad. SDK efter godkännande.
- **GameDistribution:** Sa nej till Breakout (för generiskt). Troligen samma svar för snake.

### Juridiskt
- "Snake" som ord: ✅ OK (generiskt)
- "Nokia": ❌ Varumärke, undvik
- "3310" ensamt: 🟡 Gråzon, troligen OK
- Gran Vals (ringsignal): ✅ Public domain (1902)

### Länkar
- PulseGames portal: pulsegames.eu (separat tråd)
- Breakout: itch.io (klar)
- Click Rush: itch.io (klar)