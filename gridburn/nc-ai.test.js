// Node test for the Neon Cycles AI. Run: node nc-ai.test.js
var NC = require('./nc-core.js');
var AI = require('./nc-ai.js');

var failures = 0;
function ok(cond, msg) { if (!cond) { failures++; console.log('  ❌ ' + msg); } }

// Deterministic LCG so duel results are reproducible.
function lcg(seed) {
  var s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// --- Every level turns away from an imminent wall ---
(function () {
  ['easy', 'medium', 'hard'].forEach(function (lvl) {
    var g = NC.createGame({ cols: 20, rows: 20, players: [{ id: 1, x: 19, y: 10, dir: 1 }] }); // on the right edge, wall next
    var d = AI.decide(g, 1, lvl, lcg(7));
    ok(d === 0 || d === 2, lvl + ': turns up or down instead of hitting the right wall (got ' + d + ')');
  });
})();

// --- Solo survival scales with difficulty ---
function soloSurvival(lvl, seed) {
  var g = NC.createGame({ cols: 40, rows: 30, players: [{ id: 1, x: 20, y: 15, dir: 1 }] });
  var rng = lcg(seed);
  var t = 0;
  while (!g.over && t < 1200) {
    var d = AI.decide(g, 1, lvl, rng);
    if (d !== null) NC.setDir(g, 1, d);
    NC.step(g);
    t++;
  }
  return g.tick;
}
(function () {
  var easy = 0, med = 0;
  for (var s = 1; s <= 5; s++) { easy += soloSurvival('easy', s); med += soloSurvival('medium', s + 50); }
  easy /= 5; med /= 5;
  // 40x30 = 1200 cells. Easy has no planning; medium's flood-fill should last far longer.
  ok(easy > 30, 'easy survives beyond a trivial straight run (avg ' + easy + ' ticks)');
  ok(med > 250, 'medium (flood-fill) survives long solo (avg ' + med + ' ticks)');
  ok(med > easy * 1.5, 'medium clearly outlasts easy (' + med + ' vs ' + easy + ')');
})();

// --- Duels: stronger brains beat weaker ones over a series ---
function duel(lvlA, lvlB, seed) {
  var g = NC.classicDuel(48, 32);
  var rng = lcg(seed);
  var t = 0;
  while (!g.over && t < 3000) {
    var d1 = AI.decide(g, 1, lvlA, rng);
    if (d1 !== null) NC.setDir(g, 1, d1);
    var d2 = AI.decide(g, 2, lvlB, rng);
    if (d2 !== null) NC.setDir(g, 2, d2);
    NC.step(g);
    t++;
  }
  return g.winner; // 1 = lvlA, 2 = lvlB, 0 = draw
}
function series(lvlA, lvlB, n) {
  var a = 0, b = 0, draws = 0;
  for (var i = 0; i < n; i++) {
    // alternate sides to cancel any first-player bias
    var w1 = duel(lvlA, lvlB, 1000 + i);
    if (w1 === 1) a++; else if (w1 === 2) b++; else draws++;
    var w2 = duel(lvlB, lvlA, 2000 + i);
    if (w2 === 1) b++; else if (w2 === 2) a++; else draws++;
  }
  return { a: a, b: b, draws: draws };
}
(function () {
  var he = series('hard', 'easy', 5);
  ok(he.a > he.b, 'hard beats easy over a 10-game series (' + he.a + '-' + he.b + ', ' + he.draws + ' draws)');
  var me = series('medium', 'easy', 5);
  ok(me.a > me.b, 'medium beats easy over a 10-game series (' + me.a + '-' + me.b + ', ' + me.draws + ' draws)');
  var hm = series('hard', 'medium', 5);
  ok(hm.a >= hm.b, 'hard at least matches medium over a 10-game series (' + hm.a + '-' + hm.b + ', ' + hm.draws + ' draws)');
})();

// --- Determinism: same seed -> same duel outcome and length ---
(function () {
  function run(seed) {
    var g = NC.classicDuel(48, 32);
    var rng = lcg(seed);
    while (!g.over && g.tick < 3000) {
      var d1 = AI.decide(g, 1, 'hard', rng);
      if (d1 !== null) NC.setDir(g, 1, d1);
      var d2 = AI.decide(g, 2, 'medium', rng);
      if (d2 !== null) NC.setDir(g, 2, d2);
      NC.step(g);
    }
    return g.winner + ':' + g.tick;
  }
  ok(run(42) === run(42), 'seeded AI duels are fully reproducible');
})();

if (failures === 0) console.log('✅ Gridburn AI (easy/medium/hard) passes');
else { console.log('❌ ' + failures + ' AI test(s) failed'); process.exit(1); }
