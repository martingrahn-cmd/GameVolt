// ============================================================
// nc-ai.js — AI opponent for Neon Cycles (working title).
//
// Three difficulty brains, all built on the same primitive: score the three
// legal moves (straight / left / right — never reverse) and pick one.
//
//   easy   — only checks one cell ahead for instant death, plus a bit of
//            random wandering. Never plans, so it happily boxes itself in.
//   medium — flood-fill: picks the move with the most reachable open space,
//            with an occasional mistake so it stays beatable.
//   hard   — Voronoi territory: picks the move that maximizes the number of
//            cells it can reach before the opponent can. The classic strong
//            light-cycle strategy — it doesn't just survive, it cuts you off.
//
// Pure function of the game state — no DOM, no timers. rng is injectable so
// tests can run seeded and deterministic.
// ============================================================
(function (global) {
  'use strict';

  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];

  function leftOf(d) { return (d + 3) % 4; }
  function rightOf(d) { return (d + 1) % 4; }

  function inBounds(cols, rows, x, y) { return x >= 0 && x < cols && y >= 0 && y < rows; }

  // Reachable open cells from (sx,sy), BFS over empties, capped for speed.
  function floodCount(grid, cols, rows, sx, sy, cap) {
    if (!inBounds(cols, rows, sx, sy) || grid[sy * cols + sx] !== 0) return 0;
    var seen = new Uint8Array(cols * rows);
    var qx = [sx], qy = [sy];
    seen[sy * cols + sx] = 1;
    var count = 0, head = 0;
    while (head < qx.length) {
      var x = qx[head], y = qy[head]; head++;
      count++;
      if (count >= cap) return count;
      for (var d = 0; d < 4; d++) {
        var nx = x + DX[d], ny = y + DY[d];
        if (!inBounds(cols, rows, nx, ny)) continue;
        var i = ny * cols + nx;
        if (seen[i] || grid[i] !== 0) continue;
        seen[i] = 1; qx.push(nx); qy.push(ny);
      }
    }
    return count;
  }

  // BFS distances from a start cell (the start itself may be occupied — it's a
  // head); expansion only through empty cells.
  function bfsDist(grid, cols, rows, sx, sy) {
    var INF = 65535;
    var dist = new Uint16Array(cols * rows);
    dist.fill(INF);
    if (!inBounds(cols, rows, sx, sy)) return dist;
    var qx = [sx], qy = [sy];
    dist[sy * cols + sx] = 0;
    var head = 0;
    while (head < qx.length) {
      var x = qx[head], y = qy[head]; head++;
      var nd = dist[y * cols + x] + 1;
      for (var d = 0; d < 4; d++) {
        var nx = x + DX[d], ny = y + DY[d];
        if (!inBounds(cols, rows, nx, ny)) continue;
        var i = ny * cols + nx;
        if (grid[i] !== 0 || dist[i] <= nd) continue;
        dist[i] = nd; qx.push(nx); qy.push(ny);
      }
    }
    return dist;
  }

  // Cells I can reach strictly sooner than the opponent, assuming I stand on
  // (myX,myY). The candidate cell is temporarily claimed in the grid by the
  // caller, so walls are accounted for.
  function voronoiScore(grid, cols, rows, myX, myY, opX, opY) {
    var dm = bfsDist(grid, cols, rows, myX, myY);
    var doo = bfsDist(grid, cols, rows, opX, opY);
    var mine = 0;
    for (var i = 0; i < dm.length; i++) {
      if (grid[i] !== 0) continue;
      if (dm[i] < doo[i]) mine++;
    }
    return mine;
  }

  // Decide a direction for player `id`. Returns 0-3, or null to keep straight.
  function decide(game, id, level, rng) {
    rng = rng || Math.random;
    var me = null, opp = null;
    for (var i = 0; i < game.players.length; i++) {
      var pl = game.players[i];
      if (pl.id === id) me = pl;
      else if (pl.alive) opp = pl;
    }
    if (!me || !me.alive || game.over) return null;

    var cols = game.cols, rows = game.rows, grid = game.grid;
    var cands = [me.dir, leftOf(me.dir), rightOf(me.dir)];

    // 1-step safety for every level: an occupied/out-of-bounds cell is death.
    var safe = [];
    for (var c = 0; c < cands.length; c++) {
      var d = cands[c];
      var nx = me.x + DX[d], ny = me.y + DY[d];
      if (inBounds(cols, rows, nx, ny) && grid[ny * cols + nx] === 0) {
        safe.push({ dir: d, x: nx, y: ny });
      }
    }
    if (!safe.length) return null; // trapped — ride into the wall with dignity
    if (safe.length === 1) return safe[0].dir;

    if (level === 'easy') {
      // Wander a little, otherwise keep going straight if that's safe.
      if (rng() < 0.10) return safe[Math.floor(rng() * safe.length)].dir;
      for (var s = 0; s < safe.length; s++) if (safe[s].dir === me.dir) return me.dir;
      return safe[Math.floor(rng() * safe.length)].dir;
    }

    if (level === 'medium') {
      var bestF = -1, bestDir = safe[0].dir;
      for (var m = 0; m < safe.length; m++) {
        var f = floodCount(grid, cols, rows, safe[m].x, safe[m].y, 260);
        // slight straight preference on ties
        if (f > bestF || (f === bestF && safe[m].dir === me.dir)) { bestF = f; bestDir = safe[m].dir; }
      }
      // occasional mistake keeps it human-beatable
      if (rng() < 0.12) return safe[Math.floor(rng() * safe.length)].dir;
      return bestDir;
    }

    // hard — Voronoi territory (fall back to flood-fill if no live opponent)
    if (!opp) {
      var bf = -1, bd = safe[0].dir;
      for (var h = 0; h < safe.length; h++) {
        var ff = floodCount(grid, cols, rows, safe[h].x, safe[h].y, 2000);
        if (ff > bf || (ff === bf && safe[h].dir === me.dir)) { bf = ff; bd = safe[h].dir; }
      }
      return bd;
    }
    var bestV = -1, bestVDir = safe[0].dir;
    for (var v = 0; v < safe.length; v++) {
      var cellIdx = safe[v].y * cols + safe[v].x;
      grid[cellIdx] = id; // temporarily claim the candidate cell
      var score = voronoiScore(grid, cols, rows, safe[v].x, safe[v].y, opp.x, opp.y);
      grid[cellIdx] = 0;
      if (score > bestV || (score === bestV && safe[v].dir === me.dir)) { bestV = score; bestVDir = safe[v].dir; }
    }
    return bestVDir;
  }

  var NCAi = { decide: decide, floodCount: floodCount, voronoiScore: voronoiScore };
  global.NCAi = NCAi;
  if (typeof module !== 'undefined' && module.exports) module.exports = NCAi;
})(typeof window !== 'undefined' ? window : this);
