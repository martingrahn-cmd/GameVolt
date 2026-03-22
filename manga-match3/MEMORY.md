# Manga Match-3 - Förbättringsplan

## Prioriterade förbättringar

| Prio | Förbättring | Påverkan | Status |
|------|------------|----------|--------|
| 1 | Ljud & musik | Enorm - spelet känns "dött" utan | Klar (SFX via Web Audio, musik skippas) |
| 2 | Hint-system | Hög - förhindrar frustration | Klar |
| 3 | Tutorial / Onboarding | Hög - onboarding av nya spelare | Klar |
| 4 | Stjärn-system + nivåväljare | Hög - ger motivation att spela om | Klar (30 nivåer, level picker, stjärnor) |
| 5 | Swipe-stöd (mobil) | Hög - standard för match-3 | Klar |
| 6 | Victory/Game over polish | Medium - bättre closure per nivå | Klar |
| 7 | Power-ups & Shop | Medium - djupare gameplay | Klar (Konbini-butik, mynt, power-ups) |
| 8 | Koduppdelning i moduler | Medium - developer experience | Ej påbörjad |
| 9 | Undo-funktion | Medium - quality of life | Ej påbörjad |
| 10 | Canvas-rendering | Låg - prestanda fixad via CSS-optimering | Ej påbörjad |

---

## 1. Ljud & Musik ✅
- ~~SFX: swap, match, cascade, special piece, fever activation, level complete, game over~~ → 16 syntetiserade ljud via Web Audio API
- ~~Volymkontroller i UI~~ → Volymslider + mute i Options
- Bakgrundsmusik — medvetet skippat, genererad musik låter inte bra nog

## 2. Hint-system ✅
- ~~Om spelaren är inaktiv 5+ sekunder → visa subtil animation på ett giltigt drag~~ → 12s idle-timer, glow + bounce på giltigt drag
- ~~"Inga drag kvar"-detektion → automatisk omflyttning av brädet~~ → fanns redan via shuffleBoard
- ~~Hint rensas vid klick/swipe, ny timer startas efter varje drag~~ → implementerat

## 3. Tutorial / Onboarding ✅
- ~~Interaktiv tutorial på nivå 1 med overlay-pilar och textbubblor~~ → 7-stegs tutorial med spotlight + manga-bubbla
- ~~Stegvis introduktion av mekaniker~~ → Matcha → Mål → Poäng/Drag → Fever → Special-brickor → Stjärnor
- Manga-panel-stil med pratbubbla (tail pekar på target)
- Visas bara första gången (localStorage), "Hoppa över"-knapp
- Blockerar input under tutorial, hint-timer pausas

## 4. Stjärn-system + Nivåväljare ✅
- ~~1-3 stjärnor per nivå baserat på poäng/drag kvar~~ → Implementerat i result-overlay
- ~~Persistent progression~~ → Bästa poäng sparas i localStorage
- ~~Nivåväljare~~ → Level picker med 30 nivåer, unlock-system, stjärnor per nivå
- Upplåsbara karaktärer eller skins som belöning — sparas till efter launch

## 5. Swipe-stöd (mobil)
- Touch/swipe för att byta brickor (inte bara tap-tap)
- Haptic feedback via Vibration API
- Fullscreen-läge på mobil
- Testa layout på små skärmar

## 6. Victory/Game Over Polish ✅
- ~~Tydligare feedback med poängsammanfattning~~ → Result overlay med poäng och drag använda
- ~~Visa stjärnor, bästa poäng, jämförelse med tidigare försök~~ → 1-3 stjärnor baserat på drag kvar, bästa poäng sparas i localStorage
- ~~"Försök igen" vs "Nästa nivå" knappar~~ → Implementerat i overlayt
- ~~Victory-animation~~ → Confetti-animation med 40 partiklar + stjärn-pop-animation
- ~~Game over-animation~~ → Shake-effekt på result-card + tomma gråa stjärnor

## 7. Power-ups & Shop ✅
- ~~Hammare, Shuffle, Extra drag, Färgbomb~~ → Konbini-butik med mynt-system
- ~~Valuta tjänas genom spel~~ → Mynt visas i HUD, tjänas per rensad bricka + bonusar
- Pre-level prep screen med power-up-val

## 8. Koduppdelning
- `board.js` - brädlogik, match-detection, gravity
- `render.js` - DOM-rendering, animationer
- `levels.js` - nivådata och progression
- `audio.js` - ljudhantering
- `daily.js` - daily challenge-logik
- `state.js` - game state management
- Använd ES modules (import/export)

## 9. Undo-funktion
- Ångra senaste draget (1 gång per tur eller begränsat antal)
- Minskar frustration utan att ta bort utmaningen

## 10. Canvas-rendering
- Canvas istället för DOM för brädet (60fps garanterat)
- OffscreenCanvas för partikeleffekter
- Object pooling för partiklar och animationer
- RequestAnimationFrame-throttling för input

## Övriga förbättringar
- Tangentbordsnavigering (piltangenter + enter)
- Färgblindhetsläge
- Reducerad rörelse-läge (prefers-reduced-motion)
- Multiplayer / leaderboard
- Cloud save
