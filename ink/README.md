# INK ✒️

A vertical endless game — a mix of Breakout and pinball where you **draw the flipper with your finger**.
The ball bounces once off each stroke, then it's spent. The ink in the margin decides how much you can
draw. Climb, chain combos, chase points.

Everything in **a single HTML file**: physics, procedural level generation, synthesized sound effects and
generative music (Web Audio, zero assets), rendered on canvas in a squared-paper, ballpoint-pen aesthetic.

## Play

Open `index.html` in a mobile browser (built for portrait + touch, works with a mouse).

- **Draw strokes** — the ball bounces, the stroke is spent
- **Ink** in the left margin is your resource; ink blots and broken blocks refill it
- **Red kills** — spikes are game over
- **Combo**: everything the ball hits without a new stroke is worth more
- Time slows down while you draw

## Modes

- **Free climb** — endless, with checkpoints every 100 m and something new unlocked on every level up to 10
- **Daily challenge** — a course seeded from today's date (same for everyone), 500 m to the finish line,
  one daily rule (e.g. *Dry ink*, *Windy*), streak counter and a Wordle-style shareable result

Records, checkpoints and streak persist in `localStorage`.

## Trophies

31 trophies on the GameVolt ladder — 15 bronze, 10 silver, 5 gold and one platinum for
the other 30. They live on a collection page reachable from both the start screen and the
game over screen, and every unlock drops a stamped paper slip in at the top of the sheet.

On GameVolt.io they also follow the account: the game calls `GameVolt.achievements.unlock()`
when the SDK is there, back-fills trophies earned on another device at login, and registers
the localStorage → cloud migration. Without the SDK — standalone, or on another portal —
everything still works straight out of `localStorage`.

`../sql/ink-achievements.sql` holds the matching 31 `achievement_defs` rows for the portal database.

## Install

The game is a PWA. On the phone, open it and pick *Add to home screen* — it then runs
fullscreen in portrait with no browser chrome, and works offline.

Updates need nothing but a push: the service worker fetches the page network-first, so a
reload always lands on the newest version while online, and the cache is only the offline
copy. When a new version has already been downloaded in the installed app, an **Update**
button appears on the start and game over screens — it never swaps versions mid-run.
Bump `VERSION` in `sw.js` when a file under `assets/` changes.

## Development

The in-game tuning button exposes live physics values (gravity, kick, bounce, ink, slow-mo).

Headless test of the full game loop (load, start, drawing, daily, pause, trophies) against
strict DOM/Canvas/WebAudio stubs:

```bash
./tests/run.sh
```

## Status

Playable prototype in active development for [GameVolt.io](https://gamevolt.io).

## GameVolt import

Imported 2026-09-06 from https://github.com/martingrahn-cmd/Black at
`e5ceaf63fc882063b34b7c9d8326c28fb81ea9cf`. The source calls the game INK
and already uses the SDK game id `ink`; keep the existing `black:` save keys.
Portal additions: optional SDK and shared analytics, launch/end bridge events,
standalone SEO, scoped PWA caching, responsive menus and generated hero art.

`../sql/ink-achievements.sql` was applied to the GameVolt production database
on 2026-09-06. Verified the game row, all 31 trophy definitions (15 bronze,
10 silver, 5 gold, 1 platinum), and successful reads of both `free` and
`daily-streak` leaderboards. The seed is safe to re-run. Guest play works
without the database.
Hero prompt: `../assets/art-prompts/ink-hero.md`.
