// Node test suite for the table tennis AI: it sustains rallies, difficulty
// ordering holds (hard beats easy), and it's deterministic under a seed.
var TT = require('./tt-core.js');
var AI = require('./tt-ai.js');
var K = TT.constants;
var fails = 0;
function check(name, cond) {
  if (!cond) { console.error('❌ ' + name); fails++; }
}

function lcg(seed) {
  var s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Play a full AI-vs-AI game. Returns { winner, hits, scores }
function playGame(levelP1, levelP2, seed) {
  var g = TT.createGame(1 + (seed % 2));
  var rng = lcg(seed);
  var mem = { 1: {}, 2: {} };
  var hits = 0, guard = 0;
  while (g.phase !== 'over' && guard++ < 60000) {
    var a1 = AI.decide(g, 1, levelP1, rng, mem[1]);
    var a2 = AI.decide(g, 2, levelP2, rng, mem[2]);
    if (g.phase === 'serve') {
      var srv = g.server === 1 ? a1 : a2;
      if (srv.serve) TT.serve(g, srv.serve);
    }
    var res = TT.step(g, { 1: a1, 2: a2 });
    if (res.events.some(function (e) { return e.type === 'hit'; })) hits++;
    if (g.phase === 'point') {
      TT.nextRally(g);
      mem[1] = {}; mem[2] = {};
    }
  }
  return { winner: g.winner, hits: hits, scores: { 1: g.scores[1], 2: g.scores[2] }, done: g.phase === 'over' };
}

// 1. medium vs medium: games complete with real rallies
var r = playGame('medium', 'medium', 7);
check('medium-vs-medium completes', r.done);
check('rallies happen (returns beyond serves)', r.hits >= 8);

// 2. hard beats easy over seeded games
var hardWins = 0, n = 9;
for (var i = 0; i < n; i++) {
  var res = playGame('easy', 'hard', 100 + i);
  check('game ' + i + ' completes', res.done);
  if (res.winner === 2) hardWins++;
}
check('hard beats easy in most games (' + hardWins + '/' + n + ')', hardWins >= 7);

// 3. determinism: same seed -> identical outcome
var a = playGame('medium', 'hard', 42);
var b = playGame('medium', 'hard', 42);
check('seeded games are identical', JSON.stringify(a) === JSON.stringify(b));

// 3b. custom personality param objects are accepted (campaign opponents)
var dCustom = AI.decide(TT.createGame(1), 2,
  { speed: 2.2, react: 12, err: 0.2, outP: 0.05, tMin: 0.52, depth: 0.7, serveWait: 50, leaveP: 0.8 },
  lcg(3), {});
check('custom personality params work', typeof dCustom.x === 'number' && typeof dCustom.z === 'number');

// 4. AI serves eventually (doesn't deadlock the serve phase)
var g2 = TT.createGame(2);
var rng2 = lcg(5), mem2 = {};
var served = false;
for (var t = 0; t < 200; t++) {
  var d = AI.decide(g2, 2, 'easy', rng2, mem2);
  if (d.serve) { served = true; break; }
  TT.step(g2, { 2: d });
}
check('AI serves within 200 ticks', served);

if (fails) { console.error(fails + ' failures'); process.exit(1); }
console.log('✅ Table tennis AI (easy/medium/hard) passes');
