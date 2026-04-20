# GAMEVOLT.md — Project Specification & Development Guide

> **This document is the single source of truth for the GameVolt.io project.**
> Any AI assistant (Claude Code, Claude Chat, etc.) should read this file before making changes to the project. If you are Claude, follow the conventions and patterns described here.

---

## Project Overview

**GameVolt.io** is a curated HTML5 game portal featuring original games built by Martin (SmartProc Consulting AB). It is being rebranded from PulseGames.eu.

**Martin's role:** Creative director, game designer, solo developer. Uses AI (Claude) for implementation. Has a full-time procurement job, so development time is limited — efficiency matters.

**Core principle:** "Play free. Log in for more." All games work without an account. Logged-in users get cloud saves, leaderboards, achievements, and a profile.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend / Hosting | GitHub Pages | Free, deploy via git push |
| Domain | GameVolt.io | Currently at One.com, may transfer to Cloudflare |
| Auth & Database | Supabase (free tier) | PostgreSQL, Auth, auto-generated API |
| Games | Vanilla JS / ES6 / Phaser 3 | Single-file HTML games |
| Game engine | Phaser 3 (some games), vanilla Canvas (others) | No build step, no bundler |
| Deployment | Git push → GitHub Pages | Automatic |
| Previous name | PulseGames.eu | Being rebranded to GameVolt.io |

---

## Code Conventions

When writing code for this project, follow these rules:

- **Vanilla JS / ES6** — No TypeScript, no React, no build tools
- **Single-file games** — Each game is one self-contained HTML file (HTML + CSS + JS)
- **No npm/bundler in games** — Games must run as-is in a browser, no build step
- **Supabase via CDN** — Load Supabase client from CDN, not npm
- **English in code** — Variable names, comments, and function names in English
- **Swedish OK in UI** — Game UI text can be English (preferred for portal submissions)
- **localStorage as fallback** — Always works without network/auth
- **Graceful degradation** — Everything must work without the GameVolt SDK loaded
- **Mobile-first** — All games must work on touch devices

---

## Game Catalog

Status legend: ✅ = init + leaderboard + achievements + registerMigration, ⚠️ = partial, ❌ = not yet.
Last verified by auditing the code on 2026-04-17.

| # | Game | Status | SDK |
|---|---|---|---|
| 1 | Breakout | ✅ Live | ✅ Full |
| 2 | TapRush | ✅ Live | ✅ Full (31 trophies, added 2026-04-17) |
| 3 | BlockStorm (Tetris) | ✅ Live | ✅ Full |
| 4 | Solitaire Collection | ✅ Live | ⚠️ init only on some variants; no leaderboard / achievements / migration |
| 5 | Snake Neo (3 modes) | ✅ Live | ❌ Not yet |
| 6 | Connect 4 | ✅ Live | ✅ Full |
| 7 | Flappy Bird (404 page) | ✅ Live | ❌ Not yet (not planned) |
| 8 | HoverDash | ✅ Live | ✅ Full (pilot) |
| 9 | Axeluga | ✅ Live | ✅ Full |
| 10 | Gravity Well | ✅ Live | ✅ Full |
| 11 | Sudoku | ✅ Live | ✅ Full |
| 12 | Manga Match | ✅ Live | ✅ Full (registerMigration added 2026-04-17) |
| 13 | Golden Glyphs | ✅ Live | ✅ Full |
| 14 | One Stroke | ✅ Live | ✅ Full |

**Remaining work:** SDK rollout to Snake; full integration (leaderboard + achievements + migration) for the Solitaire variants.

---

## GameVolt SDK

The SDK is a lightweight JavaScript library that every game on GameVolt.io includes. It handles auth, cloud saves, leaderboards, and achievements.

### Critical Design Rule: Optional by default

The SDK must NEVER be required for a game to function. Games are also submitted to Poki, CrazyGames, and other portals where the SDK does not exist. Therefore:

```javascript
// ✅ CORRECT — Always check if SDK exists
function onGameOver(score) {
  showGameOverScreen(score);
  
  if (window.GameVolt) {
    GameVolt.leaderboard.submit(score);
    GameVolt.save.set({ highscore: score });
    if (score > 10000) GameVolt.achievements.unlock('speed-demon');
  }
}

// ❌ WRONG — Never assume SDK is loaded
function onGameOver(score) {
  GameVolt.leaderboard.submit(score);  // Crashes on Poki/CrazyGames
}
```

