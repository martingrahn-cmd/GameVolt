// ============================================================
// nc-core.js — deterministic engine for Neon Cycles (working title),
// a Tron-style light-cycle game.
//
// The whole point of this file: the simulation is 100% deterministic. Given the
// same start state and the same per-tick direction inputs, every machine produces
// the exact same trails. That is what will make lockstep online play possible in
// a later phase — the network only ever has to carry direction changes, never
// positions, because both sides can recompute the world identically.
//
// A game IS its list of inputs (same idea as c4-core.js for Connect 4). No DOM,
// no rendering, no timers here — just pure state transitions that are trivial to
// unit-test in Node.
// ============================================================
(function (global) {
  'use strict';

  // Directions: 0 = up, 1 = right, 2 = down, 3 = left.
  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];

  // True if b is a 180° reversal of a (you can't turn straight back into your own trail).
  function isReverse(a, b) { return (a + 2) % 4 === b; }

  // opts: { cols, rows, players: [{ id, x, y, dir }] }
  // id must be a non-zero integer (0 means "empty cell" in the grid).
  function createGame(opts) {
    opts = opts || {};
    var cols = opts.cols || 60;
    var rows = opts.rows || 40;
    var players = (opts.players || []).map(function (p) {
      return {
        id: p.id, x: p.x, y: p.y,
        dir: p.dir, pendingDir: p.dir,
        alive: true, deadTick: -1,
        trail: [[p.x, p.y]]
      };
    });
    var grid = new Int16Array(cols * rows); // 0 = empty, else the owning player id
    for (var i = 0; i < players.length; i++) {
      grid[players[i].y * cols + players[i].x] = players[i].id;
    }
    return {
      cols: cols, rows: rows, grid: grid, players: players,
      tick: 0, over: false,
      winner: null // player id of the winner, 0 = draw, null = still going
    };
  }

  // Queue a direction change for the next tick. Ignored if the game is over,
  // the player is dead, or the direction would reverse straight back.
  function setDir(state, playerId, dir) {
    if (state.over) return;
    for (var i = 0; i < state.players.length; i++) {
      var p = state.players[i];
      if (p.id === playerId && p.alive) {
        if (isReverse(p.dir, dir)) return;
        p.pendingDir = dir;
        return;
      }
    }
  }

  // Advance the simulation by one tick. Returns { deaths: [playerId, ...] }.
  function step(state) {
    if (state.over) return { deaths: [] };
    var cols = state.cols, rows = state.rows, grid = state.grid;

    var alive = state.players.filter(function (p) { return p.alive; });

    // 1. Lock in each live player's direction and compute the cell it moves into.
    var intents = alive.map(function (p) {
      p.dir = p.pendingDir;
      return { p: p, nx: p.x + DX[p.dir], ny: p.y + DY[p.dir], die: false };
    });

    // 2. Death from walls or hitting an existing trail (including current heads,
    //    which are already marked in the grid — so trail-swaps are caught here too).
    for (var i = 0; i < intents.length; i++) {
      var it = intents[i];
      if (it.nx < 0 || it.nx >= cols || it.ny < 0 || it.ny >= rows) { it.die = true; continue; }
      if (grid[it.ny * cols + it.nx] !== 0) { it.die = true; }
    }

    // 3. Head-on: two live players moving into the same empty cell this tick — both die.
    for (var a = 0; a < intents.length; a++) {
      for (var b = a + 1; b < intents.length; b++) {
        if (intents[a].nx === intents[b].nx && intents[a].ny === intents[b].ny) {
          intents[a].die = true; intents[b].die = true;
        }
      }
    }

    // 4. Apply: survivors advance and extend their trail; the newly dead stop in place.
    var deaths = [];
    for (var j = 0; j < intents.length; j++) {
      var t = intents[j];
      if (t.die) {
        t.p.alive = false;
        t.p.deadTick = state.tick + 1;
        deaths.push(t.p.id);
      } else {
        t.p.x = t.nx; t.p.y = t.ny;
        grid[t.ny * cols + t.nx] = t.p.id;
        t.p.trail.push([t.nx, t.ny]);
      }
    }

    state.tick++;

    // 5. Win / draw resolution.
    var stillAlive = state.players.filter(function (p) { return p.alive; });
    if (state.players.length >= 2) {
      if (stillAlive.length === 0) { state.over = true; state.winner = 0; }
      else if (stillAlive.length === 1) { state.over = true; state.winner = stillAlive[0].id; }
    } else if (state.players.length === 1) {
      if (stillAlive.length === 0) { state.over = true; state.winner = 0; } // solo: over when you crash
    }

    return { deaths: deaths };
  }

  // Cheap deep copy for rollback prediction: grid is a typed-array slice and
  // trail cells are shared (the sim only ever appends new [x,y] pairs, never
  // mutates existing ones), so cloning is O(cells) with tiny constants.
  function cloneGame(s) {
    return {
      cols: s.cols, rows: s.rows,
      grid: s.grid.slice(),
      tick: s.tick, over: s.over, winner: s.winner,
      players: s.players.map(function (p) {
        return { id: p.id, x: p.x, y: p.y, dir: p.dir, pendingDir: p.pendingDir,
                 alive: p.alive, deadTick: p.deadTick, trail: p.trail.slice() };
      })
    };
  }

  // Standard 1v1 opening: both cycles mid-height, facing each other.
  function classicDuel(cols, rows) {
    cols = cols || 60; rows = rows || 40;
    var y = Math.floor(rows / 2);
    return createGame({
      cols: cols, rows: rows,
      players: [
        { id: 1, x: Math.floor(cols * 0.2), y: y, dir: 1 }, // left, heading right
        { id: 2, x: Math.floor(cols * 0.8), y: y, dir: 3 }  // right, heading left
      ]
    });
  }

  var NC = {
    createGame: createGame,
    setDir: setDir,
    step: step,
    cloneGame: cloneGame,
    classicDuel: classicDuel,
    isReverse: isReverse,
    DX: DX, DY: DY
  };

  global.NCCore = NC;
  if (typeof module !== 'undefined' && module.exports) module.exports = NC;
})(typeof window !== 'undefined' ? window : this);
