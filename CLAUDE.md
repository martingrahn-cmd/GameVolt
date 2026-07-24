# CLAUDE.md

> Claude Code: Read GAMEVOLT.md in this repo root before doing any work. It contains the full project specification, tech stack, conventions, SDK design, and database schema.

## Quick Context

This is **GameVolt.io** (rebranded from PulseGames.eu) — a curated HTML5 game portal with original games built by Martin.

**Game count: 21 live portal games** (not 20, not 22). The GAMEVOLT.md catalog has 22 rows but #7 Flappy Bird is the 404 easter egg, not a portal game. See the note under "Game Catalog" in GAMEVOLT.md before quoting or changing any game count.

## Rules

- Vanilla JS / ES6 only. No TypeScript, no React, no bundlers.
- Games are single-file HTML (HTML + CSS + JS in one file)
- All SDK usage must be optional: always wrap in `if (window.GameVolt)`
- localStorage is the fallback for everything when user is not logged in
- Backend is Supabase (PostgreSQL + Auth)
- Hosting is GitHub Pages — no server-side rendering
- Mobile-first, touch support required

## Current Priority

1. SDK rollout: done for all games — only the Solitaire leaderboard remains on legacy Firebase (migrate to Supabase)
2. Submit HoverDash to Poki / CrazyGames
3. Daily challenges & streak tracking
4. Ratings, favorites, community features

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
