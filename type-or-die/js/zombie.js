// Zombie mode (GDD §3.1) — the flagship. Depth view: zombies advance from a
// far horizon straight toward the player and grow as they close in (a
// House-of-the-Dead feel). Still Canvas 2D — no 3D engine (GDD §7).
//
// Each zombie has a world position (worldX lane + dist from the player) and
// is projected to the screen with a simple pinhole perspective. Typing the
// first letter of its word locks on; completing the word kills it; a zombie
// that reaches the player (dist 0) costs a life. 0 lives = game over.
//
// Shared with Speed Test (GDD §4): KeystrokeLog, the WORDS dictionary, and
// the WPM/accuracy maths in stats.js. Lock-on matching is mode-specific.
//
// M2 MVP scope (roadmap §10): core loop, lock-on, combo, difficulty scale,
// game over → leaderboard. Bosses and power-ups are M4 — not built here.

import { KeystrokeLog } from "./keylog.js";
import { WORDS } from "./words.js";
import { scoreHistory } from "./stats.js";
import { addScore, topScores } from "./leaderboard.js";
import { AudioKit } from "./audio.js";
import { mulberry32 } from "./prng.js";
import { dailySeed, todayKey } from "./daily.js";
import { recordRun } from "./trophies.js";
import { remoteEnabled, startRun, submitRun, board } from "./api.js";

const MODE = "zombie";
const NAME_KEY = "tod_name";
const MAX_LIVES = 5;

// Perspective / world tuning.
const FAR_DIST = 100; // world distance a zombie spawns at
const CAM = 22; // focal length — smaller = stronger perspective
const HORIZON_FRAC = 0.3; // horizon line as a fraction of canvas height
const DEATH_TIME = 0.45; // seconds the kill animation runs

// Zombie variants — distinct colour, size and silhouette. Figures are drawn
// in local px with the feet at y=0; figHeight() derives the total height
// (used to place the word pill and kill effects).
const TYPES = [
  { key: "shambler", body: "#3c5a32", edge: "#7dbf5e", eye: "#ff3b3b",
    legH: 20, bodyW: 80, bodyH: 84, headR: 32, square: false, speedMul: 1.0 },
  { key: "brute", body: "#27433a", edge: "#56b893", eye: "#ff5a3b",
    legH: 18, bodyW: 116, bodyH: 96, headR: 40, square: true, speedMul: 0.8 },
  { key: "runner", body: "#53531f", edge: "#c8d24e", eye: "#ffc24a",
    legH: 30, bodyW: 60, bodyH: 108, headR: 26, square: false, speedMul: 1.32 },
  { key: "rotter", body: "#3c2f4e", edge: "#a87fce", eye: "#c47fe0",
    legH: 16, bodyW: 92, bodyH: 80, headR: 36, square: true, speedMul: 0.95 },
];
// Boss variant (GDD §3.1) — appears on every 3rd wave, alone, carrying a
// multi-word phrase. Big, slow, deep red.
const BOSS = { key: "boss", body: "#5a1f24", edge: "#ff3b3b", eye: "#ffd23b",
  legH: 32, bodyW: 192, bodyH: 168, headR: 64, square: true, speedMul: 1 };

const figHeight = (t) => t.legH + t.bodyH + t.headR * 2 - 4;

// Power-ups (GDD §3.1) — earned, never given, no purchase.
const NUKE_COMBO = 15; // a 15-clean-kill streak earns a screen-clearing Nuke
const SLOWMO_STREAK = 30; // 30 clean keystrokes in a row earns Slow-mo
const SLOWMO_DURATION = 5; // seconds
const SLOWMO_FACTOR = 0.4; // zombie speed multiplier while Slow-mo is active

// Wave pacing — each wave is a finite batch of zombies followed by a calm
// breather, instead of an endless accelerating stream (GDD §3.1).
const BREATHER_TIME = 4.5; // seconds of calm between waves
const waveSize = (n) => 4 + Math.floor(n * 1.5); // zombies in wave n

