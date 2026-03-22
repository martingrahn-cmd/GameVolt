/* ── Board Logic Mixin ── */

import { BOARD_SIZE, MOOD_VARIANTS, TILE_TYPES, SPECIAL } from "./constants.js";

export const boardMixin = {
  buildObstacleGrid(obstacleMap) {
    this.obstacles = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    if (!obstacleMap) return;
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      const rowText = obstacleMap[r] ?? ".".repeat(BOARD_SIZE);
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        const char = rowText[c] ?? ".";
        if (char === "i") this.obstacles[r][c] = { kind: "ink", layers: 2 };
        else if (char === "f") this.obstacles[r][c] = { kind: "frame", layers: 2 };
      }
    }
  },

  initBoard() {
    this.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        if (this.isFrameCell(r, c)) continue;
        this.board[r][c] = this.createRandomTile();
      }
    }
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        if (!this.board[r][c]) continue;
        while (this.formsInitialMatch(r, c, this.board[r][c].type)) {
          this.board[r][c] = this.createRandomTile();
        }
      }
    }
    if (!this.hasAnyPossibleMove()) this.shuffleBoard(true);
  },

  applyLockMap(lockMap) {
    if (!lockMap) return;
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      const rowText = lockMap[r] ?? ".".repeat(BOARD_SIZE);
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        if (rowText[c] === "l" && this.board[r][c]) this.board[r][c].locked = true;
      }
    }
  },

  createRandomTile(typeOverride) {
    const type = typeOverride ?? Math.floor(Math.random() * TILE_TYPES.length);
    return { type, special: null, locked: false, mood: this.randomMood() };
  },

  randomMood() { return Math.floor(Math.random() * MOOD_VARIANTS); },

  formsInitialMatch(r, c, type) {
    const leftA = this.board[r][c - 1];
    const leftB = this.board[r][c - 2];
    const topA = this.board[r - 1]?.[c];
    const topB = this.board[r - 2]?.[c];
    return Boolean(leftA && leftB && leftA.type === type && leftB.type === type) ||
           Boolean(topA && topB && topA.type === type && topB.type === type);
  },

  findMatches() {
    const runs = [];
    const matched = new Set();
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      let c = 0;
      while (c < BOARD_SIZE) {
        const current = this.board[r][c];
        if (!current) { c += 1; continue; }
        let end = c + 1;
        while (end < BOARD_SIZE && this.board[r][end]?.type === current.type) end += 1;
        if (end - c >= 3) {
          const cells = [];
          for (let x = c; x < end; x += 1) { cells.push({ row: r, col: x }); matched.add(this.key(r, x)); }
          runs.push({ cells, orientation: "h", length: end - c });
        }
        c = end;
      }
    }
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      let r = 0;
      while (r < BOARD_SIZE) {
        const current = this.board[r][c];
        if (!current) { r += 1; continue; }
        let end = r + 1;
        while (end < BOARD_SIZE && this.board[end][c]?.type === current.type) end += 1;
        if (end - r >= 3) {
          const cells = [];
          for (let x = r; x < end; x += 1) { cells.push({ row: x, col: c }); matched.add(this.key(x, c)); }
          runs.push({ cells, orientation: "v", length: end - r });
        }
        r = end;
      }
    }
    return { runs, matchSet: matched };
  },

  determineSpecials(runs, lastSwap) {
    const map = new Map();
    const horizontal = runs.filter((run) => run.orientation === "h");
    const vertical = runs.filter((run) => run.orientation === "v");
    for (const hRun of horizontal) {
      for (const vRun of vertical) {
        const intersection = hRun.cells.find((hCell) => vRun.cells.some((vCell) => vCell.row === hCell.row && vCell.col === hCell.col));
        if (!intersection) continue;
        const tile = this.board[intersection.row][intersection.col];
        if (!tile) continue;
        map.set(this.key(intersection.row, intersection.col), { special: SPECIAL.BOMB, type: tile.type, mood: tile.mood ?? this.randomMood() });
      }
    }
    for (const run of runs) {
      if (run.length < 4) continue;
      const cell = this.pickSpecialCell(run, lastSwap);
      const tile = this.board[cell.row][cell.col];
      if (!tile) continue;
      if (run.length >= 5) { map.set(this.key(cell.row, cell.col), { special: SPECIAL.COLOR, type: tile.type, mood: tile.mood ?? this.randomMood() }); continue; }
      if (!map.has(this.key(cell.row, cell.col))) {
        map.set(this.key(cell.row, cell.col), { special: run.orientation === "h" ? SPECIAL.LINE_H : SPECIAL.LINE_V, type: tile.type, mood: tile.mood ?? this.randomMood() });
      }
    }
    return map;
  },

  pickSpecialCell(run, lastSwap) {
    const candidates = [];
    if (lastSwap) { for (const moved of lastSwap) { if (run.cells.some((cell) => cell.row === moved.row && cell.col === moved.col)) candidates.push(moved); } }
    for (const cell of run.cells) candidates.push(cell);
    for (const candidate of candidates) { const tile = this.board[candidate.row][candidate.col]; if (tile && !tile.locked) return candidate; }
    return run.cells[Math.floor(run.cells.length / 2)];
  },

  expandClearBySpecial(initialSet) {
    const clearSet = new Set(initialSet);
    const queue = [...initialSet];
    const seen = new Set();
    while (queue.length > 0) {
      const key = queue.shift();
      if (seen.has(key)) continue;
      seen.add(key);
      const [row, col] = this.fromKey(key);
      const tile = this.board[row][col];
      if (!tile || !tile.special) continue;
      if (tile.special === SPECIAL.COLOR) { this.collectTilesByType(tile.type, clearSet); continue; }
      const temp = new Set();
      this.addSpecialArea(row, col, tile.special, temp);
      for (const tempKey of temp) { if (!clearSet.has(tempKey)) { clearSet.add(tempKey); queue.push(tempKey); } }
    }
    return clearSet;
  },

  applySpecialMapToClearSet(specialMap, clearSet) {
    const filtered = new Map();
    for (const [key, value] of specialMap.entries()) {
      const [row, col] = this.fromKey(key);
      const tile = this.board[row][col];
      if (!tile || tile.locked) continue;
      clearSet.delete(key);
      filtered.set(key, value);
    }
    return filtered;
  },

  applyGravityStep() {
    const moved = [];
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      let segment = [];
      for (let r = 0; r <= BOARD_SIZE; r += 1) {
        const isBoundary = r === BOARD_SIZE || this.isFrameCell(r, c);
        if (!isBoundary) { segment.push(r); continue; }
        if (segment.length > 0) {
          let writeIndex = segment.length - 1;
          for (let i = segment.length - 1; i >= 0; i -= 1) {
            const fromRow = segment[i];
            const tile = this.board[fromRow][c];
            if (!tile) continue;
            const toRow = segment[writeIndex];
            if (fromRow !== toRow) { this.board[toRow][c] = tile; this.board[fromRow][c] = null; moved.push({ row: toRow, col: c, fromRow, distance: toRow - fromRow }); }
            writeIndex -= 1;
          }
          for (let i = writeIndex; i >= 0; i -= 1) this.board[segment[i]][c] = null;
        }
        segment = [];
      }
    }
    return moved;
  },

  fillEmptyTiles() {
    const spawned = [];
    this.spawnOffsets.clear();
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      let segmentDepth = 0;
      for (let r = 0; r < BOARD_SIZE; r += 1) {
        if (this.isFrameCell(r, c)) { segmentDepth = 0; continue; }
        if (!this.board[r][c]) {
          segmentDepth += 1;
          this.board[r][c] = this.createRandomTile();
          const key = this.key(r, c);
          spawned.push(key);
          this.spawnOffsets.set(key, segmentDepth);
          continue;
        }
        segmentDepth = 0;
      }
    }
    return spawned;
  },

  addSpecialArea(row, col, special, targetSet) {
    if (!special) return;
    if (special === SPECIAL.LINE_H) { for (let c = 0; c < BOARD_SIZE; c += 1) { if (!this.isFrameCell(row, c)) targetSet.add(this.key(row, c)); } return; }
    if (special === SPECIAL.LINE_V) { for (let r = 0; r < BOARD_SIZE; r += 1) { if (!this.isFrameCell(r, col)) targetSet.add(this.key(r, col)); } return; }
    if (special === SPECIAL.BOMB) { for (let r = row - 1; r <= row + 1; r += 1) { for (let c = col - 1; c <= col + 1; c += 1) { if (!this.inBounds(r, c) || this.isFrameCell(r, c)) continue; targetSet.add(this.key(r, c)); } } return; }
    if (special === SPECIAL.COLOR) { const source = this.board[row][col]; if (source) this.collectTilesByType(source.type, targetSet); }
  },

  collectTilesByType(type, targetSet) {
    for (let r = 0; r < BOARD_SIZE; r += 1) { for (let c = 0; c < BOARD_SIZE; c += 1) { const tile = this.board[r][c]; if (tile && tile.type === type) targetSet.add(this.key(r, c)); } }
  },

  collectNeighborReactionSet(clearedSet) {
    const reaction = new Set();
    const source = new Set(clearedSet);
    for (const key of source) {
      const [row, col] = this.fromKey(key);
      for (let dr = -1; dr <= 1; dr += 1) { for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr; const nc = col + dc;
        if (!this.inBounds(nr, nc) || this.isFrameCell(nr, nc)) continue;
        const nearKey = this.key(nr, nc);
        if (source.has(nearKey) || !this.board[nr][nc]) continue;
        reaction.add(nearKey);
      }}
    }
    return reaction;
  },

  isFrameCell(row, col) { return this.obstacles[row]?.[col]?.kind === "frame"; },
  key(row, col) { return `${row},${col}`; },
  fromKey(key) { return key.split(",").map(Number); },
  inBounds(row, col) { return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE; },

  hasAnyPossibleMove() { return this.findHintMove() !== null; },

  findHintMove() {
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        if (!this.canSwapCell(r, c)) continue;
        if (c + 1 < BOARD_SIZE && this.canSwapCell(r, c + 1) && this.testSwapForMatch(r, c, r, c + 1)) return [{ row: r, col: c }, { row: r, col: c + 1 }];
        if (r + 1 < BOARD_SIZE && this.canSwapCell(r + 1, c) && this.testSwapForMatch(r, c, r + 1, c)) return [{ row: r, col: c }, { row: r + 1, col: c }];
      }
    }
    return null;
  },

  canSwapCell(row, col) { const tile = this.board[row][col]; return Boolean(tile && !tile.locked && !this.isFrameCell(row, col)); },

  testSwapForMatch(r1, c1, r2, c2) {
    const a = this.board[r1][c1]; const b = this.board[r2][c2];
    this.board[r1][c1] = b; this.board[r2][c2] = a;
    const hasMatch = Boolean(a?.special || b?.special) || this.findMatches().matchSet.size > 0;
    this.board[r1][c1] = a; this.board[r2][c2] = b;
    return hasMatch;
  },

  shuffleBoard(silent = false) {
    const pool = [];
    for (let r = 0; r < BOARD_SIZE; r += 1) { for (let c = 0; c < BOARD_SIZE; c += 1) { if (this.isFrameCell(r, c)) continue; pool.push({ ...(this.board[r][c] ?? this.createRandomTile()), special: null }); } }
    let safety = 0;
    do {
      safety += 1;
      const shuffled = this.shuffleArray(pool);
      let index = 0;
      for (let r = 0; r < BOARD_SIZE; r += 1) { for (let c = 0; c < BOARD_SIZE; c += 1) { if (this.isFrameCell(r, c)) { this.board[r][c] = null; continue; } this.board[r][c] = { ...shuffled[index] }; index += 1; } }
    } while ((this.findMatches().matchSet.size > 0 || !this.hasAnyPossibleMove()) && safety < 200);
    if (!this.hasAnyPossibleMove()) this.releaseAllLocks();
    if (!silent) this.render();
  },

  releaseAllLocks() {
    for (let r = 0; r < BOARD_SIZE; r += 1) { for (let c = 0; c < BOARD_SIZE; c += 1) { const tile = this.board[r][c]; if (tile?.locked) tile.locked = false; } }
  },

  shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  },

  applyImpactEffects(impactSet) {
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        const obstacle = this.obstacles[r][c];
        if (!obstacle) continue;
        let shouldDamage = false;
        if (obstacle.kind === "ink") shouldDamage = this.isCellImpacted(r, c, impactSet, true);
        else if (obstacle.kind === "frame") shouldDamage = this.isCellImpacted(r, c, impactSet, false);
        if (shouldDamage) { obstacle.layers -= 1; if (obstacle.layers <= 0) { this.obstacles[r][c] = null; this.clearedObstacleCounts[obstacle.kind] += 1; } }
      }
    }
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        const tile = this.board[r][c];
        if (!tile || !tile.locked) continue;
        if (!this.isCellImpacted(r, c, impactSet, true)) continue;
        tile.locked = false;
        this.unlockedCount += 1;
      }
    }
  },

  isCellImpacted(row, col, impactSet, includeSelf) {
    if (includeSelf && impactSet.has(this.key(row, col))) return true;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = row + dr; const nc = col + dc;
      if (!this.inBounds(nr, nc)) continue;
      if (impactSet.has(this.key(nr, nc))) return true;
    }
    return false;
  },
};
