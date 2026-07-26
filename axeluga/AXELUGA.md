# AXELUGA.md — Game Specification & Development Guide

> **Claude Code: Read this file before making any changes to Axeluga.**
> Also read `/GAMEVOLT.md` and `/CLAUDE.md` for project-wide rules.

---

## Overview

**Axeluga** is a vertical space shooter (shmup) with 5 worlds, boss fights, power-ups, and gamepad support. It runs on vanilla Canvas (no Phaser). Built as a multi-file ES6 module game (not single-file like most GameVolt games).

**Genre:** Vertical shoot-em-up / arcade shmup
**Resolution:** 360x640 (portrait, mobile-first)
**Controls:** Keyboard + Touch + Gamepad (all three always supported)

---

## File Structure

```
axeluga/
  index.html              ← Main HTML (loads modules, HTML chrome, trophy toast, SDK init)
  index-standalone.html   ← Clean version for Poki/CrazyGames (no SDK)
  manifest.json           ← PWA manifest
  sw.js                   ← Service worker for offline/PWA
  icon-192.png / icon-512.png
  og-image.jpg
  js/
    main.js               ← Entry point (18 lines). Creates Game, attaches keydown handler
    game.js               ← THE MAIN FILE (~5300 lines). Everything: Game class, Background,
                             Assets, Particles, ScreenShake, trophies, all game states, all rendering
    config.js             ← Constants: sprite defs, wave config, enemy defs, world defs, difficulty
    input.js              ← Input handler: keyboard, touch, gamepad (unified)
    audio.js              ← Audio: procedural SFX + BGM file playback
  assets/
    *.png                 ← Sprite sheets (Timberlate, DyLEStorm, Pixel Enemies packs)
    bgm_*.mp3             ← Music per world + title
```

**IMPORTANT:** Axeluga is NOT single-file. It uses ES6 modules (`import/export`). This is an exception to the usual GameVolt single-file convention because the game is too large.

---

## Game States

The `Game.state` property drives everything. States and their flow:

```
loading → menu ──→ levelselect → playing → gameover → menu
                ├→ challenges → playing      ├→ paused → playing / menu
                ├→ scores / trophies → menu  ├→ stageclear → playing (next world)
                ├→ options → menu            └→ victory → menu
                └→ credits → menu
```

Each state has:
- **Update logic** in `Game.update()` (input handling, navigation)
- **Render logic** in `Game.render()` → calls `drawMenu()`, `drawTrophies()`, `drawGameOver()`, etc.
- **Touch handling** in `Game.init()` → `this.input.onTap(...)` callback

When adding a new state, you must update ALL THREE: update switch, render switch, and onTap handler.

---

## Menu System

The main menu has 7 items: **START/CONTINUE, PRACTICE, CHALLENGES, SCORES,
ACHIEVEMENTS, OPTIONS, CREDITS**
- `menuCursor` tracks which item is selected (0-6)
- Navigation: Arrow keys / gamepad / touch tap
- START/CONTINUE → starts Campaign World 1 or an unranked checkpoint
- PRACTICE → goes to `levelselect`
- CHALLENGES → Daily Sector / Weekly Boss
- SCORES and ACHIEVEMENTS use HTML overlays
- OPTIONS → music, SFX, autofire, handedness, reduced motion, color assist
- CREDITS → goes to `credits` state

When returning from a sub-screen, set `menuCursor` to the correct index:
- Challenges: 2
- Scores: 3
- Achievements: 4
- Options: 5
- Credits: 6

Menu items render at `y = 312 + i * 37` (important for touch hit detection).

---

## World System

5 worlds defined in `config.js → WORLDS[]`:

| # | Name | Enemy Pool | Background | Boss |
|---|------|-----------|------------|------|
| 0 | DEEP SPACE | Timberlate sprites | Space + nebulae + planets | Spritesheet boss |
| 1 | STATION APPROACH | Mixed Timberlate + DyLEStorm | Space + blocks | Spritesheet boss |
| 2 | STATION CORE | DyLEStorm | Space + blocks + buildings + ground | Spritesheet boss |
| 3 | ATMOSPHERE | Pixel Enemies (wings/danger) | Gradient sky + clouds | PE boss 02 |
| 4 | CITY ASSAULT | Pixel Enemies (bug/emperor) | City road + buildings | PE animated boss |

Each world has 10 waves (`WAVE_CONFIG.bossEvery = 10`):
- Wave 5: mini-boss
- Wave 10: world boss
- After boss kill: `stageclear` → next world transition
- After world 5 boss: `victory`

