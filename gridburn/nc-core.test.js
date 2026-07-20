// Node test for the deterministic Neon Cycles core. Run: node nc-core.test.js
var NC = require('./nc-core.js');

var failures = 0;
function ok(cond, msg) { if (!cond) { failures++; console.log('  ❌ ' + msg); } }

// --- Wall death ---
(function () {
  var g = NC.createGame({ cols: 5, rows: 5, players: [{ id: 1, x: 0, y: 2, dir: 3 }] }); // facing left at x=0
  NC.step(g); // moves off the left wall
  ok(!g.players[0].alive, 'wall: player driving into the left wall dies');
  ok(g.over && g.winner === 0, 'wall: solo game ends when the only player crashes');
})();

// --- Self-trail collision ---
(function () {
  // Box turn back onto own trail: right, down, left, up -> hits the start cell trail.
  var g = NC.createGame({ cols: 10, rows: 10, players: [{ id: 1, x: 5, y: 5, dir: 1 }] });
  NC.step(g);                     // -> (6,5)
  NC.setDir(g, 1, 2); NC.step(g); // down -> (6,6)
  NC.setDir(g, 1, 3); NC.step(g); // left -> (5,6)
  NC.setDir(g, 1, 0); NC.step(g); // up   -> (5,5) which is the original trail cell
  ok(!g.players[0].alive, 'self: looping back onto your own trail kills you');
})();

// --- No 180° reversal ---
(function () {
  var g = NC.createGame({ cols: 10, rows: 10, players: [{ id: 1, x: 5, y: 5, dir: 1 }] });
  NC.setDir(g, 1, 3); // try to reverse (right -> left): must be ignored
  NC.step(g);
  ok(g.players[0].x === 6 && g.players[0].y === 5, 'reverse: 180° turn is ignored, keeps going forward');
})();

// --- Head-on into the same cell: both die, draw ---
(function () {
  // Two players 2 cells apart on the same row, facing each other -> they meet in the middle cell.
  var g = NC.createGame({ cols: 11, rows: 5, players: [
    { id: 1, x: 4, y: 2, dir: 1 },
    { id: 2, x: 6, y: 2, dir: 3 }
  ]});
  NC.step(g); // both aim for (5,2)
  ok(!g.players[0].alive && !g.players[1].alive, 'head-on: both cycles entering the same cell die');
  ok(g.over && g.winner === 0, 'head-on: simultaneous death is a draw');
})();

// --- Last one standing wins ---
(function () {
  var g = NC.createGame({ cols: 8, rows: 8, players: [
    { id: 1, x: 1, y: 0, dir: 0 }, // on the top edge, facing up -> off the board next tick
    { id: 2, x: 4, y: 4, dir: 1 }  // drives safely across open space
  ]});
  NC.step(g); // p1 leaves the board and dies, p2 survives
  ok(!g.players[0].alive && g.players[1].alive, 'win: the crasher dies, the survivor lives');
  ok(g.over && g.winner === 2, 'win: last cycle alive is the winner');
})();

// --- Determinism: same inputs -> identical worlds ---
(function () {
  function play() {
    var g = NC.classicDuel(30, 20);
    var script = [
      [1, 2], [2, 0], [1, 1], [2, 3], [1, 2], [2, 2], [1, 1], [2, 0]
    ];
    for (var t = 0; t < 40; t++) {
      var s = script[t % script.length];
      if (t % 3 === 0) NC.setDir(g, s[0], s[1]);
      if (t % 4 === 0) NC.setDir(g, 2, (t / 4) % 4);
      NC.step(g);
      if (g.over) break;
    }
    return g;
  }
  var a = play(), b = play();
  var sameGrid = a.grid.length === b.grid.length && a.grid.every(function (v, i) { return v === b.grid[i]; });
  ok(sameGrid, 'determinism: identical input scripts produce byte-identical grids');
  ok(a.tick === b.tick && a.winner === b.winner, 'determinism: identical tick count and outcome');
})();

// --- Solo survival is measured in ticks ---
(function () {
  var g = NC.createGame({ cols: 20, rows: 3, players: [{ id: 1, x: 0, y: 1, dir: 1 }] });
  var ticks = 0;
  while (!g.over && ticks < 100) { NC.step(g); ticks++; }
  // Occupies x=1..19 over 19 ticks, then crashes into the wall on tick 20.
  ok(g.tick === 20, 'solo: survives across the grid, then crashes on the far wall (tick 20)');
})();

if (failures === 0) console.log('✅ Gridburn core rules and determinism pass');
else { console.log('❌ ' + failures + ' Gridburn core test(s) failed'); process.exit(1); }
