// ============================================================
// nc-achievements.js — 31 trophies for Neon Cycles (working title).
//
// Standard GameVolt tier structure: 15 bronze / 10 silver / 5 gold /
// 1 platinum ("unlock all the others"). The stats -> unlock logic is pure
// (onEvent/evaluate take and return plain objects) so it's testable in Node;
// everything that touches localStorage, the DOM or the GameVolt SDK is
// guarded and browser-only.
//
// GameVolt integration (all optional, per convention):
//   - unlock() persists via GameVolt.achievements.unlock (SDK prefixes ids
//     with the game slug) and shows GameVolt.ui.achievementToast — the SDK
//     unlock itself never toasts
//   - gate on GameVolt.achievements.isUnlocked so a trophy earned on another
//     device doesn't re-toast here
//   - initSDK() registers the localStorage -> cloud migration and backfills
//     cloud-earned trophies into local state on login
// ============================================================
(function (global) {
  'use strict';

  // Ticks are 70 ms: 30s=428, 60s=857, 150s=2142, <15s=214, 45s+=642.
  var LIST = [
    // ---- bronze (15) — natural play ----
    { id: 'first-ride',    name: 'First Ride',     desc: 'Finish your first match',              icon: '🏁', tier: 'bronze',   cond: function (s) { return s.matches >= 1; } },
    { id: 'first-crash',   name: 'Derezzed',       desc: 'Crash for the first time',             icon: '💥', tier: 'bronze',   cond: function (s) { return s.crashes >= 1; } },
    { id: 'first-blood',   name: 'First Blood',    desc: 'Win a round against the AI',           icon: '⚔️', tier: 'bronze',   cond: function (s) { return s.ai_round_wins >= 1; } },
    { id: 'easy-rider',    name: 'Easy Rider',     desc: 'Win a match vs the Easy AI',           icon: '🎮', tier: 'bronze',   cond: function (s) { return s.ai_wins_easy >= 1; } },
    { id: 'double-trouble',name: 'Double Trouble', desc: 'Be part of a double crash',            icon: '🤝', tier: 'bronze',   cond: function (s) { return s.doubles >= 1; } },
    { id: 'local-hero',    name: 'Local Hero',     desc: 'Finish a 2-player local match',        icon: '👥', tier: 'bronze',   cond: function (s) { return s.p2_matches >= 1; } },
    { id: 'solo-debut',    name: 'Solo Debut',     desc: 'Finish a solo practice run',           icon: '🚦', tier: 'bronze',   cond: function (s) { return s.solo_runs >= 1; } },
    { id: 'survivor-30',   name: 'Half Minute',    desc: 'Survive 30 seconds in one solo run',   icon: '⏱️', tier: 'bronze',   cond: function (s) { return s.solo_best >= 428; } },
    { id: 'rounds-10',     name: 'Warmed Up',      desc: 'Play 10 rounds',                       icon: '🔄', tier: 'bronze',   cond: function (s) { return s.rounds >= 10; } },
    { id: 'matches-5',     name: 'Night Shift',    desc: 'Play 5 matches',                       icon: '🌙', tier: 'bronze',   cond: function (s) { return s.matches >= 5; } },
    { id: 'road-trip',     name: 'Road Trip',      desc: 'Ride 2,500 cells in total',            icon: '🛣️', tier: 'bronze',   cond: function (s) { return s.distance >= 2500; } },
    { id: 'crash-course',  name: 'Crash Course',   desc: 'Crash 10 times',                       icon: '🧨', tier: 'bronze',   cond: function (s) { return s.crashes >= 10; } },
    { id: 'ai-rounds-5',   name: 'Round Winner',   desc: 'Win 5 rounds against the AI',          icon: '🎖️', tier: 'bronze',   cond: function (s) { return s.ai_round_wins >= 5; } },
    { id: 'streak-2',      name: 'Back to Back',   desc: 'Win 2 AI rounds in a row',             icon: '✌️', tier: 'bronze',   cond: function (s) { return s.ai_best_streak >= 2; } },
    { id: 'quick-round',   name: 'Lightning Lap',  desc: 'Win an AI round in under 15 seconds',  icon: '⚡', tier: 'bronze',   cond: function (s) { return s.quick_wins >= 1; } },
    // ---- silver (10) — skill & dedication ----
    { id: 'medium-well',   name: 'Medium Well',    desc: 'Win a match vs the Medium AI',         icon: '🎯', tier: 'silver',   cond: function (s) { return s.ai_wins_medium >= 1; } },
    { id: 'streak-4',      name: 'On Fire',        desc: 'Win 4 AI rounds in a row',             icon: '🔥', tier: 'silver',   cond: function (s) { return s.ai_best_streak >= 4; } },
    { id: 'survivor-60',   name: 'Full Minute',    desc: 'Survive 60 seconds in one solo run',   icon: '⏳', tier: 'silver',   cond: function (s) { return s.solo_best >= 857; } },
    { id: 'marathon',      name: 'Marathon Rider', desc: 'Ride 10,000 cells in total',           icon: '🚴', tier: 'silver',   cond: function (s) { return s.distance >= 10000; } },
    { id: 'ai-rounds-25',  name: 'Round Collector',desc: 'Win 25 rounds against the AI',         icon: '🏅', tier: 'silver',   cond: function (s) { return s.ai_round_wins >= 25; } },
    { id: 'rounds-100',    name: 'Veteran',        desc: 'Play 100 rounds',                      icon: '📀', tier: 'silver',   cond: function (s) { return s.rounds >= 100; } },
    { id: 'endurance',     name: 'War of Nerves',  desc: 'Win an AI round lasting 45+ seconds',  icon: '🕰️', tier: 'silver',   cond: function (s) { return s.long_wins >= 1; } },
    { id: 'flawless',      name: 'Flawless',       desc: 'Beat any AI 3–0',                      icon: '✨', tier: 'silver',   cond: function (s) { return s.flawless >= 1; } },
    { id: 'comeback-kid',  name: 'Comeback Kid',   desc: 'Win a match after trailing 0–2',       icon: '💪', tier: 'silver',   cond: function (s) { return s.comebacks >= 1; } },
    { id: 'matches-25',    name: 'Regular',        desc: 'Play 25 matches',                      icon: '🎪', tier: 'silver',   cond: function (s) { return s.matches >= 25; } },
    // ---- gold (5) — hardcore ----
    { id: 'hard-boiled',   name: 'Hard Boiled',    desc: 'Win a match vs the Hard AI',           icon: '💀', tier: 'gold',     cond: function (s) { return s.ai_wins_hard >= 1; } },
    { id: 'survivor-150',  name: 'Iron Rider',     desc: 'Survive 150 seconds in one solo run',  icon: '⌛', tier: 'gold',     cond: function (s) { return s.solo_best >= 2142; } },
    { id: 'streak-8',      name: 'Unstoppable',    desc: 'Win 8 AI rounds in a row',             icon: '🌋', tier: 'gold',     cond: function (s) { return s.ai_best_streak >= 8; } },
    { id: 'hard-flawless', name: 'Perfect Circuit',desc: 'Beat the Hard AI 3–0',                 icon: '👑', tier: 'gold',     cond: function (s) { return s.hard_flawless >= 1; } },
    { id: 'globetrotter',  name: 'Globetrotter',   desc: 'Ride 100,000 cells in total',          icon: '🌍', tier: 'gold',     cond: function (s) { return s.distance >= 100000; } },
    // ---- platinum (1) — completionist ----
    { id: 'neon-legend',   name: 'Neon Legend',    desc: 'Unlock all other 30 trophies',         icon: '🌟', tier: 'platinum', cond: null }
  ];

  var DEFAULTS = {
    matches: 0, rounds: 0, crashes: 0, doubles: 0, distance: 0,
    ai_round_wins: 0, ai_streak: 0, ai_best_streak: 0,
    ai_wins_easy: 0, ai_wins_medium: 0, ai_wins_hard: 0,
    flawless: 0, hard_flawless: 0, comebacks: 0,
    quick_wins: 0, long_wins: 0,
    p2_matches: 0, solo_runs: 0, solo_best: 0
  };

  // ---- pure logic (Node-testable) ----

  function freshStats() {
    var s = {};
    for (var k in DEFAULTS) s[k] = DEFAULTS[k];
    return s;
  }

  function onEvent(s, name, d) {
    d = d || {};
    if (name === 'round') {
      s.rounds++;
      s.distance += d.myDistance || 0;
      if (d.double) s.doubles++;
      if (d.iCrashed) s.crashes++;
      if (d.mode === 'ai') {
        if (d.winner === 1) {
          s.ai_round_wins++;
          s.ai_streak++;
          if (s.ai_streak > s.ai_best_streak) s.ai_best_streak = s.ai_streak;
          if (d.ticks < 214) s.quick_wins++;
          if (d.ticks >= 642) s.long_wins++;
        } else if (d.winner === 2) {
          s.ai_streak = 0;
        }
      }
    } else if (name === 'match') {
      s.matches++;
      if (d.mode === '2p') s.p2_matches++;
      if (d.mode === 'ai' && d.myWin) {
        if (d.aiLevel === 'easy') s.ai_wins_easy++;
        if (d.aiLevel === 'medium') s.ai_wins_medium++;
        if (d.aiLevel === 'hard') s.ai_wins_hard++;
        if (d.flawless) { s.flawless++; if (d.aiLevel === 'hard') s.hard_flawless++; }
        if (d.comeback) s.comebacks++;
      }
    } else if (name === 'solo') {
      s.matches++;
      s.solo_runs++;
      s.crashes++;
      s.distance += d.ticks || 0;
      if ((d.ticks || 0) > s.solo_best) s.solo_best = d.ticks;
    }
    return s;
  }

  // Newly earned ids for these stats given what's already unlocked.
  function evaluate(s, unlockedIds) {
    var have = {};
    (unlockedIds || []).forEach(function (id) { have[id] = true; });
    var earned = [];
    for (var i = 0; i < LIST.length; i++) {
      var a = LIST[i];
      if (have[a.id] || !a.cond) continue;
      if (a.cond(s)) { earned.push(a.id); have[a.id] = true; }
    }
    var total = 0;
    for (var j = 0; j < LIST.length; j++) if (have[LIST[j].id] && LIST[j].id !== 'neon-legend') total++;
    if (total >= 30 && !have['neon-legend']) earned.push('neon-legend');
    return earned;
  }

  // ---- browser layer (storage, SDK, toast) ----

  var LS_STATS = 'ncStats', LS_UNLOCKED = 'ncTrophies';
  var hasDom = typeof document !== 'undefined' && typeof localStorage !== 'undefined';

  function loadStats() {
    var s = freshStats();
    if (!hasDom) return s;
    try {
      var raw = JSON.parse(localStorage.getItem(LS_STATS) || '{}');
      for (var k in DEFAULTS) if (typeof raw[k] === 'number') s[k] = raw[k];
    } catch (e) {}
    return s;
  }
  function saveStats(s) { if (hasDom) try { localStorage.setItem(LS_STATS, JSON.stringify(s)); } catch (e) {} }
  function getUnlocked() {
    if (!hasDom) return [];
    try { var a = JSON.parse(localStorage.getItem(LS_UNLOCKED) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function saveUnlocked(a) { if (hasDom) try { localStorage.setItem(LS_UNLOCKED, JSON.stringify(a)); } catch (e) {} }

  function meta(id) {
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i];
    return null;
  }

  function toast(a) {
    if (!hasDom) return;
    if (global.GameVolt && GameVolt.ui && GameVolt.ui.achievementToast) {
      GameVolt.ui.achievementToast({ icon: a.icon, name: a.name, tier: a.tier });
      return;
    }
    // standalone fallback: minimal self-removing toast
    var t = document.createElement('div');
    t.textContent = a.icon + ' ' + a.name;
    t.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:rgba(5,10,25,0.95);color:#dffdff;border:1px solid rgba(0,234,255,0.5);border-radius:10px;padding:10px 18px;font-family:inherit;font-size:14px;z-index:99;letter-spacing:1px;';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
  }

  function unlock(id, silent) {
    var arr = getUnlocked();
    if (arr.indexOf(id) !== -1) return false;
    arr.push(id);
    saveUnlocked(arr);
    // Earned on another device already? Persisted, but don't re-toast.
    var cloudHas = global.GameVolt && GameVolt.achievements && GameVolt.achievements.isUnlocked && GameVolt.achievements.isUnlocked(id);
    if (global.GameVolt && GameVolt.achievements && !cloudHas) {
      try { GameVolt.achievements.unlock(id); } catch (e) {}
    }
    if (!silent && !cloudHas) {
      var a = meta(id);
      if (a) toast(a);
    }
    return true;
  }

  function event(name, d) {
    var s = loadStats();
    onEvent(s, name, d);
    saveStats(s);
    evaluate(s, getUnlocked()).forEach(function (id) { unlock(id); });
    return s;
  }

  // Pull cloud-earned trophies into local state (no toasts) after login.
  function backfill() {
    if (!global.GameVolt || !GameVolt.achievements || !GameVolt.achievements.getUnlockedIds) return;
    GameVolt.achievements.getUnlockedIds().then(function (ids) {
      if (!ids || !ids.forEach) return;
      var arr = getUnlocked();
      var changed = false;
      ids.forEach(function (id) {
        if (arr.indexOf(id) === -1) { arr.push(id); changed = true; }
      });
      if (changed) saveUnlocked(arr);
    }).catch(function () {});
  }

  function initSDK() {
    if (!global.GameVolt) return;
    try {
      GameVolt.save.registerMigration({
        keys: [LS_STATS, LS_UNLOCKED],
        merge: function (local, cloud) {
          var ls = {}, cs = cloud || {};
          try { ls = JSON.parse(local[LS_STATS] || '{}'); } catch (e) {}
          var merged = {};
          for (var k in DEFAULTS) merged[k] = Math.max(ls[k] || 0, cs[k] || 0);
          return merged;
        },
        getScores: function (local) {
          try {
            var st = JSON.parse(local[LS_STATS] || '{}');
            if (st.solo_best > 0) return [{ score: st.solo_best, mode: 'solo' }];
          } catch (e) {}
          return [];
        },
        getAchievements: function (local) {
          try {
            var ids = JSON.parse(local[LS_UNLOCKED] || '[]');
            if (Array.isArray(ids)) return ids.map(function (id) { return { id: id, unlocked_at: Date.now() }; });
          } catch (e) {}
          return [];
        }
      });
      GameVolt.auth.onStateChange(function (user) { if (user) backfill(); });
    } catch (e) {}
  }

  var NCTrophies = {
    LIST: LIST,
    DEFAULTS: DEFAULTS,
    freshStats: freshStats,
    onEvent: onEvent,
    evaluate: evaluate,
    loadStats: loadStats,
    getUnlocked: getUnlocked,
    event: event,
    unlock: unlock,
    backfill: backfill,
    initSDK: initSDK
  };

  global.NCTrophies = NCTrophies;
  if (typeof module !== 'undefined' && module.exports) module.exports = NCTrophies;
})(typeof window !== 'undefined' ? window : this);