// Seconds → "m:ss" (or "Ns" under a minute).
function formatTime(s) {
  if (s < 60) return s + "s";
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

// Rounded-rect path helper (explicit so it works regardless of
// ctx.roundRect support).
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class ZombieGame {
  constructor() {
    this.enabled = false;
    this.state = "idle"; // idle | running | gameover
    this.raf = null;
    this._loop = this._loop.bind(this);
    this.audio = new AudioKit();
    this.daily = false; // Daily Challenge — date-seeded run (GDD §3.3)
    this.onRunEnd = null; // versus hook — set by the shell for hot-seat 2P
    this.fixedSeed = null; // explicit seed (versus match); overrides daily
    this.runId = null; // server run id when playing a validated run

    const $ = (id) => document.getElementById(id);
    this.dom = {
      view: $("view-zombie"),
      canvas: $("zombie-canvas"),
      start: $("zombie-start"),
      lives: $("z-lives"),
      score: $("z-score"),
      combo: $("z-combo"),
      mult: $("z-mult"),
      wave: $("z-wave"),
      overlay: $("zombie-overlay"),
      overlayRestart: $("z-overlay-restart"),
      saveForm: $("z-save-form"),
      nameInput: $("z-name-input"),
      saveBtn: $("z-save-btn"),
      saved: $("z-result-saved"),
      lbList: $("z-lb-list"),
      lbEmpty: $("z-lb-empty"),
      lbSub: $("z-lb-sub"),
      trophies: $("zr-trophies"),
      trophyOverlay: $("trophy-overlay"),
      r: {
        score: $("zr-score"),
        wave: $("zr-wave"),
        kills: $("zr-kills"),
        combo: $("zr-combo"),
        acc: $("zr-acc"),
        wpm: $("zr-wpm"),
        time: $("zr-time"),
      },
    };
    this.ctx = this.dom.canvas.getContext("2d");
  }

  init() {
    this.dom.overlayRestart.addEventListener("click", () => this.reset());
    this.dom.saveForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this._saveScore();
    });
    document.addEventListener("keydown", (e) => this._onKeydown(e));
    window.addEventListener("resize", () => {
      if (this.enabled) {
        this._resize();
        if (this.state !== "running") this._draw();
      }
    });

    this.dom.nameInput.value = localStorage.getItem(NAME_KEY) || "";
    this.audio.setMuted(localStorage.getItem("tod_muted") === "1");
  }

  // Frame "restart" control (shared button, routed by the shell).
  restart() {
    this.reset();
  }

  // Frame "mute" control — returns the new muted state so the shell can
  // update the button icon.
  toggleMute() {
    this.audio.setMuted(!this.audio.muted);
    localStorage.setItem("tod_muted", this.audio.muted ? "1" : "0");
    return this.audio.muted;
  }

  // ---- mode lifecycle ---------------------------------------------------

  activate() {
    this.enabled = true;
    this.dom.view.hidden = false;
    this.reset();
    this._renderLeaderboard();
  }

  deactivate() {
    this.enabled = false;
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.audio.stopAmbient();
    this.dom.overlay.hidden = true;
    this.dom.view.hidden = true;
  }

  // Toggle the Daily Challenge (GDD §3.3) — restarts with the date seed.
  setDaily(on) {
    this.daily = on;
    if (this.enabled) {
      this.reset();
      this._renderLeaderboard();
    }
  }

  // Leaderboard bucket — a fresh per-day bucket for daily runs.
  _bucket() {
    return this.daily ? `daily-${todayKey()}` : "classic";
  }

  // ---- run lifecycle ----------------------------------------------------

  reset() {
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.state = "idle";

    this.zombies = [];
    this.particles = [];
    this.popups = [];
    this.lives = MAX_LIVES;
    this.score = 0;
    this.combo = 0;
    this.comboMax = 0;
    this.wave = 1;
    this.waveState = "spawning"; // spawning | breather
    this.waveSize = waveSize(1);
    this.spawnedThisWave = 0;
    this.breatherT = 0;
    this.waveBannerT = 0;
    this.elapsed = 0; // ms
    this.spawnAccu = 0;
    this.locked = null;
    this.hitFlash = 0; // red-flash timer when a zombie gets through
    this.bossWave = false;
    this.slowmoT = 0; // seconds of Slow-mo remaining
    this.nukeFlash = 0; // green-flash timer when a Nuke fires
    this.nukeAt = NUKE_COMBO; // combo threshold for the next earned Nuke
    this.cleanStreak = 0; // correct keystrokes in a row (earns Slow-mo)
    this.killHistory = []; // [{target, typed}] — for net WPM logging
    this.keylog = new KeystrokeLog();
    this.keysTotal = 0;
    this.keysGood = 0;
    this.kills = 0;
    this.bossKills = 0;
    this.nukes = 0;
    this.slowmos = 0;
    this.lastResult = null;
    // A seeded PRNG makes the spawn sequence identical for every player —
    // used for both a versus match and the Daily Challenge.
    this.rng =
      this.fixedSeed != null
        ? mulberry32(this.fixedSeed)
        : this.daily
          ? mulberry32(dailySeed("zombie"))
          : Math.random;

    // Validated run: grab a server run id in parallel (zombie validation is
    // heuristic, so the seed is moot — we only need the id to submit).
    // Versus matches stay local.
    this.runId = null;
    if (remoteEnabled() && this.fixedSeed == null) {
      startRun("zombie", this.daily).then((ch) => {
        if (ch) this.runId = ch.run_id;
      });
    }

    this.audio.stopAmbient();
    this.dom.overlay.hidden = true;
    this.dom.start.hidden = false;
    this._resize();
    this._updateHud();
    this._draw();
  }

  _start() {
    this.state = "running";
    this.dom.start.hidden = true;
    this.lastTs = performance.now();
    this.audio.start(); // first keypress is the gesture that unlocks audio
    this._startWave(1);
    this.raf = requestAnimationFrame(this._loop);
  }

  // Begin wave `n`: size it, reset its counters, queue the first spawn.
  // Every 3rd wave is a boss wave — a single boss instead of a batch.
  _startWave(n) {
    this.wave = n;
    this.bossWave = n % 3 === 0;
    this.waveSize = this.bossWave ? 1 : waveSize(n);
    this.spawnedThisWave = 0;
    this.waveState = "spawning";
    this.spawnAccu = this._spawnInterval(); // first zombie comes promptly
    if (n > 1) {
      this.waveBannerT = 1.8; // "WAVE n" flash
      // Non-boss waves get a "here they come" stinger; boss waves get the
      // deep boss horn when the boss spawns instead.
      if (!this.bossWave) this.audio.newWave();
    }
  }

  // Spawn cadence within a wave — gentler early, tighter later.
  _spawnInterval() {
    return Math.max(780, 1950 - this.wave * 95);
  }

  _gameOver() {
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.state = "gameover";
    this.audio.stopAmbient();
    this.audio.gameover();

    const wpm = scoreHistory(this.killHistory, this.elapsed).wpm;
    const accuracy =
      this.keysTotal > 0
        ? Math.round((this.keysGood / this.keysTotal) * 100)
        : 100;
    const seconds = Math.round(this.elapsed / 1000);
    this.lastResult = {
      score: this.score,
      wave: this.wave,
      kills: this.kills,
      comboMax: this.comboMax,
      accuracy,
      wpm,
      seconds,
    };

    // Hot-seat versus: hand the result to the shell, skip the solo overlay.
    if (this.onRunEnd) {
      recordRun({
        mode: "zombie", kills: this.kills, bosses: this.bossKills,
        comboMax: this.comboMax, wave: this.wave, score: this.score,
        nukes: this.nukes, slowmos: this.slowmos, accuracy,
        daily: false, versus: true,
      });
      const cb = this.onRunEnd;
      this.onRunEnd = null;
      cb({ versusScore: this.score, summary: `${this.score} pts · wave ${this.wave}` });
      return;
    }

    this.dom.r.score.textContent = this.score;
    this.dom.r.wave.textContent = this.wave;
    this.dom.r.kills.textContent = this.kills;
    this.dom.r.combo.textContent = this.comboMax;
    this.dom.r.acc.textContent = accuracy + "%";
    this.dom.r.wpm.textContent = wpm;
    this.dom.r.time.textContent = formatTime(seconds);

    this.dom.saved.hidden = true;
    this.dom.saveForm.hidden = false;
    this.dom.saveBtn.disabled = false;
    this.dom.overlay.hidden = false;
    this.dom.nameInput.focus();

    // Fold the run into the trophy profile (GDD §5) and surface unlocks.
    const unlocked = recordRun({
      mode: "zombie",
      kills: this.kills,
      bosses: this.bossKills,
      comboMax: this.comboMax,
      wave: this.wave,
      score: this.score,
      nukes: this.nukes,
      slowmos: this.slowmos,
      accuracy,
      daily: this.daily,
      versus: false,
    });
    this._showTrophies(unlocked);

    // Validated run → submit the keystroke-log proof + the kill list; the
    // server bounds the score (heuristic, GDD §6.6) and writes the board.
    if (this.runId) {
      submitRun({
        run_id: this.runId,
        keystroke_log: this.keylog.export(),
        kills: this.killHistory.map((k) => k.target),
        score: this.score,
        wave: this.wave,
        bosses: this.bossKills,
      }).then(() => this._renderLeaderboard());
    }
  }

  _showTrophies(unlocked) {
    if (!unlocked.length) {
      this.dom.trophies.hidden = true;
      return;
    }
    this.dom.trophies.hidden = false;
    this.dom.trophies.textContent =
      "🏆 Unlocked: " + unlocked.map((t) => t.name).join(", ");
  }

  // ---- game loop --------------------------------------------------------

  _loop(ts) {
    if (!this.enabled || this.state !== "running") return;
    let dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    dt = Math.min(dt, 0.05); // clamp after a tab-switch / long frame
    this._update(dt);
    if (this.state !== "running") return; // game over inside _update
    this._draw();
    this.raf = requestAnimationFrame(this._loop);
  }

  _update(dt) {
    this.elapsed += dt * 1000;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.nukeFlash > 0) this.nukeFlash -= dt;
    if (this.waveBannerT > 0) this.waveBannerT -= dt;
    if (this.slowmoT > 0) this.slowmoT -= dt;

    // Wave pacing: spawn the wave's batch, then breathe once it's cleared.
    if (this.waveState === "spawning") {
      if (this.spawnedThisWave < this.waveSize) {
        this.spawnAccu += dt * 1000;
        if (this.spawnAccu >= this._spawnInterval()) {
          this.spawnAccu = 0;
          this._spawnZombie();
          this.spawnedThisWave++;
        }
      } else if (this.zombies.length === 0) {
        this.waveState = "breather"; // wave cleared — calm before the next
        this.breatherT = BREATHER_TIME;
        this.audio.wave();
        // Crossfade the music for the upcoming wave during the countdown:
        // intense for a boss wave, calm otherwise.
        this.audio.setMusicTrack((this.wave + 1) % 3 === 0);
      }
    } else {
      const before = Math.ceil(this.breatherT);
      this.breatherT -= dt;
      const after = Math.ceil(this.breatherT);
      if (after !== before && after > 0) this.audio.countdown(after);
      if (this.breatherT <= 0) this._startWave(this.wave + 1);
    }

    // Advance zombies toward the player; resolve reaches and finished
    // death animations. Slow-mo scales movement only, not spawn cadence.
    const moveDt = this.slowmoT > 0 ? dt * SLOWMO_FACTOR : dt;
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.dying) {
        z.deathT += dt;
        if (z.deathT > DEATH_TIME) this.zombies.splice(i, 1);
        continue;
      }
      z.dist -= z.speed * moveDt;
      if (z.dist <= 0) {
        this.lives--;
        this.combo = 0; // a zombie that gets through breaks the combo
        this.nukeAt = NUKE_COMBO;
        this.hitFlash = 0.45;
        if (this.locked === z) this.locked = null;
        this._spawnHitFx(z);
        this.audio.hurt();
        this.zombies.splice(i, 1);
      }
    }

    if (this.lives <= 0) {
      this._gameOver();
      return;
    }

    this._stepParticles(dt);
    this._stepPopups(dt);
    this._updateHud();
  }

  _spawnZombie() {
    if (this.bossWave) {
      this._spawnBoss();
      return;
    }
    // Word length grows per wave: early 3–4 chars, late up to 9 (GDD §3.1).
    const minLen = 3;
    const maxLen = Math.min(9, 4 + Math.floor(this.wave / 2));
    const pool = WORDS.filter((w) => w.length >= minLen && w.length <= maxLen);
    const word = pool[(this.rng() * pool.length) | 0];
    const type = TYPES[(this.rng() * TYPES.length) | 0];

    this.zombies.push({
      worldX: (this.rng() * 2 - 1) * this.laneHalf, // horizontal lane
      dist: FAR_DIST,
      word,
      typed: 0,
      type,
      figH: figHeight(type),
      // world units/sec — ramps gently per wave; runners rush, brutes lumber
      speed: (4.2 + this.wave * 0.62 + this.rng() * 2.2) * type.speedMul,
      dying: false,
      deathT: 0,
      wob: this.rng() * Math.PI * 2, // walk-wobble phase offset
    });
  }

  // A boss carries a 3-word phrase typed in sequence; it advances down the
  // centre lane, alone, slowly (GDD §3.1).
  _spawnBoss() {
    const pool = WORDS.filter((w) => w.length >= 3 && w.length <= 6);
    const phrase = [];
    for (let i = 0; i < 3; i++) {
      phrase.push(pool[(this.rng() * pool.length) | 0]);
    }
    this.zombies.push({
      isBoss: true,
      worldX: 0, // dead centre
      dist: FAR_DIST,
      phrase,
      phraseIdx: 0,
      word: phrase[0], // the word currently being typed
      typed: 0,
      type: BOSS,
      figH: figHeight(BOSS),
      speed: 2.6 + this.wave * 0.18,
      dying: false,
      deathT: 0,
      wob: this.rng() * Math.PI * 2,
    });
    this.audio.boss();
  }

  // Project a zombie's world position onto the screen (pinhole perspective).
  _project(z) {
    const scale = CAM / (z.dist + CAM);
    const sx = this.W / 2 + z.worldX * scale;
    const feetY = this.horizonY + (this.H - this.horizonY) * scale;
    const vis = 0.4 + 0.6 * (1 - z.dist / FAR_DIST); // distance fog
    return { scale, sx, feetY, vis };
  }

  // ---- input & lock-on --------------------------------------------------

  _onKeydown(e) {
    if (!this.enabled) return;
    if (!this.dom.trophyOverlay.hidden) return; // trophy modal is open
    if (e.key === "Tab") {
      e.preventDefault();
      this.reset();
      return;
    }
    if (this.state === "gameover") return; // overlay owns the keyboard
    if (e.target instanceof HTMLInputElement) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const letter = e.key.length === 1 && /[a-zA-Z]/.test(e.key);

    if (this.state === "idle") {
      // "Press any key to begin" — any real key starts the run (bare
      // modifiers don't). A letter also lands as the first typed character.
      if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;
      e.preventDefault();
      this._start();
      if (letter) this._handleChar(e.key.toLowerCase());
      return;
    }

    if (!letter) return; // mid-run, only letters type a zombie's word
    e.preventDefault();
    this._handleChar(e.key.toLowerCase());
  }

  _handleChar(ch) {
    this.keylog.record(ch);

    if (!this.locked) {
      // First letter locks the *closest* zombie whose word starts with it —
      // the most dangerous matching target (GDD §3.1).
      const cands = this.zombies.filter((z) => !z.dying && z.word[0] === ch);
      if (cands.length === 0) return; // matches nothing on screen — ignore
      cands.sort((a, b) => a.dist - b.dist);
      const z = cands[0];
      this.locked = z;
      z.typed = 1;
      this.keysTotal++;
      this._onCorrectKey();
      if (z.typed >= z.word.length) this._wordComplete(z);
      return;
    }

    // Locked: a mistype resets the current word and breaks the combo but
    // keeps the lock (GDD §3.1 Esc/backspace rule).
    const z = this.locked;
    this.keysTotal++;
    if (ch === z.word[z.typed]) {
      this._onCorrectKey();
      z.typed++;
      if (z.typed >= z.word.length) this._wordComplete(z);
    } else {
      z.typed = 0;
      this.combo = 0;
      this.nukeAt = NUKE_COMBO;
      this.cleanStreak = 0;
      this.audio.miss();
    }
  }

  // A correct keystroke — feeds accuracy, the clean streak (which earns
  // Slow-mo), and the typing tick.
  _onCorrectKey() {
    this.keysGood++;
    this.audio.tick();
    this.cleanStreak++;
    if (this.cleanStreak >= SLOWMO_STREAK) {
      this.cleanStreak = 0;
      this._activateSlowmo();
    }
  }

  // Current word fully typed: advance a boss through its phrase, else kill.
  _wordComplete(z) {
    if (z.isBoss && z.phraseIdx < z.phrase.length - 1) {
      z.phraseIdx++;
      z.word = z.phrase[z.phraseIdx];
      z.typed = 0;
      this.combo++;
      this.comboMax = Math.max(this.comboMax, this.combo);
      this.score += 40;
      this.audio.bossHit(this.combo);
    } else {
      this._killZombie(z);
    }
  }

  _killZombie(z) {
    z.dying = true;
    z.deathT = 0;
    this.kills++;
    if (z.isBoss) this.bossKills++;
    this.combo++;
    this.comboMax = Math.max(this.comboMax, this.combo);
    const mult = this._comboMult();
    let pts;
    if (z.isBoss) {
      pts = Math.round(250 * this.wave * mult);
      for (const w of z.phrase) this.killHistory.push({ target: w, typed: w });
    } else {
      pts = Math.round(z.word.length * 10 * mult);
      this.killHistory.push({ target: z.word, typed: z.word });
    }
    this.score += pts;
    this._spawnKillFx(z, pts);
    this.audio.kill(this.combo);
    this.locked = null;
    this._checkNuke();
  }

  // Combo multiplier: +0.5× per 5 clean kills, capped at 5×.
  _comboMult() {
    return Math.min(5, 1 + Math.floor(this.combo / 5) * 0.5);
  }

  // A Nuke is earned each time the combo reaches the next 15-streak mark.
  _checkNuke() {
    if (this.bossWave) return; // nothing else to clear on a boss wave
    if (this.combo >= this.nukeAt) {
      this.nukeAt += NUKE_COMBO;
      this._fireNuke();
    }
  }

  // Nuke power-up — instantly drops every regular zombie on screen.
  _fireNuke() {
    const targets = this.zombies.filter((z) => !z.dying && !z.isBoss);
    if (targets.length === 0) return;
    this.nukes++;
    for (const z of targets) {
      z.dying = true;
      z.deathT = 0;
      this.score += 25; // flat bonus — these were not typed, so no combo
      this._spawnKillFx(z, 25);
    }
    if (this.locked && this.locked.dying) this.locked = null;
    this.nukeFlash = 0.5;
    this.audio.nuke();
    this.popups.push({
      x: this.W / 2, y: this.H * 0.32,
      text: "NUKE", life: 1.1, maxLife: 1.1,
    });
  }

  // Slow-mo power-up — zombies crawl for a few seconds.
  _activateSlowmo() {
    this.slowmos++;
    this.slowmoT = SLOWMO_DURATION;
    this.audio.slowmo();
    this.popups.push({
      x: this.W / 2, y: this.H * 0.4,
      text: "SLOW-MO", life: 1.1, maxLife: 1.1,
    });
  }

  // ---- effects ----------------------------------------------------------

  _spawnKillFx(z, pts) {
    const { sx, feetY, scale } = this._project(z);
    const cy = feetY - z.figH * scale * 0.5;
    const colors = ["#7dd35a", "#4a8c2f", "#2bd62b", "#8a1f1f"];
    const spread = 0.5 + scale;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (50 + Math.random() * 170) * spread;
      this.particles.push({
        x: sx, y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
    this.popups.push({
      x: sx, y: feetY - z.figH * scale - 30,
      text: "+" + pts,
      life: 0.9,
      maxLife: 0.9,
    });
  }

  _spawnHitFx(z) {
    const { sx, feetY } = this._project(z);
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 200;
      this.particles.push({
        x: sx, y: feetY - 30,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 50,
        life: 0.4 + Math.random() * 0.35,
        maxLife: 0.75,
        color: Math.random() < 0.5 ? "#ff3b3b" : "#8a1f1f",
      });
    }
  }

  _stepParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 520 * dt; // gravity
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  _stepPopups(dt) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y -= 52 * dt;
      p.life -= dt;
      if (p.life <= 0) this.popups.splice(i, 1);
    }
  }

  // ---- rendering --------------------------------------------------------

  _resize() {
    // The canvas fills the whole game frame (GameVolt single-frame model).
    const parent = this.dom.canvas.parentElement;
    const cssW = parent.clientWidth || 960;
    const cssH = parent.clientHeight || 540;
    const dpr = window.devicePixelRatio || 1;
    this.dom.canvas.width = cssW * dpr;
    this.dom.canvas.height = cssH * dpr;
    this.dom.canvas.style.height = cssH + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = cssW;
    this.H = cssH;
    this.horizonY = cssH * HORIZON_FRAC;
    this.laneHalf = cssW / 2 - 50;
  }

  _draw() {
    this._drawScene();

    // Bodies far-to-near (painter's algorithm) so close zombies overlap.
    const sorted = [...this.zombies].sort((a, b) => b.dist - a.dist);
    for (const z of sorted) this._drawZombie(z);

    // Word pills on top; the locked one drawn last (frontmost).
    for (const z of sorted) if (z !== this.locked) this._drawPill(z);
    if (this.locked) this._drawPill(this.locked);

    this._drawParticles();
    this._drawPopups();
    this._drawPowerups();
    this._drawWaveBanner();

    // Red flash when a zombie just got through.
    if (this.hitFlash > 0) {
      this.ctx.fillStyle = `rgba(255,59,59,${(this.hitFlash / 0.45) * 0.4})`;
      this.ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  // Slow-mo tint + countdown, and the Nuke flash.
  _drawPowerups() {
    const { ctx, W, H } = this;
    if (this.slowmoT > 0) {
      ctx.fillStyle = "rgba(70,130,230,0.10)";
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#8fb8ff";
      ctx.shadowColor = "#8fb8ff";
      ctx.shadowBlur = 12;
      ctx.font = `700 18px "SF Mono", "JetBrains Mono", Consolas, monospace`;
      ctx.fillText(`◑ SLOW-MO  ${this.slowmoT.toFixed(1)}s`, W / 2, 24);
      ctx.restore();
    }
    if (this.nukeFlash > 0) {
      ctx.fillStyle = `rgba(43,214,43,${(this.nukeFlash / 0.5) * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Centred banner — breather countdown between waves, or a "WAVE n" flash.
  _drawWaveBanner() {
    const { ctx, W, H } = this;
    const mono = '"SF Mono", "JetBrains Mono", Consolas, monospace';
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (this.waveState === "breather") {
      const cy = H * 0.42;
      ctx.fillStyle = "#2bd62b";
      ctx.shadowColor = "#2bd62b";
      ctx.shadowBlur = 18;
      ctx.font = `700 34px ${mono}`;
      ctx.fillText(`WAVE ${this.wave} CLEARED`, W / 2, cy);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#8a8aa0";
      ctx.font = `600 16px "Inter", sans-serif`;
      ctx.fillText(`Next wave in ${Math.ceil(this.breatherT)}…`, W / 2, cy + 36);
    } else if (this.waveBannerT > 0) {
      const p = this.waveBannerT / 1.8;
      ctx.globalAlpha = Math.min(1, p * 2.2); // fade out near the end
      ctx.fillStyle = "#ff3b3b";
      ctx.shadowColor = "#ff3b3b";
      ctx.shadowBlur = 22;
      ctx.font = `700 ${42 + (1 - p) * 16}px ${mono}`;
      ctx.fillText(`WAVE ${this.wave}`, W / 2, H * 0.4);
    }
    ctx.restore();
  }

  // Sky, perspective ground grid, horizon, and the player's defensive line.
  _drawScene() {
    const { ctx, W, H, horizonY } = this;
    const vpx = W / 2;

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, "#06060a");
    sky.addColorStop(1, "#101a12");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, horizonY);

    // ground
    const ground = ctx.createLinearGradient(0, horizonY, 0, H);
    ground.addColorStop(0, "#0b1410");
    ground.addColorStop(1, "#070709");
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizonY, W, H - horizonY);

    // perspective grid — lines fanning from the vanishing point
    ctx.strokeStyle = "rgba(43,214,43,0.07)";
    ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(vpx, horizonY);
      ctx.lineTo(vpx + (i / 6) * W * 1.4, H);
      ctx.stroke();
    }
    // ...and rows that compress toward the horizon
    for (const s of [0.1, 0.2, 0.34, 0.52, 0.76]) {
      const y = horizonY + (H - horizonY) * s;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // horizon glow
    const pulse = Math.sin((this.elapsed / 1000) * 1.5) * 0.5 + 0.5;
    ctx.save();
    ctx.shadowColor = "#2bd62b";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = `rgba(43,214,43,${0.2 + pulse * 0.15})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(W, horizonY);
    ctx.stroke();

    // the player's line — zombies must not cross the bottom edge
    ctx.shadowBlur = 14;
    ctx.strokeStyle = `rgba(43,214,43,${0.55 + pulse * 0.3})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, H - 3);
    ctx.lineTo(W, H - 3);
    ctx.stroke();
    ctx.restore();
  }

  _drawZombie(z) {
    const { ctx } = this;
    const { scale, sx, feetY, vis } = this._project(z);
    const locked = z === this.locked;
    const t = z.type;

    let alpha = vis;
    let s = scale;
    let fall = 0;
    if (z.dying) {
      const p = z.deathT / DEATH_TIME;
      alpha *= 1 - p;
      s *= 1 - p * 0.4;
      fall = p * 0.9; // topple over
    }
    const sway = Math.sin(this.elapsed / 300 + z.wob) * 5 * scale;

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    // ground shadow — sized to the variant's footprint
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(sx + sway, feetY + 3 * s, t.bodyW * 0.5 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(sx + sway, feetY);
    ctx.rotate(Math.sin(this.elapsed / 140 + z.wob) * 0.07 + fall);
    ctx.scale(s, s);

    const body = z.dying ? "#5e2f2f" : t.body;
    const edge = locked ? "#2bd62b" : z.dying ? "#a23b3b" : t.edge;
    if (locked) {
      ctx.shadowColor = "#2bd62b";
      ctx.shadowBlur = 18;
    }
    ctx.fillStyle = body;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2.5;

    // Figure geometry (feet at local y=0, figure rises into negative y).
    const bodyTop = -(t.legH + t.bodyH);
    const headCY = bodyTop - t.headR + 4;
    const armW = t.bodyW * 0.2;
    const armLen = t.bodyH * 0.66;
    const shoulderY = bodyTop + t.bodyH * 0.16;

    // arms first, so the body overlaps the shoulders
    for (const side of [-1, 1]) {
      rrect(ctx, side * (t.bodyW / 2 - armW * 0.35) - armW / 2,
        shoulderY, armW, armLen, armW * 0.45);
      ctx.fill();
      ctx.stroke();
    }
    // body
    rrect(ctx, -t.bodyW / 2, bodyTop, t.bodyW, t.bodyH,
      t.square ? 7 : t.bodyW * 0.34);
    ctx.fill();
    ctx.stroke();
    // head — boxy or round depending on the variant
    if (t.square) {
      rrect(ctx, -t.headR, headCY - t.headR, t.headR * 2, t.headR * 2,
        t.headR * 0.5);
    } else {
      ctx.beginPath();
      ctx.arc(0, headCY, t.headR, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    // glowing eyes, tinted per variant
    ctx.fillStyle = t.eye;
    ctx.shadowColor = t.eye;
    ctx.shadowBlur = 6;
    const er = t.headR * 0.22;
    const ey = headCY - t.headR * 0.1;
    const ex = t.headR * 0.36;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawPill(z) {
    if (z.isBoss) {
      this._drawBossPill(z);
      return;
    }
    const { ctx, W } = this;
    const { scale, sx, feetY } = this._project(z);
    const locked = z === this.locked;
    // Font scales with depth but never below a readable floor (GDD §8).
    const size = Math.max(14, Math.round((locked ? 32 : 29) * scale));
    ctx.font = `700 ${size}px "SF Mono", "JetBrains Mono", Consolas, monospace`;
    ctx.textBaseline = "middle";

    const typed = z.word.slice(0, z.typed);
    const rest = z.word.slice(z.typed);
    const wTyped = ctx.measureText(typed).width;
    const wTotal = wTyped + ctx.measureText(rest).width;

    const padX = 9;
    const h = size + 12;
    const half = wTotal / 2 + padX;
    const cx = Math.max(half + 2, Math.min(W - half - 2, sx));
    const cy = feetY - z.figH * scale - 16 - h / 2;

    ctx.save();
    if (locked) {
      ctx.shadowColor = "#2bd62b";
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = "rgba(8,8,13,0.9)";
    ctx.strokeStyle = locked ? "#2bd62b" : "rgba(60,60,78,0.9)";
    ctx.lineWidth = locked ? 2 : 1;
    rrect(ctx, cx - half, cy - h / 2, wTotal + padX * 2, h, h / 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    const startX = cx - wTotal / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = "#2bd62b";
    ctx.fillText(typed, startX, cy + 1);
    ctx.fillStyle = "#e6e6f0";
    ctx.fillText(rest, startX + wTyped, cy + 1);
    ctx.restore();
  }

  // Boss pill — the whole phrase: done words green, the current word split
  // typed/untyped, upcoming words dim.
  _drawBossPill(z) {
    const { ctx, W } = this;
    const { scale, sx, feetY } = this._project(z);
    const size = Math.max(18, Math.round(30 * scale));
    ctx.font = `700 ${size}px "SF Mono", "JetBrains Mono", Consolas, monospace`;
    ctx.textBaseline = "middle";

    const segs = [];
    z.phrase.forEach((w, i) => {
      if (i > 0) segs.push({ text: " ", color: null });
      if (i < z.phraseIdx) {
        segs.push({ text: w, color: "#2bd62b" });
      } else if (i === z.phraseIdx) {
        segs.push({ text: w.slice(0, z.typed), color: "#2bd62b" });
        segs.push({ text: w.slice(z.typed), color: "#e6e6f0" });
      } else {
        segs.push({ text: w, color: "#5a5a70" });
      }
    });
    const total = segs.reduce((s, g) => s + ctx.measureText(g.text).width, 0);
    const padX = 14;
    const h = size + 16;
    const half = total / 2 + padX;
    const cx = Math.max(half + 2, Math.min(W - half - 2, sx));
    const cy = feetY - z.figH * scale - 20 - h / 2;

    ctx.save();
    ctx.shadowColor = "#ff3b3b";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "rgba(10,6,8,0.92)";
    ctx.strokeStyle = "#ff3b3b";
    ctx.lineWidth = 2.5;
    rrect(ctx, cx - half, cy - h / 2, total + padX * 2, h, h / 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.textAlign = "left";
    let x = cx - total / 2;
    for (const g of segs) {
      const w = ctx.measureText(g.text).width;
      if (g.color) {
        ctx.fillStyle = g.color;
        ctx.fillText(g.text, x, cy + 1);
      }
      x += w;
    }
    ctx.restore();
  }

  _drawParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3.5, 3.5);
    }
    ctx.globalAlpha = 1;
  }

  _drawPopups() {
    const { ctx } = this;
    ctx.font = `700 17px "SF Mono", "JetBrains Mono", Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const p of this.popups) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = "#2bd62b";
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  // ---- HUD & leaderboard ------------------------------------------------

  _updateHud() {
    let hearts = "";
    for (let i = 0; i < MAX_LIVES; i++) {
      hearts += `<span class="heart${i < this.lives ? "" : " heart--lost"}">♥</span>`;
    }
    this.dom.lives.innerHTML = hearts;
    this.dom.score.textContent = this.score;
    this.dom.combo.textContent = this.combo;
    this.dom.mult.textContent =
      this.combo > 0 ? `combo ×${this._comboMult().toFixed(1)}` : "combo";
    this.dom.wave.textContent = this.wave;
  }

  _saveScore() {
    if (!this.lastResult) return;
    const name = this.dom.nameInput.value.trim() || "Anonymous";
    localStorage.setItem(NAME_KEY, name);
    addScore({
      name,
      mode: MODE,
      bucket: this._bucket(),
      score: this.lastResult.score,
      wave: this.lastResult.wave,
      accuracy: this.lastResult.accuracy,
      wpm: this.lastResult.wpm,
    });
    this.dom.saveForm.hidden = true;
    this.dom.saved.hidden = false;
    this._renderLeaderboard();
  }

  async _renderLeaderboard() {
    // Prefer the server-validated board when signed in; else the local one.
    if (remoteEnabled()) {
      const bucket = this.daily ? todayKey() : "all";
      const rows = await board("zombie", bucket, 10);
      if (rows) {
        this._paintBoard(
          rows.map((r) => ({ name: r.username, main: r.score, sub: "" })),
          this.daily ? `daily · ${todayKey()}` : "global",
        );
        return;
      }
    }
    const rows = topScores(MODE, this._bucket(), ["score", "wave"]);
    this._paintBoard(
      rows.map((r) => ({ name: r.name, main: r.score, sub: "wave " + r.wave })),
      this.daily ? `daily · ${todayKey()}` : "all-time",
    );
  }

  _paintBoard(rows, sub) {
    this.dom.lbSub.textContent = sub;
    this.dom.lbEmpty.hidden = rows.length > 0;
    this.dom.lbList.replaceChildren(
      ...rows.map((r, i) => {
        const li = document.createElement("li");
        li.className = "lb-row" + (i === 0 ? " lb-row--top" : "");
        li.innerHTML =
          `<span class="lb-rank">${i + 1}</span>` +
          `<span class="lb-name"></span>` +
          `<span class="lb-wpm">${r.main}</span>` +
          `<span class="lb-acc">${r.sub}</span>`;
        li.querySelector(".lb-name").textContent = r.name;
        return li;
      }),
    );
  }
}
