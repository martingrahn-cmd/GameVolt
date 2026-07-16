// Trophies & achievements (GDD §5) — modelled on Asteroid Storm's system:
// 31 tiered trophies (15 bronze / 10 silver / 5 gold / 1 platinum), career
// stats, and a queued toast on unlock. A client-side stand-in for the
// GameVolt shared trophy table; recordRun() becomes a server call later.

import { todayKey, yesterdayKey } from "./daily.js";

const PROFILE_KEY = "tod_profile_v2";

export const TIERS = {
  bronze: { label: "BRONZE", color: "#cd7f32" },
  silver: { label: "SILVER", color: "#c0c0c0" },
  gold: { label: "GOLD", color: "#ffd700" },
  platinum: { label: "PLATINUM", color: "#b4ffff" },
};

// Each trophy: id, name, desc, icon, tier, and a check(ctx) predicate.
// ctx = { run, stats, best, daily } — run is the just-finished run, the
// rest are the lifetime profile. Platinum is handled separately.
export const TROPHIES = [
  // ── Bronze (15) — natural play ──
  { id: "first-blood", name: "First Blood", desc: "Kill your first zombie.", icon: "☠️", tier: "bronze", check: (c) => c.stats.kills >= 1 },
  { id: "combo-10", name: "On a Roll", desc: "Reach a 10-combo.", icon: "🔥", tier: "bronze", check: (c) => c.best.combo >= 10 },
  { id: "wpm-40", name: "Warmed Up", desc: "Hit 40 WPM in a Speed Test.", icon: "⌨️", tier: "bronze", check: (c) => c.best.wpm >= 40 },
  { id: "wave-3", name: "Holding the Line", desc: "Reach wave 3.", icon: "🧟", tier: "bronze", check: (c) => c.best.wave >= 3 },
  { id: "boss-slayer", name: "Boss Slayer", desc: "Kill a boss zombie.", icon: "👹", tier: "bronze", check: (c) => c.stats.bosses >= 1 },
  { id: "nuke", name: "Scorched Earth", desc: "Trigger a Nuke.", icon: "💥", tier: "bronze", check: (c) => c.stats.nukes >= 1 },
  { id: "slowmo", name: "Bullet Time", desc: "Trigger Slow-mo.", icon: "🐌", tier: "bronze", check: (c) => c.stats.slowmos >= 1 },
  { id: "accuracy-95", name: "Steady Hands", desc: "Finish a run at 95%+ accuracy.", icon: "🎯", tier: "bronze", check: (c) => (c.run.accuracy || 0) >= 95 },
  { id: "kills-50", name: "Exterminator", desc: "Kill 50 zombies in total.", icon: "🪓", tier: "bronze", check: (c) => c.stats.kills >= 50 },
  { id: "daily-1", name: "Daily Grind", desc: "Play a Daily Challenge.", icon: "📅", tier: "bronze", check: (c) => c.stats.dailyRuns >= 1 },
  { id: "speedtest-done", name: "Clocked In", desc: "Finish a Speed Test.", icon: "⏱️", tier: "bronze", check: (c) => c.stats.speedtestRuns >= 1 },
  { id: "zombie-done", name: "Outbreak", desc: "Finish a Zombie run.", icon: "🧟", tier: "bronze", check: (c) => c.stats.zombieRuns >= 1 },
  { id: "versus-played", name: "Pass the Keyboard", desc: "Play a 2-player match.", icon: "👥", tier: "bronze", check: (c) => c.stats.versusRuns >= 1 },
  { id: "runs-10", name: "Regular", desc: "Play 10 runs.", icon: "🎮", tier: "bronze", check: (c) => c.stats.runs >= 10 },
  { id: "words-500", name: "Wordsmith", desc: "Type 500 words in total.", icon: "📝", tier: "bronze", check: (c) => c.stats.wordsTyped >= 500 },

  // ── Silver (10) — needs skill ──
  { id: "combo-25", name: "Combo Master", desc: "Reach a 25-combo.", icon: "🔥", tier: "silver", check: (c) => c.best.combo >= 25 },
  { id: "wpm-80", name: "Fast Fingers", desc: "Hit 80 WPM in a Speed Test.", icon: "⌨️", tier: "silver", check: (c) => c.best.wpm >= 80 },
  { id: "wave-6", name: "Frontline", desc: "Reach wave 6.", icon: "🧟", tier: "silver", check: (c) => c.best.wave >= 6 },
  { id: "accuracy-100", name: "Flawless", desc: "Finish a run at 100% accuracy.", icon: "💯", tier: "silver", check: (c) => c.run.accuracy === 100 },
  { id: "boss-hunter", name: "Boss Hunter", desc: "Kill 10 bosses in total.", icon: "👹", tier: "silver", check: (c) => c.stats.bosses >= 10 },
  { id: "kills-500", name: "Cleanser", desc: "Kill 500 zombies in total.", icon: "🪓", tier: "silver", check: (c) => c.stats.kills >= 500 },
  { id: "streak-3", name: "Committed", desc: "Reach a 3-day Daily streak.", icon: "📅", tier: "silver", check: (c) => c.daily.streak >= 3 },
  { id: "score-5000", name: "High Roller", desc: "Score 5,000 in a Zombie run.", icon: "🏆", tier: "silver", check: (c) => c.best.score >= 5000 },
  { id: "nuke-master", name: "Fallout", desc: "Trigger 10 Nukes in total.", icon: "💥", tier: "silver", check: (c) => c.stats.nukes >= 10 },
  { id: "runs-50", name: "Devoted", desc: "Play 50 runs.", icon: "🎮", tier: "silver", check: (c) => c.stats.runs >= 50 },

  // ── Gold (5) — hard ──
  { id: "combo-50", name: "Unstoppable", desc: "Reach a 50-combo.", icon: "🔥", tier: "gold", check: (c) => c.best.combo >= 50 },
  { id: "wpm-120", name: "Speed Demon", desc: "Hit 120 WPM in a Speed Test.", icon: "⌨️", tier: "gold", check: (c) => c.best.wpm >= 120 },
  { id: "wave-12", name: "Last Survivor", desc: "Reach wave 12.", icon: "🧟", tier: "gold", check: (c) => c.best.wave >= 12 },
  { id: "streak-7", name: "Obsessed", desc: "Reach a 7-day Daily streak.", icon: "📅", tier: "gold", check: (c) => c.daily.streak >= 7 },
  { id: "score-15000", name: "Apex Predator", desc: "Score 15,000 in a Zombie run.", icon: "🏆", tier: "gold", check: (c) => c.best.score >= 15000 },

  // ── Platinum (1) ──
  { id: "platinum", name: "Type or Die", desc: "Unlock all 30 other trophies.", icon: "🌟", tier: "platinum", check: () => false },
];

