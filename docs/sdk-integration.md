# GameVolt SDK Integration Guide

How to integrate the GameVolt SDK into a game for cloud save, leaderboards, achievements, and auth.

## 1. Load the SDK

Add this script tag **before** your game script in the game's `index.html`:

```html
<script src="/sdk/gamevolt.js"></script>
```

This sets `window.GameVolt` globally. All SDK calls must be guarded:

```js
if (window.GameVolt) {
  GameVolt.init("your-game-id");
}
```

## 2. Initialize

Call `GameVolt.init(gameId)` once on startup. The `gameId` must match the slug used in Supabase's `games` table.

```js
if (window.GameVolt) {
  GameVolt.init("your-game-id");
}
```

## 3. Achievements / Trophies

### Unlock an achievement

```js
if (window.GameVolt) {
  GameVolt.achievements.unlock("achievement_id");
}
```

The SDK prefixes the game ID automatically — `"achievement_id"` becomes `"your-game-achievement_id"` in the database.

### Trophy toast (in-game notification)

Every game should show a visual toast when a trophy unlocks. Standard pattern:

**HTML** (add before closing `</body>`):

```html
<div id="trophy-toast">
  <div id="trophy-toast-icon"></div>
  <div>
    <div id="trophy-toast-label">TROPHY UNLOCKED</div>
    <div id="trophy-toast-tier" class="bronze"></div>
    <div id="trophy-toast-name"></div>
  </div>
</div>
```

**CSS**:

```css
#trophy-toast {
  position: fixed;
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  background: #0a0a18ee;
  border: 1px solid #ffd70066;
  border-radius: 10px;
  padding: 10px 20px;
  z-index: 50;
  transition: bottom .5s cubic-bezier(.34, 1.56, .64, 1);
  box-shadow: 0 0 30px #ffd70033;
  pointer-events: none;
}
#trophy-toast.show { bottom: 24px; }
#trophy-toast-icon { font-size: 28px; }
#trophy-toast-label {
  font-size: 9px; color: #ffd700;
  letter-spacing: 3px; font-weight: 700;
  text-transform: uppercase;
}
#trophy-toast-tier {
  font-size: 9px; font-weight: 700; letter-spacing: 2px;
}
#trophy-toast-tier.bronze { color: #cd7f32; }
#trophy-toast-tier.silver { color: #c0c0c0; }
#trophy-toast-tier.gold { color: #ffd700; }
#trophy-toast-tier.platinum { color: #b4ffff; }
#trophy-toast-name {
  font-size: 14px; color: #fff;
  font-weight: 700; letter-spacing: 1px;
}
```

**JS** (queue-based, shows one at a time):

```js
// State
let toastQueue = [];
let toastActive = false;

function showTrophyToast(trophy) {
  toastQueue.push(trophy);
  if (!toastActive) popToast();
}

function popToast() {
  if (!toastQueue.length) { toastActive = false; return; }
  toastActive = true;
  const trophy = toastQueue.shift();
  const el = document.getElementById("trophy-toast");
  if (!el) { toastActive = false; return; }
  document.getElementById("trophy-toast-icon").textContent = trophy.icon;
  document.getElementById("trophy-toast-name").textContent = trophy.name;
  const tierEl = document.getElementById("trophy-toast-tier");
  tierEl.textContent = trophy.tier.toUpperCase();
  tierEl.className = trophy.tier;
  el.classList.add("show");
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => popToast(), 400);
  }, 2800);
}
```

Each trophy object should have: `{ id, icon, name, tier }`.

### Trophy SFX (optional)

Synthesized chime using Web Audio API:

```js
function trophySfx(tier) {
  const notes = tier === "gold" || tier === "platinum" ? [784, 988, 1318] : [784, 1047];
  notes.forEach((freq, i) => {
    // Play sine + triangle tones with slight delay between notes
    playTone(freq, "sine", 0.4, { delay: i * 0.08, vol: 0.25 });
    playTone(freq, "triangle", 0.15, { delay: i * 0.08 + 0.02, vol: 0.1 });
  });
}
```

## 4. Leaderboard

### Submit a score

```js
if (window.GameVolt) {
  GameVolt.leaderboard.submit(score, { mode: "default" });
}
```

### Get leaderboard

```js
if (window.GameVolt) {
  const rows = await GameVolt.leaderboard.get({ mode: "default", limit: 50 });
}
```

