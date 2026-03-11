# Login Nudge — "Save Your Score" Popup

## Problem
1000+ besökare men nästan ingen loggar in. Poäng försvinner tyst för gäster.

## Lösning (SDK-only, inga ändringar i spelen)

Ändra `sdk/gamevolt.js` → `leaderboard.submit()` (rad 347-348).

Istället för att tyst returnera `Promise.resolve()` för gäster:
1. Spara poängen temporärt i minnet
2. Visa en snygg popup: *"You scored 1,234! Sign in to save it to the leaderboard"*
3. Om användaren loggar in → submitta den sparade poängen automatiskt
4. Om användaren stänger → inget händer, ingen irritation

## Detaljer

- Popupen byggs i SDK:n (som login-modalen redan gör) — ingen spelkod behöver ändras
- Alla spel som redan anropar `GameVolt.leaderboard.submit(score)` får funktionen gratis
- Visa max 1 gång per session (sessionStorage) så det inte blir spam
- Bonus: visa vilken rank de hade fått — "You'd be #7 worldwide!"

## Friktion med magic link

Överväg att lägga till Google OAuth i Supabase — ett klick istället för email-flödet.

## Filer att ändra
- `sdk/gamevolt.js` — leaderboard.submit() + ny popup-funktion