### How different platforms work — ONE codebase

```
GameVolt.io     →  loads gamevolt-sdk.js  →  cloud saves, leaderboards, achievements
Poki            →  loads poki-sdk.js      →  Poki monetization (if accepted)
CrazyGames      →  loads crazygames-sdk.js →  CrazyGames monetization (if accepted)
Standalone      →  no SDK loaded          →  localStorage only, still fully playable
```

Each platform gets its own index.html that includes different scripts. The game code itself is identical.

### SDK API Reference

#### Phase 1 — Auth & Cloud Save

```javascript
// Initialize — call once on game load
GameVolt.init('hoverdash');  // Game ID (slug)

// Auth
GameVolt.auth.login()              // Opens login modal
GameVolt.auth.logout()
GameVolt.auth.getUser()            // Returns { id, username, avatar_url } or null
GameVolt.auth.onStateChange(fn)    // Callback when login state changes

// Cloud Save (auto-fallback to localStorage for guests)
await GameVolt.save.set(data)      // Save JSON blob for current game
await GameVolt.save.get()          // Load save for current game
await GameVolt.save.migrate()      // Migrate localStorage → cloud (on first login)
```

#### Phase 2 — Leaderboards

```javascript
// Submit score (no-op for guests)
GameVolt.leaderboard.submit(score, { mode: 'default' })

// Get leaderboard
await GameVolt.leaderboard.get({ 
  mode: 'default',        // game mode
  period: 'weekly',       // 'weekly' | 'alltime'
  limit: 50 
})

// Get current user's rank
await GameVolt.leaderboard.getRank({ mode: 'default' })
```

#### Phase 3 — Achievements & Daily Challenges

```javascript
// Unlock achievement (stored locally for guests, synced on login)
GameVolt.achievements.unlock('hoverdash-wave-10')

// Get all achievements for current game
await GameVolt.achievements.getAll()

// Get all achievements across all games (for profile)
await GameVolt.achievements.getProfile()

// Daily challenge
await GameVolt.daily.getChallenge()    // Today's challenge
await GameVolt.daily.complete()        // Mark completed

// Streaks
await GameVolt.streaks.get()           // { current: 5, longest: 12 }
```

#### Phase 4 — Ratings & Ads

```javascript
GameVolt.rating.submit(4)              // 1-5 stars
GameVolt.favorites.toggle()            // Add/remove from favorites
GameVolt.ads.showRewarded(callback)    // Optional rewarded video ad
```

### Behavior: Guest vs Logged-in

| SDK Method | Guest (no account) | Logged in |
|---|---|---|
| `save.set()` | localStorage | Supabase |
| `save.get()` | localStorage | Supabase |
| `leaderboard.submit()` | Silently ignored | Submits to global board |
| `achievements.unlock()` | Stored in localStorage | Saved to Supabase |
| `auth.login()` | Opens login modal | No-op |

When a guest creates an account, `save.migrate()` copies localStorage data to the cloud.

---

## Achievement System

Each game defines its own achievements. There are also global GameVolt achievements.

### Standard tier structure (per game)

Every game follows the same tier system with **31 achievements**:

| Tier | Count | Color | Difficulty | Examples |
|------|-------|-------|------------|----------|
| Bronze | 15 | 🥉 | Natural gameplay, beginner goals | "Play your first game", "Score 1,000 points" |
| Silver | 10 | 🥈 | Requires skill/dedication | "Clear 50 levels", "Win 10 games in a row" |
| Gold | 5 | 🥇 | Hard, hardcore players only | "Perfect score on a level", "Beat the game on hard" |
| Platinum | 1 | 💎 | Unlock all 30 other achievements | Always: "{Game} Master" |

**Design guidelines:**
- Bronze should unlock through normal play — players get a few per session
- Silver requires intentional effort — most players earn some over time
- Gold is aspirational — only dedicated players get these
- Platinum is the completionist reward — automatically unlocks when all others are done
- Achievement IDs follow: `{game-slug}-{achievement-id}` (e.g. `breakout-first-clear`)

### Defining achievements for a game

When adding achievements to a game, define them in the game's section of the database:

```javascript
// These are registered in Supabase, not in game code
// Game code only calls: GameVolt.achievements.unlock('achievement-id')

// Achievement definition format:
// {game}-{id}    "Name"    Description    tier: bronze|silver|gold|platinum
```