### Get player rank

```js
if (window.GameVolt) {
  const rank = await GameVolt.leaderboard.getRank({ mode: "default" });
}
```

## 5. Cloud Save

### Save data

```js
if (window.GameVolt) {
  GameVolt.save.set({ level: 5, score: 12000 });
}
```

### Load data

```js
if (window.GameVolt) {
  const data = await GameVolt.save.get();
}
```

Falls back to localStorage for guests automatically.

### Migration (localStorage to cloud)

Register a migration config so that when a guest signs in, their local data is merged to the cloud:

```js
if (window.GameVolt) {
  GameVolt.save.registerMigration({
    keys: ["your-game-save-key", "your-game-trophies-key"],
    merge: function(localData, cloudData) {
      // Return merged save object
      return cloudData || localData["your-game-save-key"] || {};
    },
    getAchievements: function(localData) {
      // Return array of { id, unlocked_at } from local trophy data
      const trophies = localData["your-game-trophies-key"] || {};
      return Object.keys(trophies).map(id => ({ id, unlocked_at: trophies[id] }));
    },
    getScores: function(localData) {
      // Return array of { score, mode } sorted desc
      return [{ score: localData["your-game-save-key"]?.bestScore || 0, mode: "default" }];
    }
  });
}
```

## 6. Auth

### Open login modal

```js
if (window.GameVolt) {
  GameVolt.auth.login();
}
```

### Get current user

```js
if (window.GameVolt) {
  const user = GameVolt.auth.getUser();
  // { id, email, username, avatar_url } or null
}
```

### Listen for auth state changes

```js
if (window.GameVolt) {
  GameVolt.auth.onStateChange(function(user) {
    // user is null on sign-out, object on sign-in
  });
}
```

## 7. Challenges (Async Multiplayer)

Create seeded challenges where players compete on the same levels and compare results.

### Create a challenge

```js
if (window.GameVolt) {
  const ch = await GameVolt.challenge.create({
    seed: "my-custom-seed",   // optional, auto-generated if omitted
    levelCount: 10,           // number of levels
    config: { difficulty: "mixed" }  // game-specific config (JSONB)
  });
  // ch = { id: "uuid", seed: "...", level_count: 10 }
  // Share ch.id with opponent (via URL, link, etc.)
}
```

### Get challenge + results

```js
if (window.GameVolt) {
  const data = await GameVolt.challenge.get("challenge-uuid");
  // data.challenge = { id, seed, level_count, config, status, creator_username, ... }
  // data.runs = [{ user_id, username, score, time_ms, splits, stats, ... }, ...]
}
```

### Submit a run

```js
if (window.GameVolt) {
  await GameVolt.challenge.submit("challenge-uuid", {
    score: 8500,
    timeMs: 142000,
    completedCount: 9,
    totalCount: 10,
    splits: [{ level: 1, time: 12300, score: 950 }, ...],
    stats: { undos: 3, resets: 1, hints: 0 }
  });
}
```

### List my challenges

```js
if (window.GameVolt) {
  const list = await GameVolt.challenge.list({ limit: 20 });
  // [{ challenge_id, seed, my_score, opponent_username, opponent_score, ... }]
}
```

### Listen for opponent result (realtime)

```js
if (window.GameVolt) {
  const unsub = GameVolt.challenge.onResult("challenge-uuid", function(run) {
    console.log(run.username + " scored " + run.score);
    // Show notification / update UI
  });
  // Call unsub() to stop listening
}
```

## Checklist

- [ ] `<script src="/sdk/gamevolt.js"></script>` before game script
- [ ] `GameVolt.init("game-id")` on startup (guarded with `if (window.GameVolt)`)
- [ ] Trophy toast HTML + CSS + JS (queue-based)
- [ ] `GameVolt.achievements.unlock(id)` on each trophy unlock
- [ ] `GameVolt.leaderboard.submit(score)` on game end / stage clear
- [ ] Cloud save via `GameVolt.save.set()` / `.get()`
- [ ] Migration config registered for localStorage → cloud transition
- [ ] All SDK calls guarded with `if (window.GameVolt)`
- [ ] `GameVolt.challenge.create()` / `.submit()` / `.get()` for async multiplayer
- [ ] `GameVolt.challenge.onResult()` for realtime opponent notifications