---

## Difficulty System

3 presets in `config.js → DIFFICULTY[]`:

| Level | Name | Shoot Rate | HP | Speed | Drops |
|-------|------|-----------|-----|-------|-------|
| 0 | EASY | 1.8x slower | 0.6x | 0.8x | 1.5x more |
| 1 | MEDIUM | 1.0x | 1.0x | 1.0x | 1.0x |
| 2 | HARD | 0.6x faster | 1.4x | 1.2x | 0.7x fewer |

Stored in `this.settings.difficulty`. Selected on level select screen.

## Run Types & Progression

Axeluga has five explicit run types:

- **Campaign** — always starts in World 1, is ranked, unlocks subsequent worlds,
  and submits to `campaign-easy`, `campaign-medium`, or `campaign-hard`.
- **Practice** — starts in an already unlocked later world, is never ranked, and
  cannot unlock full-campaign trophies.
- **Continue** — resumes at the latest world checkpoint with the standard
  loadout. It can unlock the next checkpoint but is always unranked.
- **Daily** — deterministic UTC sector with three waves and a mini-boss.
- **Weekly** — deterministic UTC boss mission.

Daily and Weekly allow one ranked attempt per rotation. Later retries are
practice attempts. They submit to dated leaderboard modes; Campaign leaderboards
remain isolated.

Worlds 2–5 remain locked until the previous world is cleared in Campaign.
Production must never grant debug power-ups for a later-world start.

Progress is stored in the versioned `axeluga_save_v2` localStorage record and
synced through `GameVolt.save` for signed-in players. Save normalization and
merge rules live in `js/progression.js`.

Full-campaign trophies require Worlds 1–5 to be cleared in order within the
same Campaign run. Practice and debug runs must never submit leaderboard scores.

## First Flight UX

The main menu starts Campaign directly; Practice has its own world selector.
Fresh saves default to touch autofire so mobile play never requires a two-finger
move-and-fire grip. The first Campaign presents contextual move, fire, danger,
and power-up prompts across the opening waves and persists tutorial completion
in save schema v2.

Enemy bullets use a minimum visual radius, bright outline, and center highlight.
The player ship renders a precise collision-point marker. Game Over and Victory
show a run summary with time, damage, max combo, difficulty, ranked/practice
status, and PB delta where applicable.

Run analytics are started and ended explicitly by the Game class. Every run must
produce at most one start and one terminal event (`win`, `lose`, `quit`,
`restart`, or `leave`); state transitions such as stage clear must not create a
new analytics session.

---

## Player Mechanics

- **HP:** 5 max (hearts). Lose 1 on hit. Game over at 0.
- **Shield:** Absorbs one hit, then disappears. Duration ~10s if not hit.
- **Weapon levels:** 1-5. Higher = more bullets. Lose 1 level on hit.
- **Speed levels:** 0-3. Lose 1 on hit.
- **Score multiplier:** 2x from score2x powerup, lasts 10s.
- **Bomb:** Charges from kills. When full, press B to clear screen.
- **Invulnerability:** Brief period after hit or at game start.

Power-ups drop from enemies (10% base, scaled by difficulty):
`health, shield, weapon, speed, score2x`. Their type is fixed when spawned,
labelled in the playfield, and biased toward health/weapon when the player needs it.

---

## Trophy System (31 trophies)

Added 2026-03-17. Modeled after HoverDash's trophy system.

### Architecture

- **Definitions:** `TROPHIES[]` array at top of `game.js` — 15 bronze, 10 silver, 5 gold, 1 platinum
- **Persistence:** `localStorage` key `axeluga_trophies` — JSON object `{ trophyId: timestamp, ... }`
- **Load/Save:** `loadTrophyData()` / `saveTrophyData()` functions (top of game.js)
- **Game instance:** `this.trophyData` holds live trophy state
- **Per-run tracking:** `this._runStats` object, reset in `startGame()`

### Trophy IDs & Tiers

**Bronze (15):**
`first-blood`, `deep-space-clear`, `station-clear`, `core-clear`, `atmosphere-clear`, `city-clear`, `score-50k`, `score-100k`, `combo-5`, `first-bomb`, `first-boss`, `power-up-collect`, `weapon-max`, `shield-save`, `asteroid-hunter`

**Silver (10):**
`galaxy-savior`, `score-250k`, `combo-master`, `medium-clear`, `mine-sweeper`, `bomb-efficiency`, `no-death-world`, `boss-no-hit`, `score-500k`, `speed-max`

