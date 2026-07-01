/*
 * GameVolt Solitaire — unified trophy system (shared across all 6 variants)
 * 31 trophies (15 bronze / 10 silver / 5 gold / 1 platinum), stored under the
 * single GameVolt game id 'solitaire'. Loaded by every variant + the hub the
 * same way leaderboard.js is. Independent of the Firebase leaderboard.
 *
 * Variants call:  SolAch.recordStart(variant)  in newGame()
 *                 SolAch.recordWin(variant, {score, time, moves, tpStreak, numSuits})  on win
 * Hub (index.html) calls: SolAch.openGrid()  to show the trophy grid.
 */
(function () {
  'use strict';

  var STATS_KEY = 'solitaire_stats';
  var TROPHIES_KEY = 'solitaire_trophies';
  var VARIANTS = ['klondike', 'freecell', 'spider', 'pyramid', 'golf', 'tripeaks'];
  var TIER_COLORS = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#d4af37', platinum: '#b4ffff' };

  // Local ids have no 'solitaire-' prefix; the SDK stores '<gameId>-<id>'.
  var SOL_TROPHIES = [
    // Bronze (15)
    { id: 'first-win',        tier: 'bronze', icon: '🎉', name: 'First Victory',   desc: 'Win your first game' },
    { id: 'win-klondike',     tier: 'bronze', icon: '♠️', name: 'Klondike Clear',  desc: 'Win a Klondike game' },
    { id: 'win-freecell',     tier: 'bronze', icon: '♦️', name: 'FreeCell Clear',  desc: 'Win a FreeCell game' },
    { id: 'win-spider',       tier: 'bronze', icon: '🕷️', name: 'Spider Clear',    desc: 'Win a Spider game' },
    { id: 'win-pyramid',      tier: 'bronze', icon: '🔺', name: 'Pyramid Clear',   desc: 'Clear a Pyramid game' },
    { id: 'win-golf',         tier: 'bronze', icon: '⛳', name: 'Hole in One',     desc: 'Win a Golf game' },
    { id: 'win-tripeaks',     tier: 'bronze', icon: '⛰️', name: 'Peak Performance', desc: 'Win a TriPeaks game' },
    { id: 'games-10',         tier: 'bronze', icon: '🃏', name: 'Getting Started', desc: 'Play 10 games' },
    { id: 'wins-5',           tier: 'bronze', icon: '✅', name: 'Winner',          desc: 'Win 5 games total' },
    { id: 'wins-10',          tier: 'bronze', icon: '🏅', name: 'Regular Winner',  desc: 'Win 10 games total' },
    { id: 'fast-5min',        tier: 'bronze', icon: '⏱️', name: 'Quick Hands',     desc: 'Win any game in under 5 minutes' },
    { id: 'two-variants',     tier: 'bronze', icon: '🔀', name: 'Sampler',         desc: 'Win in 2 different variants' },
    { id: 'tripeaks-streak-5', tier: 'bronze', icon: '🔗', name: 'Chain Start',    desc: 'Reach a 5-streak in TriPeaks' },
    { id: 'score-1000',       tier: 'bronze', icon: '💯', name: 'Four Figures',    desc: 'Score 1,000+ in a single game' },
    { id: 'streak-3',         tier: 'bronze', icon: '🔥', name: 'On a Roll',       desc: 'Win 3 games in a row' },
    // Silver (10)
    { id: 'all-variants',     tier: 'silver', icon: '🏆', name: 'Grand Slam',      desc: 'Win a game in all 6 variants' },
    { id: 'wins-25',          tier: 'silver', icon: '🎖️', name: 'Seasoned',        desc: 'Win 25 games total' },
    { id: 'fast-3min',        tier: 'silver', icon: '🚀', name: 'Speed Runner',    desc: 'Win any game in under 3 minutes' },
    { id: 'spider-2suit',     tier: 'silver', icon: '🕸️', name: 'Spider Adept',    desc: 'Win a 2-suit Spider game' },
    { id: 'streak-5',         tier: 'silver', icon: '🔥', name: 'Hot Streak',      desc: 'Win 5 games in a row' },
    { id: 'tripeaks-streak-10', tier: 'silver', icon: '⛓️', name: 'Peak Chainer',  desc: 'Reach a 10-streak in TriPeaks' },
    { id: 'score-2500',       tier: 'silver', icon: '💎', name: 'High Scorer',     desc: 'Score 2,500+ in a single game' },
    { id: 'games-50',         tier: 'silver', icon: '📅', name: 'Committed',       desc: 'Play 50 games' },
    { id: 'golf-fast',        tier: 'silver', icon: '🏌️', name: 'Under Par',       desc: 'Win a Golf game in under 90 seconds' },
    { id: 'classic-sweep',    tier: 'silver', icon: '🎩', name: 'Classic Sweep',   desc: 'Win Klondike, FreeCell and Spider' },
    // Gold (5)
    { id: 'spider-4suit',     tier: 'gold',   icon: '👑', name: 'Spider Master',   desc: 'Win a 4-suit Spider game' },
    { id: 'wins-100',         tier: 'gold',   icon: '💯', name: 'Centurion',       desc: 'Win 100 games total' },
    { id: 'fast-90s',         tier: 'gold',   icon: '⚡', name: 'Lightning',       desc: 'Win any game in under 90 seconds' },
    { id: 'streak-10',        tier: 'gold',   icon: '🔥', name: 'Unstoppable',     desc: 'Win 10 games in a row' },
    { id: 'score-5000',       tier: 'gold',   icon: '🦈', name: 'Card Shark',      desc: 'Score 5,000+ in a single game' },
    // Platinum (1)
    { id: 'master',           tier: 'platinum', icon: '🏆', name: 'Solitaire Master', desc: 'Unlock all 30 other trophies' },
  ];
  var PLATINUM_ID = 'master';

  // ── persistence ──
  function loadStats() {
    try { var r = localStorage.getItem(STATS_KEY); if (r) return JSON.parse(r); } catch (e) {}
    return { totalGames: 0, totalWins: 0, winsByVariant: {}, currentStreak: 0, bestStreak: 0,
             bestScore: 0, tripeaksBestStreak: 0, fastestWinSec: 0,
             spider2suitWin: false, spider4suitWin: false, golfFastWin: false, pendingGame: false };
  }
  function saveStats(s) { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {} }
  function loadTrophies() {
    try { var r = localStorage.getItem(TROPHIES_KEY); if (r) return arrToSet(JSON.parse(r)); } catch (e) {}
    return {};
  }
  function saveTrophies(set) { try { localStorage.setItem(TROPHIES_KEY, JSON.stringify(setToArr(set))); } catch (e) {} }
  function arrToSet(a) { var o = {}; for (var i = 0; i < a.length; i++) o[a[i]] = true; return o; }
  function setToArr(o) { var a = []; for (var k in o) if (o[k]) a.push(k); return a; }

  var stats = loadStats();
  var trophies = loadTrophies();

  function variantsWonCount() {
    var n = 0; for (var v in stats.winsByVariant) if (stats.winsByVariant[v] > 0) n++; return n;
  }

  function unlock(id) {
    if (trophies[id]) return;
    trophies[id] = true;
    saveTrophies(trophies);
    try { if (window.GameVolt && window.GameVolt.achievements) window.GameVolt.achievements.unlock(id); } catch (e) {}
  }

  function checks(run) {
    var w = stats.winsByVariant;
    var f = stats.fastestWinSec;
    return {
      'first-win':         function () { return stats.totalWins >= 1; },
      'win-klondike':      function () { return (w.klondike || 0) >= 1; },
      'win-freecell':      function () { return (w.freecell || 0) >= 1; },
      'win-spider':        function () { return (w.spider || 0) >= 1; },
      'win-pyramid':       function () { return (w.pyramid || 0) >= 1; },
      'win-golf':          function () { return (w.golf || 0) >= 1; },
      'win-tripeaks':      function () { return (w.tripeaks || 0) >= 1; },
      'games-10':          function () { return stats.totalGames >= 10; },
      'wins-5':            function () { return stats.totalWins >= 5; },
      'wins-10':           function () { return stats.totalWins >= 10; },
      'fast-5min':         function () { return f > 0 && f <= 300; },
      'two-variants':      function () { return variantsWonCount() >= 2; },
      'tripeaks-streak-5': function () { return stats.tripeaksBestStreak >= 5; },
      'score-1000':        function () { return stats.bestScore >= 1000; },
      'streak-3':          function () { return stats.bestStreak >= 3; },
      'all-variants':      function () { return variantsWonCount() >= 6; },
      'wins-25':           function () { return stats.totalWins >= 25; },
      'fast-3min':         function () { return f > 0 && f <= 180; },
      'spider-2suit':      function () { return stats.spider2suitWin === true; },
      'streak-5':          function () { return stats.bestStreak >= 5; },
      'tripeaks-streak-10': function () { return stats.tripeaksBestStreak >= 10; },
      'score-2500':        function () { return stats.bestScore >= 2500; },
      'games-50':          function () { return stats.totalGames >= 50; },
      'golf-fast':         function () { return stats.golfFastWin === true; },
      'classic-sweep':     function () { return (w.klondike || 0) >= 1 && (w.freecell || 0) >= 1 && (w.spider || 0) >= 1; },
      'spider-4suit':      function () { return stats.spider4suitWin === true; },
      'wins-100':          function () { return stats.totalWins >= 100; },
      'fast-90s':          function () { return f > 0 && f <= 90; },
      'streak-10':         function () { return stats.bestStreak >= 10; },
      'score-5000':        function () { return stats.bestScore >= 5000; },
    };
  }

  function runChecks(run) {
    var c = checks(run);
    for (var i = 0; i < SOL_TROPHIES.length; i++) {
      var t = SOL_TROPHIES[i];
      if (t.id === PLATINUM_ID || trophies[t.id]) continue;
      if (c[t.id] && c[t.id]()) unlock(t.id);
    }
    if (!trophies[PLATINUM_ID] && setToArr(trophies).length >= SOL_TROPHIES.length - 1) unlock(PLATINUM_ID);
  }

  // ── public: called from each variant ──
  function recordStart(variant) {
    // If a previously-started game was never won, the win streak is broken.
    if (stats.pendingGame) stats.currentStreak = 0;
    stats.pendingGame = true;
    stats.totalGames = (stats.totalGames || 0) + 1;
    saveStats(stats);
  }

  function recordWin(variant, run) {
    run = run || {};
    stats.pendingGame = false;
    stats.totalWins = (stats.totalWins || 0) + 1;
    if (!stats.winsByVariant) stats.winsByVariant = {};
    stats.winsByVariant[variant] = (stats.winsByVariant[variant] || 0) + 1;
    stats.currentStreak = (stats.currentStreak || 0) + 1;
    if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;

    var score = +run.score || 0;
    if (score > stats.bestScore) stats.bestScore = score;
    var time = +run.time || 0;
    if (time > 0 && (stats.fastestWinSec === 0 || time < stats.fastestWinSec)) stats.fastestWinSec = time;

    if (variant === 'tripeaks') {
      var tp = +run.tpStreak || 0;
      if (tp > stats.tripeaksBestStreak) stats.tripeaksBestStreak = tp;
    }
    if (variant === 'spider') {
      if (+run.numSuits === 2) stats.spider2suitWin = true;
      if (+run.numSuits === 4) stats.spider4suitWin = true;
    }
    if (variant === 'golf' && time > 0 && time < 90) stats.golfFastWin = true;

    saveStats(stats);
    runChecks(run);
  }

  function initSDK() {
    // The variant page owns GameVolt.init('solitaire'); here we only register
    // the cloud-merge migration (guarded — no-op if the SDK/save is absent).
    if (!window.GameVolt) return;
    try {
      if (window.GameVolt.save && window.GameVolt.save.registerMigration) {
        window.GameVolt.save.registerMigration(function (cloud) {
          cloud = cloud || {};
          var union = arrToSet((cloud.solitaire_trophies || []).concat(setToArr(trophies)));
          trophies = union; saveTrophies(trophies);
          try { for (var k in trophies) if (trophies[k]) window.GameVolt.achievements.unlock(k); } catch (e) {}
          return { solitaire_trophies: setToArr(trophies) };
        });
      }
    } catch (e) {}
  }

  // ── trophy grid overlay (Asteroid-Storm style, green-felt theme) ──
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function openGrid() {
    if (document.getElementById('solAchOverlay')) return;
    var got = 0; for (var i = 0; i < SOL_TROPHIES.length; i++) if (trophies[SOL_TROPHIES[i].id]) got++;
    var tiers = ['bronze', 'silver', 'gold', 'platinum'];
    var sections = '';
    for (var ti = 0; ti < tiers.length; ti++) {
      var tier = tiers[ti], col = TIER_COLORS[tier];
      var list = SOL_TROPHIES.filter(function (t) { return t.tier === tier; });
      var nu = list.filter(function (t) { return trophies[t.id]; }).length;
      sections += '<div class="sol-ach-th" style="color:' + col + ';border-color:' + col + '66">' +
        tier.toUpperCase() + ' · ' + nu + '/' + list.length + '</div><div class="sol-ach-grid">';
      for (var j = 0; j < list.length; j++) {
        var t = list[j], on = !!trophies[t.id];
        sections += '<div class="sol-ach-card ' + (on ? 'on' : 'off') + '">' +
          '<div class="sol-ach-ic">' + (on ? t.icon : '🔒') + '</div>' +
          '<div class="sol-ach-nm">' + esc(t.name) + '</div>' +
          '<div class="sol-ach-de">' + (on ? esc(t.desc) : '???') + '</div>' +
          '<div class="sol-ach-ti" style="color:' + col + '">' + t.tier + '</div></div>';
      }
      sections += '</div>';
    }
    var ov = document.createElement('div');
    ov.id = 'solAchOverlay';
    ov.innerHTML =
      '<style>' +
      '#solAchOverlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(6,30,14,0.92);font-family:"Source Sans 3",system-ui,sans-serif;padding:16px;box-sizing:border-box}' +
      '#solAchOverlay .sol-ach-panel{width:100%;max-width:720px;max-height:86vh;display:flex;flex-direction:column;' +
      'background:linear-gradient(145deg,#1e6b30,#0d3d18);border:1px solid #d4af37;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.5);overflow:hidden}' +
      '#solAchOverlay .sol-ach-top{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(212,175,55,0.3)}' +
      '#solAchOverlay .sol-ach-title{font-family:"Playfair Display",serif;color:#f4d03f;font-size:1.3rem;font-weight:700}' +
      '#solAchOverlay .sol-ach-count{color:rgba(255,255,255,0.7);font-size:0.8rem}' +
      '#solAchOverlay .sol-ach-close{background:rgba(212,175,55,0.15);border:1px solid #d4af37;color:#f4d03f;' +
      'font-size:0.8rem;font-weight:600;padding:8px 14px;border-radius:8px;cursor:pointer}' +
      '#solAchOverlay .sol-ach-close:hover{background:rgba(212,175,55,0.3)}' +
      '#solAchOverlay .sol-ach-body{overflow-y:auto;padding:14px 20px;-webkit-overflow-scrolling:touch}' +
      '#solAchOverlay .sol-ach-th{font-size:0.8rem;font-weight:700;letter-spacing:2px;margin:14px 0 8px;padding-bottom:5px;border-bottom:1px solid}' +
      '#solAchOverlay .sol-ach-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}' +
      '#solAchOverlay .sol-ach-card{display:flex;flex-direction:column;gap:4px;padding:12px;border-radius:8px;' +
      'background:rgba(0,0,0,0.25);border:1px solid rgba(212,175,55,0.15);min-height:80px}' +
      '#solAchOverlay .sol-ach-card.on{background:rgba(0,0,0,0.35);border-color:rgba(212,175,55,0.45)}' +
      '#solAchOverlay .sol-ach-card.off{opacity:0.4}' +
      '#solAchOverlay .sol-ach-ic{font-size:20px;line-height:1}' +
      '#solAchOverlay .sol-ach-nm{color:#f5f5f0;font-size:0.8rem;font-weight:600;line-height:1.2}' +
      '#solAchOverlay .sol-ach-de{color:rgba(255,255,255,0.65);font-size:0.68rem;line-height:1.35;flex:1}' +
      '#solAchOverlay .sol-ach-ti{font-size:0.6rem;font-weight:700;letter-spacing:1px;text-transform:uppercase}' +
      '@media(max-width:560px){#solAchOverlay .sol-ach-grid{grid-template-columns:repeat(2,1fr)}}' +
      '</style>' +
      '<div class="sol-ach-panel"><div class="sol-ach-top"><div>' +
      '<div class="sol-ach-title">🏆 Trophies</div>' +
      '<div class="sol-ach-count">' + got + ' / ' + SOL_TROPHIES.length + ' unlocked</div></div>' +
      '<button class="sol-ach-close" type="button">Close</button></div>' +
      '<div class="sol-ach-body">' + sections + '</div></div>';
    document.body.appendChild(ov);
    var close = function () { var e = document.getElementById('solAchOverlay'); if (e) e.remove(); document.removeEventListener('keydown', onKey); };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    ov.querySelector('.sol-ach-close').addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey);
  }

  window.SolAch = {
    SOL_TROPHIES: SOL_TROPHIES,
    recordStart: recordStart,
    recordWin: recordWin,
    initSDK: initSDK,
    openGrid: openGrid,
    getUnlocked: function () { return setToArr(trophies); },
  };

  // Register the cloud-merge migration once the SDK is present. This module may
  // load before or after /sdk/gamevolt.js, so also retry on window load (by then
  // the variant's GameVolt.init('solitaire') has run). No-op on the hub (no SDK).
  if (window.GameVolt) initSDK();
  else window.addEventListener('load', function () { if (window.GameVolt) initSDK(); });
})();