function blankProfile() {
  return {
    unlocked: {}, // trophy id -> ISO date earned
    stats: {
      runs: 0, zombieRuns: 0, speedtestRuns: 0, dailyRuns: 0, versusRuns: 0,
      kills: 0, bosses: 0, nukes: 0, slowmos: 0, wordsTyped: 0,
    },
    best: { wpm: 0, combo: 0, wave: 0, score: 0 },
    daily: { last: null, streak: 0 },
  };
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return blankProfile();
    const p = JSON.parse(raw);
    const base = blankProfile();
    return {
      unlocked: p.unlocked || {},
      stats: { ...base.stats, ...p.stats },
      best: { ...base.best, ...p.best },
      daily: { ...base.daily, ...p.daily },
    };
  } catch {
    return blankProfile();
  }
}

function save(p) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* storage full or blocked — non-critical */
  }
}

// Number of trophies unlocked (out of TROPHIES.length).
export function unlockedCount(p = loadProfile()) {
  return TROPHIES.filter((t) => p.unlocked[t.id]).length;
}

// True if the SDK's cached cloud set already holds this (bare) trophy id — used
// to gate toasts so a trophy earned on another device isn't re-toasted here.
function cloudUnlocked(id) {
  return !!(
    window.GameVolt &&
    window.GameVolt.achievements?.isUnlocked &&
    window.GameVolt.achievements.isUnlocked(id)
  );
}

// Cross-device: merge cloud-earned trophy ids into the local profile so a
// second signed-in device shows the right count and never re-toasts them.
// `ids` is the Set (or iterable) from GameVolt.achievements.getUnlockedIds().
// Returns true if anything new was merged.
export function backfillTrophies(ids) {
  if (!ids || !ids.forEach) return false;
  const p = loadProfile();
  const today = todayKey();
  let changed = false;
  ids.forEach((id) => {
    if (!p.unlocked[id]) {
      p.unlocked[id] = today;
      changed = true;
    }
  });
  if (changed) save(p);
  return changed;
}

// Register a localStorage → cloud migration so a guest's trophies and career
// stats follow them when they sign in (the SDK runs this once per session on
// sign-in). Scores are deliberately NOT migrated: the GameVolt board for this
// game is server-validated behind the keystroke-log validator (see api.js), so
// only runs the server proves can ever count — handing the SDK a client score
// would be exactly the cheat the validator exists to block. Safe to call
// whenever the SDK is present; a no-op otherwise.
export function registerCloudMigration() {
  if (!window.GameVolt?.save?.registerMigration) return;
  window.GameVolt.save.registerMigration({
    keys: [PROFILE_KEY],
    merge(localData, cloudData) {
      // Prefer existing cloud progress; fall back to the local profile for a
      // fresh account. This backs up stats/best so they survive a sign-in on a
      // new device — the game itself still reads from localStorage.
      return cloudData || localData[PROFILE_KEY] || blankProfile();
    },
    getAchievements(localData) {
      const prof = localData[PROFILE_KEY];
      if (!prof || !prof.unlocked) return [];
      // Raw trophy ids — the SDK prefixes each with "type-or-die-", matching
      // how recordRun() calls achievements.unlock(t.id).
      return Object.keys(prof.unlocked).map((id) => ({
        id,
        unlocked_at: prof.unlocked[id],
      }));
    },
  });
}

