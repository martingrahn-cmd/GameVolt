# GameVolt.io — GA4 Game Event Tracking Implementation

## Background

GameVolt.io gets ~1,700 visitors/month from YouTube ads and paid search, but GA4 shows almost zero engagement. 73% of visitors leave within 10 seconds. The root cause is twofold:

1. **No game-specific events in GA4** — we can't see if anyone actually plays
2. **YouTube ads link to the homepage** instead of directly to games, causing confusion and bounce

This document describes exactly what needs to be implemented.

---

## Architecture

GameVolt uses a shared iframe shell at `/play/index.html` that loads individual games. GA4 (gtag.js) runs on the parent page. Games inside the iframe need to send events to the parent via `postMessage`, where they get forwarded to GA4.

```
[YouTube Ad] → gamevolt.io/games/hoverdash/
                    ↓
            [Game page with GA4 gtag]
                    ↓
            [/play/index.html iframe shell]
                    ↓
            [Game HTML in iframe]
                    ↓ postMessage
            [Parent catches event → gtag()]
```

---

## Task 1: Add postMessage listener to the iframe shell

**File:** `/play/index.html` (the shared iframe shell that loads all games)

Add this script block (before `</body>` or in existing script):

```javascript
// Listen for GA4 events from games running in the iframe
window.addEventListener('message', (e) => {
  if (e.data?.type === 'gamevolt_ga4' && typeof gtag === 'function') {
    gtag('event', e.data.event, e.data.params);
  }
});
```

**Important:** Make sure `gtag` is already loaded on this page. If the GA4 snippet (`gtag.js`) is NOT on `/play/index.html`, it needs to be added there too. Check for a script tag loading `https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX`.

---

## Task 2: Create the GameVolt tracker module

**Create file:** `/assets/js/gamevolt-tracker.js` (or wherever shared JS lives)

```javascript
/**
 * GameVolt GA4 Event Tracker
 * Sends game events to GA4 via postMessage (iframe) or directly via gtag.
 */
const GameVoltTracker = {
  gameName: null,
  startTime: null,
  hasTracked30s: false,
  hasTracked60s: false,
  timerInterval: null,

  /**
   * Call when the player starts playing (clicks Play, game loads, etc.)
   * @param {string} gameName - e.g. 'HoverDash', 'SnakeNeo', 'GravityWell'
   */
  start(gameName) {
    this.gameName = gameName;
    this.startTime = Date.now();
    this.hasTracked30s = false;
    this.hasTracked60s = false;

    this._send('game_start', { game_name: gameName });

    // Auto-track play time milestones
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this._checkMilestones(), 5000);
  },

  /**
   * Call when a game/round/level ends
   * @param {object} opts - { score, level, outcome: 'win'|'lose'|'quit' }
   */
  end(opts = {}) {
    const elapsed = this.startTime
      ? Math.round((Date.now() - this.startTime) / 1000)
      : 0;

    this._send('game_end', {
      game_name: this.gameName,
      play_time_seconds: elapsed,
      score: opts.score ?? null,
      level: opts.level ?? null,
      outcome: opts.outcome ?? 'unknown',
    });

    if (this.timerInterval) clearInterval(this.timerInterval);
  },

  /**
   * Call for custom game events (achievements, level ups, etc.)
   */
  event(eventName, params = {}) {
    this._send(eventName, { game_name: this.gameName, ...params });
  },

  // --- Internal ---

  _checkMilestones() {
    if (!this.startTime) return;
    const elapsed = (Date.now() - this.startTime) / 1000;

    if (elapsed >= 30 && !this.hasTracked30s) {
      this.hasTracked30s = true;
      this._send('game_play_30s', { game_name: this.gameName });
    }
    if (elapsed >= 60 && !this.hasTracked60s) {
      this.hasTracked60s = true;
      this._send('game_play_60s', { game_name: this.gameName });
    }
  },

  _send(eventName, params) {
    // Option 1: gtag exists on same page (game loaded directly, not in iframe)
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
      return;
    }

    // Option 2: Game runs in iframe — send to parent
    if (window.parent !== window) {
      window.parent.postMessage(
        { type: 'gamevolt_ga4', event: eventName, params: params },
        '*'
      );
      return;
    }

    console.warn('[GameVoltTracker] No gtag found:', eventName, params);
  },
};
```

