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

| # | Game | Status | SDK integrated |
|---|---|---|---|
| 1 | Breakout | ✅ Live | ❌ Not yet |
| 2 | ClickRush | ✅ Live | ❌ Not yet |
| 3 | BlockStorm (Tetris) | ✅ Live | ❌ Not yet |
| 4 | Solitaire Collection | ✅ Live | ❌ Not yet |
| 5 | Snake Neo (3 modes) | ✅ Live | ❌ Not yet |
| 6 | Connect 4 | ✅ Live | ❌ Not yet |
| 7 | Flappy Bird (404 page) | ✅ Live | ❌ Not yet |
| 8 | HoverDash | 🔧 In dev | 🎯 PILOT GAME |
| 9 | Golden Glyphs | 🔧 Needs polish | ❌ Not yet |

**HoverDash is the pilot game for SDK integration.** Get everything working here first, then roll out to the other games.

*Note: Update this table as games are completed and SDK is integrated.*

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

### Phase 1 — Foundation (MVP)
- [x] Write this specification
- [ ] Rebrand PulseGames → GameVolt (see Migration Checklist below)
- [ ] Set up Supabase project + run schema SQL
- [ ] Build GameVolt SDK v1 (auth + cloud save)
- [ ] Integrate SDK in HoverDash (pilot game)
- [ ] Test full flow: guest play → create account → progress migrated
- [ ] Upload Golden Glyphs to portal
- [ ] Upload HoverDash to portal

### Phase 2 — Engagement
- [ ] Add leaderboard API to SDK
- [ ] Add leaderboards to HoverDash
- [ ] Build profile page (`/profile/{username}`)
- [ ] Roll out SDK to remaining games (one by one)
- [ ] Submit HoverDash to Poki (clean version without SDK)
- [ ] Submit HoverDash to CrazyGames (clean version without SDK)

### Phase 3 — Retention
- [ ] Add achievements API to SDK
- [ ] Define achievements per game
- [ ] Build achievement panel on profile
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

## Migration Checklist — Step by Step

### Step 1: Rebrand PulseGames → GameVolt

**GitHub Repo:**
- [ ] Rename repo from `pulsegames` → `gamevolt` (Settings → General)
- [ ] Or create new repo `gamevolt` and move files (cleaner history)

**Branding:**
- [ ] Design GameVolt logo (favicon, header, og-image)
- [ ] Create og:image for social sharing (1200x630px)

**Code changes:**
- [ ] Search entire codebase for "pulsegames" (case-insensitive) and replace with "gamevolt"
- [ ] Update `<title>`, `<meta>` tags, og:tags in index.html
- [ ] Update header/footer/nav with new branding
- [ ] Update favicon
- [ ] Update `manifest.json` / `site.webmanifest` if present
- [ ] Update `robots.txt` and `sitemap.xml` with new domain
- [ ] Verify all games load correctly after changes

**External references:**
- [ ] Update GameMonetize developer profile
- [ ] Update portal submissions with new URL
- [ ] Update social media / Reddit if possible

### Step 2: Configure Domain

**Option A: Keep domain at One.com (simplest)**
- [ ] Cancel One.com hosting (keep domain registration only)
- [ ] In One.com DNS settings, add A records for GitHub Pages:
  ```
  @  A  185.199.108.153
  @  A  185.199.109.153
  @  A  185.199.110.153
  @  A  185.199.111.153
  ```
- [ ] Add CNAME: `www  CNAME  <username>.github.io`
- [ ] In GitHub repo → Settings → Pages → Custom domain → `gamevolt.io`
- [ ] Check "Enforce HTTPS"
- [ ] Wait for DNS propagation (up to 24h)
- [ ] Verify https://gamevolt.io loads
- [ ] Cost: ~699 kr/year (domain only)

**Option B: Transfer to Cloudflare (cheaper long-term)**
- [ ] Create Cloudflare account
- [ ] At One.com: unlock domain, get EPP auth code
- [ ] At Cloudflare: initiate transfer, enter code, pay
- [ ] Wait 5-7 days for transfer
- [ ] Set up same DNS records as Option A
- [ ] Bonus: free CDN, DDoS protection, analytics