**Gold (5):**
`hard-clear`, `score-1m`, `no-death-run`, `hard-no-death-world`, `boss-rage-survivor`

**Platinum (1):**
`platinum` — auto-unlocks when all 30 others are unlocked

### Check Triggers

| Method | When called | What it checks |
|--------|------------|----------------|
| `checkInstantTrophies()` | Every kill, every powerup | first-blood, combo-5/10, weapon-max, speed-max |
| `checkScoreTrophies(prev)` | Every kill (score change) | score-50k/100k/250k/500k/1m |
| `checkWorldClearTrophies(idx)` | Stage clear + victory | World clear, no-death-world, hard-no-death-world |
| `checkVictoryTrophies()` | Victory (all 5 worlds done) | galaxy-savior, medium/hard-clear, no-death-run, boss-rage-survivor |
| `checkEndgameTrophies()` | Game over + victory | power-up-collect, asteroid-hunter, mine-sweeper |

One-off triggers (inline):
- `shield-save` — in `hitPlayer()` when shield absorbs
- `first-bomb` — in `triggerBomb()`
- `first-boss` — in `killEnemy()` for boss kills
- `boss-no-hit` — in `killEnemy()` when bossDamageTaken === 0
- `bomb-efficiency` — in `executeBomb()` when 5+ enemies killed

### Per-Run Stats (`this._runStats`)

```javascript
{
  totalKills, bossKills, miniBossKills,
  powerupsCollected, asteroidsDestroyed, minesDestroyed,
  bombsUsed, bombKills,
  damageTaken,          // total HP lost this run
  worldDamageTaken,     // HP lost in current world (resets on world clear)
  bossDamageTaken,      // HP lost during current boss (resets on boss spawn/kill)
  bossRageDamageTaken,  // HP lost during boss rage phases
  bossRageCleanKills,   // bosses beaten in rage without taking damage
  shieldAbsorbs,
  maxCombo,
  difficulty,           // snapshot of settings.difficulty at game start
}
```

### Toast Notification

HTML overlay in `index.html` — `#trophy-toast` div with slide-up animation.
Queue-based: `_trophyToastQueue[]`, shows one at a time for 2.8s each.
SFX: 2-tone chime (bronze/silver), 3-tone chime (gold/platinum).
Tier colors: bronze `#cd7f32`, silver `#c0c0c0`, gold `#ffd700`, platinum `#b4ffff`.

### Trophy Screen

Canvas-rendered grid in `drawTrophies()`. Scrollable with arrow keys / touch.
2-column layout, grouped by tier with colored headers.
Cards show: icon (or lock), name, description, tier label, checkmark if unlocked.

### SDK Integration

Trophies call `GameVolt.achievements.unlock(id)` when the SDK is loaded.
Trophy data is included in the SDK save migration (`axeluga_trophies` key).

---

## Audio System (`audio.js`)

- **BGM:** title and World 1 load on demand; the next world's MP3 is prefetched
  during play. Procedural music is used while a missing track streams.
- **Progress:** streamed bytes report real loading progress in menu/HUD.
- **SFX:** All procedural (Web Audio API oscillators) via `_play(fn)` helper
- **Volume:** `settings.musicVol` (0-1) and `settings.sfxVol` (0-1), applied via `_applyVolumes()`
- **Methods:** `menuClick()`, `waveStart()`, `playerHit()`, `explosion(big)`, `powerup()`, `bossAlert()`, `bossExplode()`, `bombSfx()`, `playerDeath()`, `gameOverSfx()`, `enemyShoot()`

---

## Input System (`input.js`)

Unified input across keyboard, touch, and gamepad:

| Input | Keyboard | Touch | Gamepad |
|-------|----------|-------|---------|
| Move | Arrow keys / WASD | Touch drag (offset -70y) | Left stick |
| Fire | Space (hold) | Auto-fire on touch | A button / RT |
| Bomb | B / E | Dedicated touch area | X button |
| Pause | Escape | — | Start button |
| Navigate | Arrows + Enter | Tap | D-pad + A |

Autofire setting: when enabled, player fires automatically (no hold required).

---

## localStorage Keys

| Key | Format | Purpose |
|-----|--------|---------|
| `axeluga_hi` | Number string | High score |
| `axeluga_settings` | JSON | `{ musicVol, sfxVol, difficulty, autofire }` |
| `axeluga_trophies` | JSON | `{ trophyId: timestamp, ... }` — 0 = locked |