### In-game achievement toast

Each game keeps its own visual toast notification. The existing toast system (like in Connect 4 and HoverDash) stays — the SDK just handles persistence. The toast should show the tier color/icon to make bronze/silver/gold feel different.

### Profile display structure

```
🏆 Player Profile — 42/248 achievements (17%)
│
├── 🏎️ HoverDash — 18/31
│   ├── 💎 Platinum: 0/1
│   ├── 🥇 Gold: 2/5
│   ├── 🥈 Silver: 6/10
│   └── 🥉 Bronze: 10/15
│
├── 🧱 Breakout — 12/31
│   ├── 💎 Platinum: 0/1
│   ├── 🥇 Gold: 0/5
│   ├── 🥈 Silver: 3/10
│   └── 🥉 Bronze: 9/15
│
├── 🌐 GameVolt Global — 5/31
│   └── ...
│
└── 📊 Total: 42/248 (17%)
    🥉 34 Bronze  🥈 6 Silver  🥇 2 Gold  💎 0 Platinum
```

---

## Database Schema (Supabase / PostgreSQL)

Run this SQL in Supabase SQL Editor to set up the database:

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    total_play_time_seconds INT DEFAULT 0
);

-- Games registry
CREATE TABLE games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    play_count INT DEFAULT 0
);

-- Cloud saves
CREATE TABLE saves (
    user_id UUID REFERENCES profiles(id),
    game_id TEXT REFERENCES games(id),
    save_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
);