**Note:** Transfer possible 60 days after original registration.

### Step 3: PulseGames.eu redirect
- [ ] Replace PulseGames repo content with redirect to GameVolt.io:
  ```html
  <!DOCTYPE html>
  <html>
  <head>
    <meta http-equiv="refresh" content="0; url=https://gamevolt.io">
    <link rel="canonical" href="https://gamevolt.io">
    <title>Redirecting to GameVolt.io</title>
  </head>
  <body>
    <p>Moved to <a href="https://gamevolt.io">GameVolt.io</a></p>
  </body>
  </html>
  ```
- [ ] Or let pulsegames.eu expire if not worth keeping

### Step 4: Set up Supabase
- [ ] Create account at supabase.com
- [ ] Create project "GameVolt" in EU West region
- [ ] Save project URL and anon key
- [ ] Auth → Providers → Enable Google + Email
- [ ] Set up Google OAuth (Google Cloud Console)
- [ ] Run database schema SQL (see Database Schema section)
- [ ] Enable Row Level Security on all tables
- [ ] Set up RLS policies (users read all scores, write only own data)
- [ ] Test auth flow

### Step 5: Build & Integrate SDK
- [ ] Create `/sdk/gamevolt.js`
- [ ] Implement Phase 1 API (auth + save)
- [ ] Integrate in HoverDash as pilot
- [ ] Test: guest play, login, save migration, cloud save
- [ ] Roll out to remaining games

### Step 6: Verify
- [ ] All games load on gamevolt.io
- [ ] Auth works (sign up, login, logout)
- [ ] Cloud save works (save on desktop, load on mobile)
- [ ] Guest mode works (localStorage)
- [ ] Migration works (guest → account)
- [ ] PulseGames.eu redirects correctly
- [ ] HTTPS works
- [ ] Open Graph tags show correctly

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

### 9. Final Testing

- [ ] Desktop: game loads and plays in iframe at `/play/?game=slug`
- [ ] Desktop: fullscreen toggle works (includes game bar with exit button)
- [ ] Mobile portrait: game fills viewport, compact bottom bar visible
- [ ] Mobile landscape: game fills viewport, thin side bar on left
- [ ] Mobile: touch controls work inside iframe
- [ ] Standalone: game loads directly at `/game-slug/` with SEO content visible
- [ ] Sidebar: thumbnail loads correctly
- [ ] Session tracking: time counter works in game bar
- [ ] postMessage: events appear in GVTracker localStorage (`gv_portal` key)

---

## Open Questions

- [ ] Keep PulseGames.eu as redirect, or drop the domain?
- [ ] Transfer GameVolt.io to Cloudflare or keep at One.com?
- [ ] Avatar system: upload custom vs pick from preset gallery?
- [ ] Drop GameVolt.one domain?
- [ ] Confirm exact game list currently live on PulseGames.eu
- [ ] Define achievements per game (do this when integrating each game)
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

## File Structure (Target)

```
/gamevolt-repo/
├── index.html                    ← Portal landing page
├── GAMEVOLT.md                   ← This file (project spec)
├── sdk/
│   └── gamevolt.js               ← GameVolt SDK
├── games/
│   ├── hoverdash/
│   │   ├── game.js
│   │   ├── index.html            ← GameVolt version
│   │   ├── index-standalone.html ← Portal submission version
│   │   └── assets/
│   ├── snake-neo/
│   ├── golden-glyphs/
│   ├── connect4/
│   ├── breakout/
│   ├── clickrush/
│   ├── tetris/
│   ├── solitaire/
│   └── flappy-404/
├── profile/
│   └── index.html                ← User profile page
├── css/
│   └── portal.css                ← Portal styles
├── assets/
│   ├── logo.svg
│   ├── og-image.png
│   └── favicon.ico
└── 404.html                      ← Flappy Bird easter egg
```