---

## Art Asset Packs

| Pack | Source | Used for |
|------|--------|----------|
| Timberlate Space Shooter | itch.io | Player, enemies (world 1-2), bosses, bullets, explosions, UI |
| DyLEStorm Space Pack | itch.io | Enemies (world 2-3), backgrounds, blocks, buildings, ground |
| Pixel Enemies | itch.io | Enemies (world 4-5): wings, danger, bug, emperor |
| PE Bosses | itch.io | Boss sprites for world 4-5 |
| Cloudy Pack | itch.io | Cloud sprites for atmosphere world |
| DyLEStorm City | itch.io | City background, road, buildings for world 5 |

---

## Backlog / Ideas

### High Priority
- [ ] SDK full integration (cloud save sync for trophies + high score)
- [ ] Standalone version for Poki/CrazyGames submission
- [ ] Daily challenge system (like HoverDash)

### Medium Priority
- [ ] Lifetime stats tracking (total games, total kills, total bosses, etc.)
- [ ] Progress-based trophy display (show % progress for locked trophies)
- [ ] New game+ mode (restart from wave 1 with upgrades after victory)
- [ ] Per-world leaderboards
- [ ] Streak tracking

### Low Priority / Polish
- [ ] More trophy icons/animations (sparkle on platinum unlock)
- [ ] Touch scroll drag in trophy screen (currently tap-based)
- [ ] Replay last run option from game over screen
- [ ] Ship selection / cosmetics
- [ ] Additional worlds (6+)

---

## Key Code Locations (game.js)

| What | Approximate line | Method/section |
|------|-----------------|----------------|
| Trophy definitions | Top of file | `TROPHIES[]` constant |
| Trophy persistence | After TROPHIES | `loadTrophyData()`, `saveTrophyData()` |
| Game constructor | ~780 | `Game.constructor()` |
| Asset loading | ~830 | `Game.init()` |
| Touch handler | ~900 | Inside `init()` → `this.input.onTap(...)` |
| Settings load/save | ~1040 | `_loadSettings()`, `_saveSettings()` |
| Start game + run stats | ~1110 | `startGame()` |
| Main loop | ~1195 | `loop()` / `update()` |
| Menu navigation | ~1250 | Inside `update()` state switch |
| Player movement | ~1460 | `updatePlaying()` |
| Kill enemy + trophies | ~2120 | `killEnemy()` |
| Bomb system | ~2215 | `triggerBomb()`, `executeBomb()` |
| Hit player + trophies | ~2295 | `hitPlayer()` |
| Wave management | ~2390 | `nextWave()` — stage clear, victory, world transition |
| Boss spawning | ~2910 | `spawnBoss()` |
| Powerup collection | ~2920 | `collectPowerup()` |
| Game over + trophies | ~2365 | `gameOver()` |
| Render dispatch | ~3100 | `render()` |
| Side panels update | ~3140 | `updateSidePanels()` |
| Draw menu | ~3260 | `drawMenu()` |
| Draw options | ~3390 | `drawOptions()` |
| Draw credits | ~3550 | `drawCredits()` |
| Draw level select | ~3630 | `drawLevelSelect()` |
| Draw pause | ~3750 | `drawPaused()` |
| Draw HUD (in-game) | ~3870 | Inside `drawGame()` |
| Draw game over | ~4870 | `drawGameOver()` |
| Draw stage clear | ~4710 | `drawStageClear()` |
| Draw victory | ~4790 | `drawVictory()` |
| Trophy methods | ~4930 | `tryUnlockTrophy()`, `checkInstantTrophies()`, etc. |
| Draw trophies | ~5060 | `drawTrophies()` |

*Note: Line numbers are approximate and shift as code changes. Use method names to search.*

---

## Patterns to Follow

1. **All menus are canvas-rendered** — no HTML menus. Use `ctx.fillText()`, `ctx.fillRect()`, etc.
2. **Touch targets** must match canvas coordinates used in `drawX()` methods.
3. **Edge-detected input** for navigation (navUp/navDown/confirm) — see `update()` for the pattern.
4. **Held input** for gameplay (movement, firing) — see `updatePlaying()`.
5. **GameVolt SDK is always optional** — wrap in `if (window.GameVolt)`.
6. **Trophy checks** should use the established trigger points. Don't add checks in tight loops.
7. **_runStats** is reset each `startGame()`. For lifetime stats, add a new persistence layer.
