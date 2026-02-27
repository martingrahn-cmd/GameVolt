console.log("GRID SAFE 1.0 LOADED");

import { CONFIG } from "./config.js";

export class Grid {
  constructor() {
    this.cols = CONFIG.BOARD_COLS;
    this.rows = CONFIG.BOARD_ROWS;

    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      this.cells[r] = new Array(this.cols).fill(null);
    }
  }

  reset() {
    for (let r = 0; r < this.rows; r++) {
      this.cells[r].fill(null);
    }
  }

  // Kan pjäsen flyttas dx, dy?
  canMove(piece, dx, dy) {
    const m = piece.matrix;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!m[r][c]) continue;

        const newCol = piece.col + c + dx;
        const newRow = piece.row + r + dy;

        // Väggar / botten
        if (newCol < 0 || newCol >= this.cols) return false;
        if (newRow >= this.rows) return false;

        // Ovanför skärmen är OK
        if (newRow < 0) continue;

        // Krock med låst cell
        if (this.cells[newRow][newCol]) return false;
      }
    }
    return true;
  }

  // Lås pjäsen i rutnätet
  lockPiece(piece) {
    const m = piece.matrix;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!m[r][c]) continue;

        const gx = piece.col + c;
        const gy = piece.row + r;
        if (gy < 0 || gy >= this.rows) continue;

        this.cells[gy][gx] = { color: piece.color };
      }
    }
  }

  // Rensa hela rader – returnerar { count, rows }
  clearFullLines() {
    let cleared = 0;
    const rowsCleared = [];
    const newRows = [];

    for (let r = this.rows - 1; r >= 0; r--) {
      const row = this.cells[r];
      const full = row.every((cell) => cell !== null);

      if (full) {
        cleared++;
        rowsCleared.push(r);
      } else {
        newRows.unshift(row);
      }
    }

    while (newRows.length < this.rows) {
      newRows.unshift(new Array(this.cols).fill(null));
    }

    this.cells = newRows;
    return { count: cleared, rows: rowsCleared };
  }

  // Layout-hjälp till Game
  computeLayout(canvas) {
    const boardCols = CONFIG.BOARD_COLS;
    const boardRows = CONFIG.BOARD_ROWS;
    const sidebarCols = CONFIG.SIDEBAR_COLS;
    const margin = CONFIG.OUTER_MARGIN;

    const availW = canvas.width - margin * 2;
    const availH = canvas.height - margin * 2;
    
    const aspectRatio = canvas.width / canvas.height;
    
    // Portrait mode (mobil) - sidebar under spelplanen
    if (aspectRatio < 0.75) {
      // Reservera plats för HUD längst ner
      const hudHeight = 70; // Fast höjd för HUD
      const availableForBoard = availH - hudHeight - margin;
      
      // Beräkna cellSize baserat på både bredd och tillgänglig höjd
      const cellSizeByWidth = Math.floor(availW / boardCols);
      const cellSizeByHeight = Math.floor(availableForBoard / boardRows);
      const finalCellSize = Math.min(cellSizeByWidth, cellSizeByHeight);
      
      const finalBoardWidth = boardCols * finalCellSize;
      const finalBoardHeight = boardRows * finalCellSize;
      
      const boardX = Math.floor((canvas.width - finalBoardWidth) / 2);
      const boardY = margin;
      
      const sidebarWidth = finalBoardWidth;
      const sidebarX = boardX;
      const sidebarY = boardY + finalBoardHeight + 8;
      const finalSidebarHeight = canvas.height - sidebarY - margin;
      
      return {
        width: canvas.width,
        height: canvas.height,
        cellSize: finalCellSize,
        boardX,
        boardY,
        boardWidth: finalBoardWidth,
        boardHeight: finalBoardHeight,
        sidebarX,
        sidebarY,
        sidebarWidth,
        sidebarHeight: Math.max(60, finalSidebarHeight),
        isPortrait: true
      };
    }
    
    // Landscape/desktop mode - sidebar bredvid
    const totalCols = boardCols + sidebarCols;
    const rows = boardRows;

    const cellSize = Math.floor(
      Math.min(availW / totalCols, availH / rows)
    );

    const totalWidth = totalCols * cellSize;
    const totalHeight = rows * cellSize;

    const frameX = Math.floor((canvas.width - totalWidth) / 2);
    const frameY = Math.floor((canvas.height - totalHeight) / 2);

    const boardX = frameX;
    const boardY = frameY;
    const boardWidth = boardCols * cellSize;
    const boardHeight = rows * cellSize;

    const sidebarX = boardX + boardWidth;
    const sidebarY = frameY;
    const sidebarWidth = sidebarCols * cellSize;
    const sidebarHeight = boardHeight;

    return {
      width: canvas.width,
      height: canvas.height,
      cellSize,
      boardX,
      boardY,
      boardWidth,
      boardHeight,
      sidebarX,
      sidebarY,
      sidebarWidth,
      sidebarHeight,
      isPortrait: false
    };
  }
}