console.log("PIECE SAFE 1.0 LOADED");

import { CONFIG } from "./config.js";

// SRS Wall Kick Data
// Testar dessa offsetpar i ordning vid rotation
// Format: [dx, dy] där positiv dy = nedåt

// För J, L, S, T, Z pjäser
const WALL_KICKS_JLSTZ = {
  "0->1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "1->0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "1->2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "2->1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "2->3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "3->2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "3->0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "0->3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

// För I-pjäsen (speciella kicks)
const WALL_KICKS_I = {
  "0->1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "1->0": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "1->2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  "2->1": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "2->3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "3->2": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "3->0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "0->3": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

export class Piece {
  constructor(matrix, color, type) {
    this.matrix = matrix;
    this.color = color;
    this.type = type; // 'I', 'O', 'T', 'L', 'J', 'S', 'Z'
    this.rotation = 0; // 0, 1, 2, 3 (0=spawn, medurs)
    this.row = 0;
    this.col = 0;
  }

  setSpawnPosition() {
    this.row = -1;
    this.col = Math.floor((CONFIG.BOARD_COLS - 4) / 2);
  }

  tryMove(dx, dy, grid) {
    if (grid.canMove(this, dx, dy)) {
      this.col += dx;
      this.row += dy;
      return true;
    }
    return false;
  }

  tryRotateCW(grid) {
    // O-pjäsen roterar inte
    if (this.type === 'O') return false;

    const newRotation = (this.rotation + 1) % 4;
    const rotated = this.rotatedCWMatrix();
    
    return this.tryWallKicks(rotated, this.rotation, newRotation, grid);
  }

  tryRotateCCW(grid) {
    // O-pjäsen roterar inte
    if (this.type === 'O') return false;

    const newRotation = (this.rotation + 3) % 4; // +3 = -1 mod 4
    const rotated = this.rotatedCCWMatrix();
    
    return this.tryWallKicks(rotated, this.rotation, newRotation, grid);
  }

  tryWallKicks(rotatedMatrix, fromRot, toRot, grid) {
    const kickKey = `${fromRot}->${toRot}`;
    const kickTable = this.type === 'I' ? WALL_KICKS_I : WALL_KICKS_JLSTZ;
    const kicks = kickTable[kickKey];

    if (!kicks) {
      // Fallback om något gick fel
      if (this.canApplyRotation(rotatedMatrix, 0, 0, grid)) {
        this.matrix = rotatedMatrix;
        this.rotation = toRot;
        return { success: true, wasKick: false };
      }
      return false;
    }

    // Testa varje kick-offset
    for (let i = 0; i < kicks.length; i++) {
      const [dx, dy] = kicks[i];
      if (this.canApplyRotation(rotatedMatrix, dx, dy, grid)) {
        this.matrix = rotatedMatrix;
        this.col += dx;
        this.row += dy;
        this.rotation = toRot;
        // wasKick = true om vi INTE använde första offseten (0,0)
        return { success: true, wasKick: i > 0 };
      }
    }

    return false;
  }

  rotatedCWMatrix() {
    const r = [[], [], [], []];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        r[x][3 - y] = this.matrix[y][x];
      }
    }
    return r;
  }

  rotatedCCWMatrix() {
    const r = [[], [], [], []];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        r[3 - x][y] = this.matrix[y][x];
      }
    }
    return r;
  }

  canApplyRotation(rotated, dx, dy, grid) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!rotated[r][c]) continue;

        const newCol = this.col + c + dx;
        const newRow = this.row + r + dy;

        if (newCol < 0 || newCol >= grid.cols) return false;
        if (newRow >= grid.rows) return false;
        if (newRow < 0) continue;
        if (grid.cells[newRow][newCol]) return false;
      }
    }
    return true;
  }
}

// ------------------------------------------------------------
// 7-Bag Randomizer
// ------------------------------------------------------------
class PieceBag {
  constructor() {
    this.bag = [];
    this.shapes = null; // Initieras vid första anropet
  }

  getShapes() {
    if (this.shapes) return this.shapes;
    
    const C = CONFIG.COLORS;
    this.shapes = [
      {
        type: 'I',
        m: [
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        color: C.pieceI,
      },
      {
        type: 'O',
        m: [
          [0, 1, 1, 0],
          [0, 1, 1, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        color: C.pieceO,
      },
      {
        type: 'T',
        m: [
          [0, 1, 0, 0],
          [1, 1, 1, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        color: C.pieceT,
      },
      {
        type: 'L',
        m: [
          [0, 0, 1, 0],
          [1, 1, 1, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        color: C.pieceL,
      },
      {
        type: 'J',
        m: [
          [1, 0, 0, 0],
          [1, 1, 1, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        color: C.pieceJ,
      },
      {
        type: 'S',
        m: [
          [0, 1, 1, 0],
          [1, 1, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        color: C.pieceS,
      },
      {
        type: 'Z',
        m: [
          [1, 1, 0, 0],
          [0, 1, 1, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        color: C.pieceZ,
      },
    ];
    return this.shapes;
  }

  fillBag() {
    // Kopiera alla shapes och shuffla (Fisher-Yates)
    this.bag = [...this.getShapes()];
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  next() {
    if (this.bag.length === 0) {
      this.fillBag();
    }
    return this.bag.pop();
  }

  reset() {
    this.bag = [];
  }
}

// Global bag instance
const pieceBag = new PieceBag();

// ------------------------------------------------------------
// Skapar nästa pjäs från 7-bag
// ------------------------------------------------------------
export function createRandomPiece() {
  const s = pieceBag.next();
  const clone = s.m.map((row) => row.slice());
  const p = new Piece(clone, s.color, s.type);
  p.setSpawnPosition();
  return p;
}

// Reset bag (vid restart)
export function resetPieceBag() {
  pieceBag.reset();
}