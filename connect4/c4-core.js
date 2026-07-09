/*
 * Connect 4 — pure game core (rendering-independent, deterministic).
 *
 * Two layers:
 *  1. Low-level rules operating on a plain board array (matches the original
 *     inline logic exactly): createBoard, getValidMoves, getDropRow, checkWin,
 *     isBoardFull.
 *  2. Immutable state API — a game IS its move list. applyMove folds a column
 *     into a new state; replay(moves) rebuilds any position. This is the
 *     substrate for undo/redo, network sync, spectate and server validation.
 *
 * Works both in the browser (window.C4Core) and Node (module.exports) so the
 * same file powers the game and the test suite.
 */
(function (root) {
  'use strict';

  var ROWS = 6, COLS = 7, EMPTY = 0, PLAYER = 1, AI = 2;

  // ── Layer 1: rules on a board array ──
  function createBoard() {
    var b = [];
    for (var r = 0; r < ROWS; r++) {
      b.push(new Array(COLS).fill(EMPTY));
    }
    return b;
  }

  function getValidMoves(board) {
    var moves = [];
    for (var col = 0; col < COLS; col++) {
      if (board[0][col] === EMPTY) moves.push(col);
    }
    return moves;
  }

  // Lowest empty row in a column, or -1 if full.
  function getDropRow(board, col) {
    for (var row = ROWS - 1; row >= 0; row--) {
      if (board[row][col] === EMPTY) return row;
    }
    return -1;
  }

  // Returns the 4 winning cells [[r,c],...] for `player`, or null.
  function checkWin(board, player) {
    var r, c;
    // Horizontal
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c <= COLS - 4; c++) {
        if (board[r][c] === player && board[r][c + 1] === player &&
            board[r][c + 2] === player && board[r][c + 3] === player) {
          return [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]];
        }
      }
    }
    // Vertical
    for (r = 0; r <= ROWS - 4; r++) {
      for (c = 0; c < COLS; c++) {
        if (board[r][c] === player && board[r + 1][c] === player &&
            board[r + 2][c] === player && board[r + 3][c] === player) {
          return [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]];
        }
      }
    }
    // Diagonal down-right
    for (r = 0; r <= ROWS - 4; r++) {
      for (c = 0; c <= COLS - 4; c++) {
        if (board[r][c] === player && board[r + 1][c + 1] === player &&
            board[r + 2][c + 2] === player && board[r + 3][c + 3] === player) {
          return [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]];
        }
      }
    }
    // Diagonal up-right
    for (r = 3; r < ROWS; r++) {
      for (c = 0; c <= COLS - 4; c++) {
        if (board[r][c] === player && board[r - 1][c + 1] === player &&
            board[r - 2][c + 2] === player && board[r - 3][c + 3] === player) {
          return [[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]];
        }
      }
    }
    return null;
  }

  function isBoardFull(board) {
    return board[0].every(function (cell) { return cell !== EMPTY; });
  }

  // ── Layer 2: immutable state (a game = its move list) ──
  // state: { board, moves[], current, status:'playing'|'won'|'draw',
  //          winner, winningCells, lastDrop }
  function createGame() {
    return {
      board: createBoard(),
      moves: [],
      current: PLAYER,           // Yellow always starts
      status: 'playing',
      winner: EMPTY,
      winningCells: null,
      lastDrop: null
    };
  }

  // Returns a NEW state with `col` played by the current player. Illegal moves
  // (full column) and moves after game over are no-ops (return the same state).
  function applyMove(state, col) {
    if (state.status !== 'playing') return state;
    var row = getDropRow(state.board, col);
    if (row === -1) return state;

    var board = state.board.map(function (r) { return r.slice(); });
    var player = state.current;
    board[row][col] = player;

    var win = checkWin(board, player);
    var status = 'playing', winner = EMPTY, winningCells = null;
    if (win) { status = 'won'; winner = player; winningCells = win; }
    else if (isBoardFull(board)) { status = 'draw'; }

    return {
      board: board,
      moves: state.moves.concat(col),
      current: status === 'playing' ? (player === PLAYER ? AI : PLAYER) : player,
      status: status,
      winner: winner,
      winningCells: winningCells,
      lastDrop: { row: row, col: col, player: player }
    };
  }

  // Rebuild a state from a list of columns (the canonical serialization).
  function replay(cols) {
    var s = createGame();
    for (var i = 0; i < cols.length; i++) s = applyMove(s, cols[i]);
    return s;
  }

  var C4Core = {
    ROWS: ROWS, COLS: COLS, EMPTY: EMPTY, PLAYER: PLAYER, AI: AI,
    createBoard: createBoard,
    getValidMoves: getValidMoves,
    getDropRow: getDropRow,
    checkWin: checkWin,
    isBoardFull: isBoardFull,
    createGame: createGame,
    applyMove: applyMove,
    replay: replay
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = C4Core;
  else root.C4Core = C4Core;
})(typeof self !== 'undefined' ? self : this);
