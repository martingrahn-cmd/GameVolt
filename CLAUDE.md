# CLAUDE.md

> Claude Code: Read GAMEVOLT.md in this repo root before doing any work. It contains the full project specification, tech stack, conventions, SDK design, and database schema.

## Quick Context

This is **GameVolt.io** — a curated HTML5 game portal with original games built by Martin. The site was rebranded from **pulsegames.eu** in 2026, and that domain is still ours: EURid WHOIS on 2026-10-22 shows it Registered through Loopia, registrant martin.grahn@gmail.com, on Cloudflare nameservers, with a renewal notice arriving the same day. An earlier version of this file said it had expired in 2026-09 and belonged to someone else. That was wrong, and it was quoted back as fact more than once before anyone checked the registry — so check WHOIS before repeating any claim about who owns it.

It redirects to gamevolt.io, but with an HTML page rather than a 301. Every visitor arriving that way therefore loses their original source and lands in GA4 as a referral from pulsegames.eu: 62 of the 94 new users on 2026-10-19, averaging two seconds. Treat referral traffic from our own old domain as unattributed, not as discovery, until that redirect becomes a 301 at the Cloudflare level.

**Game count: 27 live portal games**. The GAMEVOLT.md catalog has 28 rows but #7 Flappy Bird is the 404 easter egg, not a portal game. See the note under "Game Catalog" in GAMEVOLT.md before quoting or changing any game count.

## Rules

- Vanilla JS / ES6 only. No TypeScript, no React, no bundlers.
- Games are single-file HTML (HTML + CSS + JS in one file)
- All SDK usage must be optional: always wrap in `if (window.GameVolt)`
- localStorage is the fallback for everything when user is not logged in
- Backend is Supabase (PostgreSQL + Auth)
- A signed-in-only RPC needs `REVOKE EXECUTE ... FROM PUBLIC, anon` before the
  `GRANT` — Supabase grants anon by name, so granting to `authenticated` alone
  changes nothing. Verify with `pg_proc.proacl`, not by calling it. See
  GAMEVOLT.md → "Writing a SECURITY DEFINER function".
- Hosting is GitHub Pages — no server-side rendering
- Mobile-first, touch support required

## Current Priority

1. SDK rollout: done for all games — Solitaire leaderboard migrated off legacy Firebase to Supabase (2026-07-24). No games remain on Firebase.
2. Daily challenges — the play streak shipped 2026-07-28 (`GameVolt.streak`,
   `sql/streaks.sql`); per-game dailies are the part still missing
3. Ratings, favorites, community features

**Portal submissions — mostly settled, don't re-propose as a next step.**
CrazyGames rejected four games as of 2026-07: HoverDash, Golden Glyphs,
Breakout: Neon Drift and Tap Rush: Reflex. Only SpinBurn is still open there,
sitting at "Awaiting review — pending build/art update", i.e. the ball is with
us, not them. The standalone builds stay regardless; they're what any future
submission uses.

## File Structure

See GAMEVOLT.md for full structure. Key paths:
- `/sdk/gamevolt.js` — The SDK
- `/games/{game-name}/` — Each game in its own folder
- `/games/{game-name}/index.html` — GameVolt version (with SDK)
- `/games/{game-name}/index-standalone.html` — Clean version for Poki/CrazyGames

## Don't

- Don't add npm dependencies to games
- Don't assume GameVolt SDK is loaded (always check `window.GameVolt`)
- Don't use TypeScript
- Don't create separate CSS/JS files for games (keep single-file)
- Don't break mobile/touch support