-- Highscores
CREATE TABLE scores (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    game_id TEXT REFERENCES games(id),
    mode TEXT DEFAULT 'default',
    score INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievement definitions
CREATE TABLE achievement_defs (
    id TEXT PRIMARY KEY,
    game_id TEXT REFERENCES games(id),  -- NULL for global achievements
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    sort_order INT DEFAULT 0
);

-- User achievements
CREATE TABLE user_achievements (
    user_id UUID REFERENCES profiles(id),
    achievement_id TEXT REFERENCES achievement_defs(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

-- Daily challenges
CREATE TABLE daily_challenges (
    date DATE PRIMARY KEY,
    game_id TEXT REFERENCES games(id),
    challenge_type TEXT NOT NULL,
    target_value INT NOT NULL,
    description TEXT NOT NULL
);

-- Daily challenge completions
CREATE TABLE daily_completions (
    user_id UUID REFERENCES profiles(id),
    date DATE REFERENCES daily_challenges(date),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, date)
);

-- Game ratings
CREATE TABLE ratings (
    user_id UUID REFERENCES profiles(id),
    game_id TEXT REFERENCES games(id),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    PRIMARY KEY (user_id, game_id)
);

-- Favorites
CREATE TABLE favorites (
    user_id UUID REFERENCES profiles(id),
    game_id TEXT REFERENCES games(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
);

-- Indexes
CREATE INDEX idx_scores_game_mode ON scores(game_id, mode, score DESC);
CREATE INDEX idx_scores_user ON scores(user_id);
CREATE INDEX idx_achievements_user ON user_achievements(user_id);
```

---

## Rollout Phases

### Phase 1 — Foundation (MVP) ✅
Spec, rebranding, Supabase, SDK v1, HoverDash pilot — all done.
- [x] Upload Golden Glyphs to portal

### Phase 2 — Engagement (in progress)
SDK + leaderboards + profile page done. Breakout & Connect 4 integrated.
- [ ] Roll out SDK to remaining games (TapRush, Snake; Solitaire variants still need leaderboard + achievements + migration)
- [ ] Submit HoverDash to Poki (clean version without SDK)
- [ ] Submit HoverDash to CrazyGames (clean version without SDK)

### Phase 3 — Retention (partially done)
Achievements API + trophy catalog + per-game definitions done (HoverDash, Breakout, Connect 4).
- [ ] Add daily challenges system
- [ ] Add streak tracking

### Phase 4 — Community & Monetization
- [ ] Add ratings/favorites
- [ ] Trending/most played sorting on portal
- [ ] Ad integration (non-intrusive, opt-in rewarded ads)

---

## Multi-Platform Strategy

HoverDash (and future games) target multiple platforms from one codebase:

```
/games/hoverdash/
├── game.js              ← All game logic (shared)
├── style.css            ← All styling (shared)
├── assets/              ← Images, sounds (shared)
├── index.html           ← GameVolt version (loads gamevolt-sdk.js)
├── index-standalone.html ← Clean version for Poki/CrazyGames/standalone
└── index-poki.html      ← Poki version (loads poki-sdk.js) — if accepted
```

**Rule:** `game.js` never imports or requires any SDK directly. All SDK interaction happens through `if (window.GameVolt)`, `if (window.PokiSDK)`, etc.

---

## Migration Checklist

### Completed ✅
- Rebrand PulseGames → GameVolt (repo, branding, code, domain, HTTPS, CNAME)
- Supabase set up (auth, schema, RLS, magic link)
- SDK built & integrated in HoverDash (pilot), Breakout, Connect 4
- All games live on gamevolt.io, auth/cloud save/guest mode verified
- OG images updated (portal + Axeluga)

### Remaining
- [ ] Decide: redirect pulsegames.eu → gamevolt.io, or let it expire
- [ ] Roll out SDK to remaining games (TapRush, Snake; Solitaire variants still need leaderboard + achievements + migration)
- [ ] Update GameMonetize developer profile with new URL
- [ ] Update portal submissions / social media with new URL

---

## Game Upload Checklist

Use this checklist every time a new game is added to GameVolt, or when an existing game is updated for iframe/portal play.

### 1. HTML & Viewport

- [ ] Single-file HTML (or proper file structure with shared `game.js`)
- [ ] Viewport meta tag:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  ```
- [ ] Mobile web app meta tags (if applicable):
  ```html
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  ```

### 2. Touch & Input

- [ ] `touch-action: none` on the game wrapper/container element
  ```css
  #game-wrapper { touch-action: none; }
  ```
- [ ] Touch event listeners use `{ passive: false }` to allow `preventDefault()`
- [ ] Touch and mouse input both work (unified input handler)
- [ ] Game receives focus in iframe — input works immediately after load
  > Note: The game player already calls `iframe.focus()` on load, but the game
  > should not require a click to activate if possible.

### 3. Orientation

- [ ] Decide: does this game require **landscape** or work in **portrait**?
- [ ] If landscape-required: add `landscape: true` to the GAMES config in `/play/index.html`
  > The player page shows a "Rotate your device" overlay for landscape games in portrait.
  > The game does NOT need its own rotate screen — the player handles it.
- [ ] If portrait: no flag needed, game plays as-is in portrait
- [ ] Game canvas resizes responsively to fill available space

### 4. Canvas & Responsive Sizing

- [ ] Canvas scales to fit container (use `getBoundingClientRect()` or `resize` listener)
- [ ] Don't assume fixed dimensions — the iframe can be any size
- [ ] Cap `devicePixelRatio` at ~1.5 for mobile performance if using canvas
- [ ] Test on both narrow phones and wide screens

### 5. SEO Content (iframe detection)

Every game should have SEO content (description, breadcrumbs, related games) that is:
- **Visible** when loaded standalone (for Google indexing)
- **Hidden** when loaded inside the game player iframe

- [ ] Wrap all SEO content in `<div id="seo-content">`:
  ```html
  <div id="seo-content">
    <!-- breadcrumbs, game info, "You Might Also Like", footer -->
  </div>
  ```
- [ ] Add iframe-hide script before `</body>`:
  ```html
  <script>
  if (window.parent !== window) {
    document.getElementById('seo-content').style.display = 'none';
  }
  </script>
  ```
- [ ] If the game reveals SEO content via JS (like HoverDash), guard it:
  ```javascript
  if (window.parent === window) {
    document.getElementById('seo-content').style.display = 'block';
    document.body.style.overflowY = 'auto';
    document.body.style.overflowX = 'hidden';
  }
  ```

### 6. postMessage Integration

Games communicate with the player page via `postMessage`. This enables session tracking, high scores, and achievements in the portal.

- [ ] Add the `gvPost` helper function:
  ```javascript
  function gvPost(action, payload) {
    if (window.parent !== window) {
      try {
        window.parent.postMessage({
          type: 'gamevolt',
          action: action,
          gameId: 'YOUR-GAME-SLUG',
          payload: payload || {}
        }, '*');
      } catch (e) {}
    }
  }
  ```
- [ ] Send `game_start` when a new round/game begins
- [ ] Send `game_over` with `{ score, mode, stats }` on game end
- [ ] Send `high_score` with `{ score, mode }` when a new record is set
- [ ] Send `achievement` with `{ id, name }` when an achievement unlocks
- [ ] (Optional) Send `level_complete` on level completion

### 7. SDK / GameVolt Check

- [ ] All SDK calls wrapped in `if (window.GameVolt)` — never assume it exists
- [ ] localStorage used as fallback for everything (saves, high scores, achievements)
- [ ] Game is fully playable without SDK, without login, without network

### 8. Portal Registration

When adding a new game to the portal:

- [ ] Add thumbnail: `/assets/thumbnails/{game-slug}.webp` (16:9, ~400x225px)
- [ ] Add entry to GAMES config in `/play/index.html`:
  ```javascript
  yourGame: {
    name: "Your Game",
    category: "Arcade",       // Arcade | Action | Puzzle | Board
    path: "/your-game/",
    thumb: "/assets/thumbnails/your-game.webp",
    landscape: false           // true if landscape-only
  }
  ```
- [ ] Add game card to portal homepage (`/index.html`)
- [ ] Add game to relevant category page (`/arcade-games/`, `/action-games/`, etc.)
- [ ] Update GAME_META in portal homepage JS (for "Continue Playing" section)
- [ ] Update game catalog table in this file (GAMEVOLT.md)

### 9. Performance Optimization

- [ ] Game loop uses `requestAnimationFrame` (never `setInterval`/`setTimeout`)
- [ ] Cap `devicePixelRatio` at 1.5–2 for mobile:
  ```javascript
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  ```
- [ ] Canvas context created with `{ alpha: false }` if no transparency needed
- [ ] Object pooling for frequently created/destroyed objects (particles, bullets)
- [ ] Minimize garbage collection: reuse objects, avoid allocations in hot loops
- [ ] Images: use WebP format, compress to appropriate size (not 2000px for a 200px sprite)
- [ ] Audio: short clips in MP3, preloaded before gameplay
- [ ] No heavy DOM manipulation during gameplay (canvas-based rendering preferred)
- [ ] Avoid `filter`, `box-shadow`, `backdrop-filter` on frequently animated elements
- [ ] Test on a low-end device (or throttle CPU in DevTools) — aim for solid 60fps

### 10. GameVolt SDK Integration

Every game that wants cloud save, leaderboards, and trophies needs these steps:

**A. Load SDK (BEFORE game script, no defer):**
```html
<script src="/sdk/gamevolt.js"></script>
<script>
  // Your game code here...
</script>
```
> **IMPORTANT:** The SDK must load synchronously before your game script.
> Do NOT use `defer` or place it after your `</script>`. If `window.GameVolt`
> is `undefined` when your code runs, the SDK loaded too late.

**B. Init + Migration (inside your game script):**
```javascript
if (window.GameVolt) {
    GameVolt.init('your-game-slug');  // Must match games table id
    GameVolt.save.registerMigration({
        keys: ['yourGame_stats', 'yourGame_achievements'],
        merge: function(local, cloud) { /* merge logic */ },
        getScores: function(local) {
            // Return array: [{ score: 1234, mode: 'default' }]
        },
        getAchievements: function(local) {
            // Return array: [{ id: 'trophy_id', unlocked_at: Date.now() }]
        }
    });
}
```
> **Method name:** It's `save.registerMigration()`, NOT `save.setup()`.

**C. Submit scores on game over:**
```javascript
if (window.GameVolt) GameVolt.leaderboard.submit(score, { mode: 'default' });
```

**D. Unlock trophies when earned:**
```javascript
if (window.GameVolt) GameVolt.achievements.unlock('trophy_id');
```
> The SDK auto-prefixes with gameId: `unlock('first_win')` → `connect4-first_win`

**E. postMessage to portal:**
```javascript
function gvPost(action, payload) {
    try { window.parent.postMessage({ type: 'gamevolt', action: action, gameId: 'your-slug', payload: payload }, '*'); } catch(e) {}
}
gvPost('score', { score: 1234 });
gvPost('achievement', { id: 'trophy_id', name: 'Name', tier: 'bronze' });
```

**Common pitfalls:**
- `GameVolt.init()` is required — without it, Supabase never connects
- SDK script must load BEFORE game script (no `defer`, no placement after game)
- Method is `registerMigration`, not `setup`
- Use `maybeSingle()` instead of `single()` when a row may not exist (avoids 406)
- Trophy IDs should be simple slugs: `first_win`, not `connect4-first_win` (SDK adds prefix)
- Standard tier system: 15 bronze, 10 silver, 5 gold, 1 platinum = 31 total
- `user_achievements` must NOT have a foreign key to `achievement_defs` — trophies are defined client-side, not in the DB. A leftover FK constraint causes 409/23503 errors on unlock. If you see "foreign key violation" (error 23503), run: `ALTER TABLE user_achievements DROP CONSTRAINT IF EXISTS user_achievements_achievement_id_fkey;`

### 11. Final Testing

- [ ] Desktop: game loads and plays in iframe at `/play/?game=slug`
- [ ] Desktop: fullscreen toggle works (includes game bar with exit button)
- [ ] Mobile portrait: game fills viewport, compact bottom bar visible
- [ ] Mobile landscape: game fills viewport, thin side bar on left
- [ ] Mobile: touch controls work inside iframe
- [ ] Standalone: game loads directly at `/game-slug/` with SEO content visible
- [ ] Sidebar: thumbnail loads correctly
- [ ] Session tracking: time counter works in game bar
- [ ] postMessage: events appear in GVTracker localStorage (`gv_portal` key)
- [ ] SDK: `window.GameVolt` exists when game code runs (check console)
- [ ] SDK: score appears in Supabase `scores` table after game over
- [ ] SDK: trophies appear in `user_achievements` after unlock (no 409 errors)
- [ ] SDK: migration works (existing localStorage data syncs on first login)

---

## Open Questions

- [ ] Keep PulseGames.eu as redirect, or drop the domain?
- [ ] Transfer GameVolt.io to Cloudflare or keep at One.com?
- [ ] Avatar system: upload custom vs pick from preset gallery?
- [ ] Customize Supabase email template
- [ ] Global leaderboard UI in game tabs
- [ ] Hover-preview on game cards: show short gameplay video/GIF when hovering over a game thumbnail on the portal

---

## Cost Summary

| Item | Year 1 | Year 2+ |
|---|---|---|
| GitHub Pages | Free | Free |
| Supabase (free tier) | Free | Free |
| GameVolt.io domain (One.com) | ~699 kr | ~699 kr |
| **Total** | **~699 kr** | **~699 kr** |

Optional: Transfer domain to Cloudflare to save ~100-200 kr/year.

---

## File Structure (Actual)

```
/GameVolt/
├── index.html                    ← Portal landing page
├── GAMEVOLT.md                   ← This file (project spec)
├── CLAUDE.md                     ← Claude Code instructions
├── CNAME                         ← gamevolt.io
├── sdk/
│   └── gamevolt.js               ← GameVolt SDK
├── js/
│   └── gv-tracker.js             ← localStorage tracker (gv_portal key)
├── sql/
│   └── schema.sql                ← Supabase DB schema (idempotent)
├── play/
│   └── index.html                ← Game player (iframe loader, sidebar, session timer)
├── profile/
│   └── index.html                ← User profile page (trophy catalog)
├── auth/
│   └── callback/
│       └── index.html            ← Supabase auth callback
├── assets/
│   ├── og-image.jpg              ← Portal OG image (1200x630)
│   ├── favicon.png
│   └── thumbnails/               ← Game thumbnails (.webp)
├── golden-glyphs/                ← Block puzzle (ES6 modules, SDK integrated)
├── axeluga/                      ← Space shooter (standalone game)
├── breakout/                     ← Breakout (multi-file ES6 modules)
│   └── js/                       ← UI.js, Achievements.js, etc.
├── blockstorm/                   ← Tetris clone
├── connect4/                     ← Connect 4
├── hoverdash/                    ← HoverDash (SDK pilot)
├── snake/                        ← Snake Neo (3 modes)
├── solitaire/                    ← Solitaire Collection
├── taprush/                      ← TapRush (was ClickRush)
├── action-games/                 ← Category landing page
├── arcade-games/                 ← Category landing page
├── board-games/                  ← Category landing page
├── puzzle-games/                 ← Category landing page
└── 404.html                      ← Flappy Bird easter egg
```

> **Note:** Games are at root level (not in a `/games/` folder). Each game is a self-contained folder except Breakout which uses ES6 modules.
