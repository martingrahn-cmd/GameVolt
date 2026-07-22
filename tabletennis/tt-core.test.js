// Node test suite for the table tennis core: rules + determinism.
var TT = require('./tt-core.js');
var K = TT.constants;
var fails = 0;
function check(name, cond) {
  if (!cond) { console.error('❌ ' + name); fails++; }
}

// 1. shape
var g = TT.createGame(1);
check('initial phase is serve', g.phase === 'serve' && g.server === 1);
check('scores start 0-0', g.scores[1] === 0 && g.scores[2] === 0);

// helper: run n ticks with given inputs
function run(s, n, inputs) {
  var evs = [];
  for (var i = 0; i < n; i++) evs = evs.concat(TT.step(s, inputs).events);
  return evs;
}

// 2. serve bounces the server's OWN side first, then the opponent's — no fault
g = TT.createGame(1);
TT.serve(g, { tx: 0.2, ty: K.NET_Y + 0.9 });
check('serve enters rally', g.phase === 'rally' && g.lastHitBy === 1);
var evs = run(g, 80, {});
var bounces = evs.filter(function (e) { return e.type === 'bounce'; });
check('serve bounces own side first', bounces.length >= 1 && bounces[0].side === 1);
check('then bounces the opponent side', bounces.length >= 2 && bounces[1].side === 2);
check('own-side serve bounce is not a fault', g.scores[2] === 0);
check('no net event on a clean serve', !evs.some(function (e) { return e.type === 'net'; }));

// 3. receiver absent -> double bounce or floor -> point to server
g = TT.createGame(1);
TT.serve(g, { tx: 0, ty: K.NET_Y + 0.9, t: 0.68 });
run(g, 400, { 2: { x: 1.5, z: 0.9 } }); // receiver parked far away
check('unreturned serve scores for server', g.scores[1] === 1 && g.phase === 'point');

// 4. net fault on a low flat RETURN -> point to the other player
// (serves can no longer be aimed into the net: the depth floor + clearance
// solver guarantee they clear — verified by the sweep in 8b)
g = TT.createGame(1);
TT.serve(g, { tx: 0, ty: K.NET_Y + 0.9 });
evs = run(g, 300, { 2: { x: 0, z: -0.05, aim: { tx: 0, ty: K.NET_Y - 0.19, t: 0.34 } } });
check('low flat return nets', evs.some(function (e) { return e.type === 'net'; }));
check('net fault scores for the other player', g.scores[1] === 1);

// 5. long shot (out, no bounce) -> point to receiver
g = TT.createGame(1);
TT.serve(g, { tx: 0, ty: K.TABLE_L + 0.6, t: 0.55 }); // sails long
run(g, 400, { 2: { x: 1.5, z: 0.9 } });
check('long ball scores for receiver', g.scores[2] === 1);

// 6. return contact: receiver in the path sends it back
g = TT.createGame(1);
TT.serve(g, { tx: 0, ty: K.NET_Y + 0.9, t: 0.68 });
evs = run(g, 300, { 2: { x: 0, z: 0.25, aim: { tx: 0.3, ty: K.NET_Y - 0.9, t: 0.7 } } });
var hit = evs.filter(function (e) { return e.type === 'hit' && e.by === 2; })[0];
check('receiver returns the ball', !!hit);
check('after return, lastHitBy flips', g.lastHitBy === 2 || g.phase !== 'rally');

// 7. serve rotation: every 2 points, deuce every point
g = TT.createGame(1);
var servers = [];
function playPoint(s) {
  // server fires an unreturnable serve into an empty court
  TT.serve(s, { tx: 0, ty: s.server === 1 ? K.NET_Y + 0.9 : K.NET_Y - 0.9, t: 0.68 });
  var guard = 0;
  while (s.phase === 'rally' && guard++ < 600) TT.step(s, { 1: { x: 1.5 }, 2: { x: 1.5 } });
  if (s.phase === 'point') TT.nextRally(s);
}
for (var i = 0; i < 6; i++) { servers.push(g.server); playPoint(g); }
check('serve alternates in pairs', servers.join('') === '112211');

// 8. win by 2 at 11+ — every point goes to player 1 (P2's serves sail long)
function playPointFor1(s) {
  if (s.server === 1) TT.serve(s, { tx: 0, ty: K.NET_Y + 0.9, t: 0.68 });
  else TT.serve(s, { tx: 0, ty: -0.6, t: 0.55 }); // P2 serves out
  var guard = 0;
  while (s.phase === 'rally' && guard++ < 600) TT.step(s, { 1: { x: 1.5 }, 2: { x: 1.5 } });
  if (s.phase === 'point') TT.nextRally(s);
}
g = TT.createGame(1);
var guard2 = 0;
while (g.phase !== 'over' && guard2++ < 60) playPointFor1(g);
check('game ends', g.phase === 'over');
check('winner has 11+ and leads by 2+', g.scores[g.winner] >= 11 &&
  g.scores[g.winner] - g.scores[TT.other(g.winner)] >= 2);

