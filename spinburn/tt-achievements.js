// ============================================================
// tt-achievements.js — 31 trophies for Spinburn.
//
// Standard GameVolt tier structure: 15 bronze / 10 silver / 5 gold /
// 1 platinum ("unlock all the others"). Same shape as Gridburn's
// nc-achievements.js: the stats -> unlock logic is pure (onEvent/evaluate
// take and return plain objects) so it's testable in Node; everything that
// touches localStorage, the DOM or the GameVolt SDK is guarded, browser-only
// and optional (Spinburn plays fine standalone / on Poki with no SDK).
//
// Three event names feed the pure core:
//   - 'start' {campaign, online}       — a match begins
//   - 'point' {mine, ace, rally, lead} — a point is decided
//   - 'match' {myWin, mode, aiLevel, camp, champion, love, deuce,
//              comeback, comeback5, online, asKid, acesThisMatch}
//
// GameVolt integration mirrors Gridburn exactly: unlock() persists via
// GameVolt.achievements.unlock (the SDK prefixes ids with the slug) and
// toasts via GameVolt.ui.achievementToast; the isUnlocked gate stops a
// trophy earned on another device from re-toasting; initSDK() registers the
// localStorage -> cloud migration and backfills cloud-earned ids on login.
// ============================================================
(function (global) {
  'use strict';

  var LIST = [
    // ---- bronze (15) — natural play ----
    { id: 'first_serve',  name: 'First Serve',     desc: 'Play your first point',                 icon: '🏓', tier: 'bronze',   cond: function (s) { return s.points_seen >= 1; } },
    { id: 'first_win',    name: 'Table Manners',   desc: 'Win your first match',                  icon: '🏅', tier: 'bronze',   cond: function (s) { return s.wins >= 1; } },
    { id: 'first_ace',    name: 'Untouchable',     desc: 'Serve your first ace',                  icon: '🎯', tier: 'bronze',   cond: function (s) { return s.aces >= 1; } },
    { id: 'rally_8',      name: 'Keep It Alive',   desc: 'Win a rally of 8 shots or more',        icon: '🔁', tier: 'bronze',   cond: function (s) { return s.best_rally >= 8; } },
    { id: 'enter_arena',  name: 'Enter the Arena', desc: 'Start a campaign match',                icon: '🏟️', tier: 'bronze',   cond: function (s) { return s.camp_started >= 1; } },
    { id: 'beat_q',       name: 'Quarterfinalist', desc: 'Knock out Hans in the quarterfinal',    icon: '🥉', tier: 'bronze',   cond: function (s) { return s.camp_q >= 1; } },
    { id: 'first_online', name: 'Say Hello',       desc: 'Start an online match',                 icon: '🌐', tier: 'bronze',   cond: function (s) { return s.online_started >= 1; } },
    { id: 'as_kid',       name: 'Represent',       desc: 'Play a match as THE KID',               icon: '🧒', tier: 'bronze',   cond: function (s) { return s.as_kid >= 1; } },
    { id: 'win_easy',     name: 'Warm-Up',         desc: 'Win a match on Easy',                   icon: '🟢', tier: 'bronze',   cond: function (s) { return s.wins_easy >= 1; } },
    { id: 'lead_5',       name: 'In Control',      desc: 'Lead a game by 5 points',               icon: '📈', tier: 'bronze',   cond: function (s) { return s.big_lead >= 1; } },
    { id: 'deuce_win',    name: 'Down to the Wire',desc: 'Win a match that went to deuce (10–10)',icon: '😮‍💨', tier: 'bronze',  cond: function (s) { return s.deuce_wins >= 1; } },
    { id: 'points_50',    name: 'Point Machine',   desc: 'Win 50 points all-time',                icon: '💯', tier: 'bronze',   cond: function (s) { return s.points >= 50; } },
    { id: 'matches_5',    name: 'Regular',         desc: 'Play 5 matches',                        icon: '🌙', tier: 'bronze',   cond: function (s) { return s.matches >= 5; } },
    { id: 'comeback_3',   name: 'Not Done Yet',    desc: 'Win a match after trailing by 3',       icon: '🔄', tier: 'bronze',   cond: function (s) { return s.comebacks >= 1; } },
    { id: 'online_win',   name: 'Online Winner',   desc: 'Win an online match',                   icon: '🤝', tier: 'bronze',   cond: function (s) { return s.online_wins >= 1; } },
    // ---- silver (10) — skill & dedication ----
    { id: 'beat_s',       name: 'Semifinalist',    desc: 'Knock out General Hummel in the semifinal', icon: '🥈', tier: 'silver', cond: function (s) { return s.camp_s >= 1; } },
    { id: 'win_medium',   name: 'Holding Serve',   desc: 'Win a match on Medium',                 icon: '🟡', tier: 'silver',   cond: function (s) { return s.wins_medium >= 1; } },
    { id: 'rally_18',     name: 'Marathon Rally',  desc: 'Win a rally of 18 shots or more',       icon: '🏃', tier: 'silver',   cond: function (s) { return s.best_rally >= 18; } },
    { id: 'love_game',    name: 'Love Game',       desc: 'Win a match 11–0',                      icon: '🧹', tier: 'silver',   cond: function (s) { return s.love_games >= 1; } },
    { id: 'aces_5',       name: 'Serving Notice',  desc: 'Serve 5 aces in a single match',        icon: '🎯', tier: 'silver',   cond: function (s) { return s.aces_match_best >= 5; } },
    { id: 'comeback_5',   name: 'The Comeback',    desc: 'Win a match after trailing by 5',       icon: '💪', tier: 'silver',   cond: function (s) { return s.comebacks5 >= 1; } },
    { id: 'streak_3',     name: 'On a Roll',       desc: 'Win 3 matches in a row',                icon: '🔥', tier: 'silver',   cond: function (s) { return s.best_streak >= 3; } },
    { id: 'online_3',     name: 'Rival',           desc: 'Win 3 online matches',                  icon: '⚔️', tier: 'silver',   cond: function (s) { return s.online_wins >= 3; } },
    { id: 'points_500',   name: 'Grinder',         desc: 'Win 500 points all-time',               icon: '📊', tier: 'silver',   cond: function (s) { return s.points >= 500; } },
    { id: 'matches_25',   name: 'Veteran',         desc: 'Play 25 matches',                       icon: '🎪', tier: 'silver',   cond: function (s) { return s.matches >= 25; } },
    // ---- gold (5) — hardcore ----
    { id: 'champion',     name: 'Champion',        desc: 'Win the campaign — beat Chong Li in the final', icon: '🏆', tier: 'gold', cond: function (s) { return s.champion >= 1; } },
    { id: 'win_hard',     name: 'No Mercy',        desc: 'Win a match on Hard',                   icon: '🔴', tier: 'gold',     cond: function (s) { return s.wins_hard >= 1; } },
    { id: 'hard_love',    name: 'Perfect Game',    desc: 'Win a match 11–0 on Hard',              icon: '⛔', tier: 'gold',     cond: function (s) { return s.hard_love >= 1; } },
    { id: 'aces_50',      name: 'Ace Collector',   desc: 'Serve 50 aces all-time',                icon: '🎯', tier: 'gold',     cond: function (s) { return s.aces >= 50; } },
    { id: 'streak_8',     name: 'Untouchable Run', desc: 'Win 8 matches in a row',                icon: '👑', tier: 'gold',     cond: function (s) { return s.best_streak >= 8; } },
    // ---- platinum (1) — completionist ----
    { id: 'master',       name: 'Spinburn Master', desc: 'Unlock all other 30 trophies',          icon: '🌟', tier: 'platinum', cond: null }
  ];

  var DEFAULTS = {
    matches: 0, wins: 0, points: 0, points_seen: 0,
    aces: 0, best_rally: 0, aces_match_best: 0,
    wins_easy: 0, wins_medium: 0, wins_hard: 0, hard_love: 0,
    deuce_wins: 0, love_games: 0, comebacks: 0, comebacks5: 0,
    camp_started: 0, online_started: 0,
    camp_q: 0, camp_s: 0, champion: 0,
    online_matches: 0, online_wins: 0,
    win_streak: 0, best_streak: 0, big_lead: 0, as_kid: 0
  };

  // ---- pure logic (Node-testable) ----

  function freshStats() {
    var s = {};
    for (var k in DEFAULTS) s[k] = DEFAULTS[k];
    return s;
  }

  function onEvent(s, name, d) {
    d = d || {};
    if (name === 'start') {
      if (d.campaign) s.camp_started++;
      if (d.online) s.online_started++;
    } else if (name === 'point') {
      s.points_seen++;
      if (d.mine) s.points++;
      if (d.ace) s.aces++;
      if ((d.rally || 0) > s.best_rally) s.best_rally = d.rally || 0;
      if ((d.lead || 0) >= 5) s.big_lead = 1;
    } else if (name === 'match') {
      s.matches++;
      if (d.online) s.online_matches++;
      if (d.asKid) s.as_kid = 1;
      if ((d.acesThisMatch || 0) > s.aces_match_best) s.aces_match_best = d.acesThisMatch || 0;
      if (d.myWin) {
        s.wins++;
        s.win_streak++;
        if (s.win_streak > s.best_streak) s.best_streak = s.win_streak;
        if (d.online) s.online_wins++;
        if (d.mode === 'ai') {
          if (d.aiLevel === 'easy') s.wins_easy++;
          if (d.aiLevel === 'medium') s.wins_medium++;
          if (d.aiLevel === 'hard') s.wins_hard++;
          if (d.love && d.aiLevel === 'hard') s.hard_love++;
        }
        if (d.love) s.love_games++;
        if (d.deuce) s.deuce_wins++;
        if (d.comeback) s.comebacks++;
        if (d.comeback5) s.comebacks5++;
        if (d.camp === 'q') s.camp_q++;
        if (d.camp === 's') s.camp_s++;
        if (d.champion) s.champion++;
      } else {
        s.win_streak = 0;
      }
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
    for (var j = 0; j < LIST.length; j++) if (have[LIST[j].id] && LIST[j].id !== 'master') total++;
    if (total >= 30 && !have['master']) earned.push('master');
    return earned;
  }

  // ---- browser layer (storage, SDK, toast) ----

  var LS_STATS = 'ttStats', LS_UNLOCKED = 'ttTrophies';
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
    t.style.cssText = 'position:fixed;bottom:66px;left:50%;transform:translateX(-50%);background:rgba(13,11,26,0.96);color:#ffe9b0;border:1px solid rgba(255,190,70,0.55);border-radius:10px;padding:10px 18px;font-family:inherit;font-size:14px;z-index:99;letter-spacing:1px;';
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
            if (st.points > 0) return [{ score: st.points, mode: 'default' }]; // career points won
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

  var SBTrophies = {
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

  global.SBTrophies = SBTrophies;
  if (typeof module !== 'undefined' && module.exports) module.exports = SBTrophies;
})(typeof window !== 'undefined' ? window : this);