---

## Task 3: Integrate tracker in each game

Each game is a single HTML file. At the top of the game's `<script>`, either:

**Option A** — Copy/paste the `GameVoltTracker` object directly into the game file (simplest, no external dependency), OR

**Option B** — Add a script tag: `<script src="/assets/js/gamevolt-tracker.js"></script>`

Then call:

```javascript
// When the game starts (player clicks Play / first level loads):
GameVoltTracker.start('GameNameHere');

// When a round/game ends:
GameVoltTracker.end({ score: playerScore, level: currentLevel, outcome: 'lose' });

// Optional — achievements, level complete, etc:
GameVoltTracker.event('level_complete', { level: 5, time_seconds: 42 });
```

### Per-game integration points

Here's where to hook in for each game in the catalog:

| Game | File | Hook `start()` at | Hook `end()` at |
|------|------|--------------------|-----------------|
| HoverDash | `/games/hoverdash/index.html` | When game loop starts / play button clicked | On crash/game over |
| Snake Neo | `/games/snake-neo/index.html` | When a mode starts (Neo/Nokia/16-bit) | On death / game over screen |
| Gravity Well | `/games/gravity-well/index.html` | When gameplay begins | On death animation complete |
| BounceBlob | `/games/bounceblob/index.html` | When level starts | On fall / level complete |
| GridFury | `/games/gridfury/index.html` | When arena loads | On player death |
| Axeluga | `/games/axeluga/index.html` | When game starts | On ship destroyed / game over |
| Connect 4 | `/games/connect4/index.html` | When match starts | On win/lose/draw |
| Solitaire | `/games/solitaire/index.html` | When deal starts | On win / give up |

**Note:** File paths may differ — check the actual repo structure. The important thing is to find the game start function and the game over function in each file.

---

## Task 4: Verify GA4 receives the events

After deploying, verify using GA4 Realtime report:

1. Open GA4 → Reports → Realtime
2. Open a game on gamevolt.io in another tab
3. Play for 30+ seconds
4. Check that `game_start`, `game_play_30s`, and `game_end` appear in the realtime event list

Alternatively, use browser DevTools → Console and look for the `postMessage` calls, or use the GA4 DebugView (enable with `gtag('config', 'G-XXXXX', { debug_mode: true })`).

---

## Events reference

| Event | When | Key params |
|-------|------|------------|
| `game_start` | Player begins playing | `game_name` |
| `game_play_30s` | 30 seconds of play time | `game_name` |
| `game_play_60s` | 60 seconds of play time | `game_name` |
| `game_end` | Round/game ends | `game_name`, `play_time_seconds`, `score`, `level`, `outcome` |
| `level_complete` | Optional: level beaten | `game_name`, `level`, `time_seconds` |
| `achievement_unlock` | Optional: achievement | `game_name`, `achievement` |

---

## YouTube campaign URL change (manual step — NOT for Claude Code)

This is done manually in YouTube Studio → Kampanjer:

- **HoverDash campaign** ("Can you beat my score?"): Change destination URL from `gamevolt.io` to `gamevolt.io/games/hoverdash/`
- **GravityWell campaign**: Change destination URL from `gamevolt.io` to `gamevolt.io/games/gravity-well/`

Verify the exact URL paths match the actual game pages on the site.

---

## Priority

1. **Task 1** (iframe listener) — required for anything else to work
2. **Task 3** (integrate in HoverDash + GravityWell first) — these are the games with active YouTube campaigns
3. **Task 2** (shared module) — nice to have as standalone file
4. **Task 3 continued** (remaining games) — when time allows