// Fold a finished run into the profile; return the trophies it newly
// unlocked. run: { mode, accuracy, daily, versus, wpm?, words?, kills?,
// bosses?, comboMax?, wave?, score?, nukes?, slowmos? }
export function recordRun(run) {
  const p = loadProfile();
  const today = todayKey();
  p.stats.runs++;

  if (run.mode === "zombie") {
    p.stats.zombieRuns++;
    p.stats.kills += run.kills || 0;
    p.stats.bosses += run.bosses || 0;
    p.stats.nukes += run.nukes || 0;
    p.stats.slowmos += run.slowmos || 0;
    p.stats.wordsTyped += run.kills || 0; // each kill is one typed word
    p.best.wave = Math.max(p.best.wave, run.wave || 0);
    p.best.combo = Math.max(p.best.combo, run.comboMax || 0);
    p.best.score = Math.max(p.best.score, run.score || 0);
  } else {
    p.stats.speedtestRuns++;
    p.stats.wordsTyped += run.words || 0;
    p.best.wpm = Math.max(p.best.wpm, run.wpm || 0);
  }
  if (run.versus) p.stats.versusRuns++;
  if (run.daily) {
    p.stats.dailyRuns++;
    if (p.daily.last !== today) {
      p.daily.streak = p.daily.last === yesterdayKey() ? p.daily.streak + 1 : 1;
      p.daily.last = today;
    }
  }

  const ctx = { run, stats: p.stats, best: p.best, daily: p.daily };
  const newly = [];
  for (const t of TROPHIES) {
    if (t.tier === "platinum") continue;
    // Skip anything already earned locally, or in the cloud on another device
    // (isUnlocked reads the SDK's cached set), so it isn't re-toasted here.
    if (!p.unlocked[t.id] && !cloudUnlocked(t.id) && t.check(ctx)) {
      p.unlocked[t.id] = today;
      newly.push(t);
    }
  }
  // Platinum unlocks once every other trophy is in.
  const plat = TROPHIES.find((t) => t.tier === "platinum");
  if (
    !p.unlocked[plat.id] &&
    !cloudUnlocked(plat.id) &&
    TROPHIES.every((t) => t.tier === "platinum" || p.unlocked[t.id])
  ) {
    p.unlocked[plat.id] = today;
    newly.push(plat);
  }

  save(p);
  for (const t of newly) showToast(t);

  // Mirror to the GameVolt cloud (no-op standalone). The SDK persists the
  // unlock under "type-or-die-<id>" for the signed-in user; our own toast
  // already plays, so we don't trigger the SDK toast as well.
  if (window.GameVolt?.achievements) {
    for (const t of newly) {
      try { window.GameVolt.achievements.unlock(t.id); } catch { /* offline */ }
    }
  }

  // End-of-run telemetry (single chokepoint — recordRun fires once per run).
  const score = run.mode === "zombie" ? run.score || 0 : run.wpm || 0;
  window.GameVoltTracker?.end({
    score,
    level: run.wave || null,
    outcome: run.mode === "zombie" ? "game_over" : "complete",
  });
  window.gvPost?.("score", { mode: run.mode, score });

  return newly;
}

// ---- unlock toast (queued, one at a time) -------------------------------

let toastQueue = [];
let toastBusy = false;

function showToast(trophy) {
  toastQueue.push(trophy);
  if (!toastBusy) nextToast();
}

function nextToast() {
  if (!toastQueue.length) {
    toastBusy = false;
    return;
  }
  toastBusy = true;
  const t = toastQueue.shift();
  const el = document.getElementById("trophy-toast");
  if (!el) {
    toastBusy = false;
    return;
  }
  const tier = TIERS[t.tier];
  el.querySelector(".tt-icon").textContent = t.icon;
  el.querySelector(".tt-name").textContent = t.name;
  const tierEl = el.querySelector(".tt-tier");
  tierEl.textContent = tier.label;
  tierEl.style.color = tier.color;
  el.style.borderColor = tier.color;
  el.classList.add("show");
  toastDing(t.tier);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(nextToast, 450);
  }, 3000);
}

// A short rising chime — brighter for gold/platinum. Self-contained so it
// works for both modes; respects the game's mute setting.
let toastCtx = null;
function toastDing(tier) {
  if (localStorage.getItem("tod_muted") === "1") return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!toastCtx) toastCtx = new AC();
    if (toastCtx.state === "suspended") toastCtx.resume();
    const ctx = toastCtx;
    const now = ctx.currentTime;
    const notes =
      tier === "gold" || tier === "platinum"
        ? [659, 988, 1319]
        : [587, 880];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      const t0 = now + i * 0.1;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.5);
    });
  } catch {
    /* no audio — the visual toast is enough */
  }
}