// 8b. serve net-clearance sweep: every paddle height x pace x depth combo
// must produce a clean two-bounce serve (low paddle + hard pace used to net)
var sweepNets = 0, sweepOk = 0;
[0.05, 0.25, 0.7].forEach(function (padZ) {
  [0, 0.6, 1.0].forEach(function (pace) {
    [1.75, 2.5].forEach(function (ty) {
      var sg = TT.createGame(1);
      sg.paddles[1].z = padZ;
      TT.serve(sg, { tx: 0.2, ty: ty, pace: pace });
      var sevs = [];
      for (var st = 0; st < 120 && sg.phase === 'rally'; st++) {
        sevs = sevs.concat(TT.step(sg, { 2: { x: 1.5, z: 0.9 } }).events);
      }
      if (sevs.some(function (e) { return e.type === 'net'; })) sweepNets++;
      var sb = sevs.filter(function (e) { return e.type === 'bounce'; });
      if (sb.length >= 2 && sb[0].side === 1 && sb[1].side === 2) sweepOk++;
    });
  });
});
check('serve sweep: no net faults (' + sweepNets + ')', sweepNets === 0);
check('serve sweep: all clean two-bounce (' + sweepOk + '/18)', sweepOk === 18);

// 8c. the still-paddle soft serve must be RETURNABLE — a short serve used to
// double-bounce before the receiver's fixed paddle plane (free point)
var AI2 = require('./tt-ai.js');
function lcgR(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
var returned = 0;
for (var sd = 1; sd <= 6; sd++) {
  var rg = TT.createGame(1);
  var rrng = lcgR(sd), rmem = {};
  TT.serve(rg, { tx: 0, ty: K.NET_Y + 0.35, pace: 0 }); // shorter than the floor — core clamps it
  for (var rt = 0; rt < 400 && rg.phase === 'rally'; rt++) {
    var ra = AI2.decide(rg, 2, 'medium', rrng, rmem);
    if (TT.step(rg, { 2: ra }).events.some(function (e) { return e.type === 'hit'; })) { returned++; break; }
  }
}
check('soft serve is returnable by medium AI (' + returned + '/6)', returned >= 5);

// 8d. edge-ball justice: a fast serve landing 4cm inside the end line must
// be judged IN (step-boundary judging used to call these out)
g = TT.createGame(1);
TT.serve(g, { tx: 0, ty: K.TABLE_L - 0.04, pace: 1 });
evs = run(g, 200, { 2: { x: 1.5, z: 0.9 } });
var edgeBounces = evs.filter(function (e) { return e.type === 'bounce' && e.side === 2; });
check('deep edge ball bounces IN', edgeBounces.length >= 1);
check('edge landing y within the table', edgeBounces.length >= 1 && edgeBounces[0].y <= K.TABLE_L + 1e-9);

// 9. determinism: identical input scripts -> identical states
function scripted() {
  var s = TT.createGame(1);
  TT.serve(s, { tx: 0.11, ty: K.NET_Y + 0.8, t: 0.66 });
  var inputs = {
    1: { x: 0, z: 0.25, aim: { tx: -0.2, ty: K.NET_Y + 1.0, t: 0.66 } },
    2: { x: 0, z: 0.25, aim: { tx: 0.2, ty: K.NET_Y - 1.0, t: 0.66 } }
  };
  for (var i = 0; i < 900; i++) {
    TT.step(s, inputs);
    if (s.phase === 'point') TT.nextRally(s), TT.serve(s, { tx: 0, ty: s.server === 1 ? K.NET_Y + 0.8 : K.NET_Y - 0.8, t: 0.66 });
  }
  return JSON.stringify(s);
}
check('900-tick replay is bit-identical', scripted() === scripted());

// 10. ball never NaNs or escapes
g = TT.createGame(2);
TT.serve(g, { tx: -0.4, ty: 0.3, t: 0.5 });
run(g, 2000, {});
check('ball stays finite', isFinite(g.ball.x) && isFinite(g.ball.y) && isFinite(g.ball.z));
check('ball settles above floor', g.ball.z >= K.FLOOR_Z - 0.01);

if (fails) { console.error(fails + ' failures'); process.exit(1); }
console.log('✅ Table tennis core rules and determinism pass');
