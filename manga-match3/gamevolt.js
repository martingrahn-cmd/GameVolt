/* ── GameVolt.io Integration ── */

import { ACHIEVEMENTS, ACHIEVEMENT_COUNT } from "./achievements.js";

const STATS_KEY = "manga-match-stats-v1";

function loadStats() {
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveStats(stats) {
  try { window.localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
}

const stats = loadStats();

function getStat(key) { return stats[key] ?? 0; }

function addStat(key, amount = 1) {
  stats[key] = (stats[key] ?? 0) + amount;
  saveStats(stats);
  return stats[key];
}

function setStat(key, value) {
  if (value > (stats[key] ?? 0)) {
    stats[key] = value;
    saveStats(stats);
  }
  return stats[key];
}

/* ── Unlocked tracking ── */
const UNLOCKED_KEY = "manga-match-trophies-v1";

function loadUnlocked() {
  try {
    const raw = window.localStorage.getItem(UNLOCKED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveUnlocked(set) {
  try { window.localStorage.setItem(UNLOCKED_KEY, JSON.stringify([...set])); } catch {}
}

const unlocked = loadUnlocked();

function isUnlocked(id) { return unlocked.has(id); }

function unlock(id) {
  if (unlocked.has(id)) return false;
  unlocked.add(id);
  saveUnlocked(unlocked);
  if (window.GameVolt) {
    try { window.GameVolt.achievements.unlock(id); } catch {}
  }
  return true;
}

function getUnlockedCount() { return unlocked.size; }

/* ── Achievement checking ── */

function checkAchievements(context) {
  const newlyUnlocked = [];

  const checks = {
    first_match: () => getStat("totalMatches") >= 1,
    stage_1: () => getStat("stagesCleared") >= 1,
    stage_5: () => getStat("maxStageCleared") >= 5,
    stage_10: () => getStat("maxStageCleared") >= 10,
    stage_20: () => getStat("maxStageCleared") >= 20,
    stage_30: () => getStat("maxStageCleared") >= 30,
    first_special: () => getStat("totalSpecials") >= 1,
    first_line: () => getStat("totalLines") >= 1,
    first_bomb: () => getStat("totalBombs") >= 1,
    first_color: () => getStat("totalColors") >= 1,
    chain_2: () => getStat("maxChain") >= 2,
    chain_4: () => getStat("maxChain") >= 4,
    chain_6: () => getStat("maxChain") >= 6,
    fever_first: () => getStat("totalFevers") >= 1,
    fever_5: () => getStat("totalFevers") >= 5,
    score_5k: () => getStat("maxStageScore") >= 5000,
    score_10k: () => getStat("maxStageScore") >= 10000,
    score_20k: () => getStat("maxStageScore") >= 20000,
    clear_50: () => getStat("maxStageClear") >= 50,
    stars_10: () => getStat("totalStars") >= 10,
    stars_30: () => getStat("totalStars") >= 30,
    stars_90: () => getStat("totalStars") >= 90,
    three_stars: () => getStat("has3Star") >= 1,
    daily_first: () => getStat("dailiesCompleted") >= 1,
    daily_streak_3: () => getStat("maxDailyStreak") >= 3,
    daily_streak_7: () => getStat("maxDailyStreak") >= 7,
    coins_500: () => getStat("totalCoinsEarned") >= 500,
    ink_clear_20: () => getStat("totalInkCleared") >= 20,
    locks_break_15: () => getStat("totalLocksBreaked") >= 15,
    powerup_use_5: () => getStat("totalPowerupsUsed") >= 5,
  };

  for (const ach of ACHIEVEMENTS) {
    if (ach.id === "manga_master") continue;
    if (isUnlocked(ach.id)) continue;
    const check = checks[ach.id];
    if (check && check()) {
      unlock(ach.id);
      newlyUnlocked.push(ach);
    }
  }

  // Platinum check
  if (!isUnlocked("manga_master") && getUnlockedCount() >= ACHIEVEMENT_COUNT - 1) {
    unlock("manga_master");
    newlyUnlocked.push(ACHIEVEMENTS.find((a) => a.id === "manga_master"));
  }

  return newlyUnlocked;
}

/* ── Leaderboard ── */

async function submitScore(score) {
  if (!window.GameVolt) return;
  try { await window.GameVolt.leaderboard.submit(score, { mode: "default" }); } catch {}
}

async function getLeaderboard(limit = 50) {
  if (!window.GameVolt) return [];
  try { return await window.GameVolt.leaderboard.get({ mode: "default", limit }); } catch { return []; }
}

async function getMyRank() {
  if (!window.GameVolt) return null;
  try { return await window.GameVolt.leaderboard.getRank({ mode: "default" }); } catch { return null; }
}

/* ── Init ── */

function init() {
  if (window.GameVolt) {
    try { window.GameVolt.init("manga-match"); } catch {}
  }
}

export const gamevolt = {
  init,
  getStat, addStat, setStat,
  isUnlocked, unlock, getUnlockedCount,
  checkAchievements,
  submitScore, getLeaderboard, getMyRank,
  loadStats: () => stats,
};
