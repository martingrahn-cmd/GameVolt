console.log("GAME SAFE 1.0 LOADED");

import { CONFIG } from "./config.js";
import { Grid } from "./grid.js";
import { Renderer } from "./renderer.js";
import { createRandomPiece, resetPieceBag } from "./piece.js";
import { Input } from "./input.js";
import { AudioSystem } from "./audio.js";

const GRAVITY_TABLE = [
  0.8, 0.72, 0.63, 0.55, 0.47,
  0.40, 0.32, 0.26, 0.20, 0.13, 0.10,
];

function getLineScore(lines, level, tSpin, combo) {
  const L = level + 1;
  let base = 0;
  
  if (tSpin === 'full') {
    // T-spin bonusar (nerfade - ca 2x vanliga clears)
    switch (lines) {
      case 0: base = 100 * L; break;  // T-spin no lines
      case 1: base = 200 * L; break;  // T-spin single (var 800)
      case 2: base = 400 * L; break;  // T-spin double (var 1200)
      case 3: base = 800 * L; break;  // T-spin triple (var 1600)
    }
  } else if (tSpin === 'mini') {
    // Mini T-spin
    switch (lines) {
      case 0: base = 50 * L; break;
      case 1: base = 100 * L; break;
      case 2: base = 200 * L; break;
    }
  } else {
    // Vanliga poäng
    switch (lines) {
      case 1: base = 40 * L; break;
      case 2: base = 100 * L; break;
      case 3: base = 300 * L; break;
      case 4: base = 1200 * L; break;
    }
  }
  
  // Combo bonus: 50 × combo × level (startar på combo 1)
  // Combo 1 = +50, Combo 2 = +100, Combo 3 = +150, etc.
  const comboBonus = combo > 0 ? 50 * combo * L : 0;
  
  return base + comboBonus;
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.grid = new Grid();
    this.renderer = new Renderer(canvas, this.grid, this);
    this.audio = new AudioSystem();
    this.input = new Input(this);

    this.activePiece = null;
    this.nextPiece = null;
    this.lastAction = null; // 'move', 'rotate', 'drop'
    this.lastKick = false;  // Var senaste rotation en wall kick?

    this.running = false;
    this.gameOver = false;
    this.gameWon = false;
    this.paused = false;
    this.lastTime = 0;
    this.gravityTimer = 0;
    this.gravityInterval = GRAVITY_TABLE[0];

    // Game mode: 'marathon' (default), 'sprint', 'ultra'
    this.gameMode = 'marathon';
    this.sprintLines = 40;
    this.ultraTime = 180; // 3 minuter
    this.timeRemaining = 0;

    // Lock delay system
    this.lockDelayTime = 0.5;      // 500ms att flytta innan lock
    this.lockDelayTimer = 0;       // Nuvarande timer
    this.lockDelayResets = 0;      // Antal gånger delay återställts
    this.lockDelayMaxResets = 15;  // Max återställningar (förhindrar infinite stall)
    this.pieceOnGround = false;    // Är pjäsen på marken?

    // Options (ladda från localStorage)
    this.options = {
      ghostEnabled: localStorage.getItem("tetris_ghost") !== "false",
      soundEnabled: localStorage.getItem("tetris_sound") !== "false",
    };

    // Statistik
    this.stats = {
      piecesPlaced: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      tetrises: 0,
      tSpins: 0,
      tSpinMinis: 0,
      maxCombo: 0,
      hardDrops: 0,
      time: 0,  // sekunder
    };

    this.score = 0;
    this.lines = 0;
    this.level = 0;
    this.startLevel = 0;  // Vald startlevel
    this.highScore = Number(
      localStorage.getItem("pulse_tetris_highscore") || 0
    );
    
    // För att visa T-spin meddelande
    this.lastClearType = null;
    this.clearMessageTimer = 0;
    
    // Combo-system
    this.combo = 0;

    this.loop = this.loop.bind(this);
    this.handleResize = this.handleResize.bind(this);

    window.addEventListener("resize", this.handleResize);
    this.handleResize();
    
    // Visa startskärm
    this.renderer.drawFrame(0, null, this.getHudState());
  }

  handleResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    const layout = this.grid.computeLayout(this.canvas);
    this.renderer.setLayout(layout);

    // Rita frame direkt
    this.renderer.drawFrame(0, this.activePiece, this.getHudState());
  }

  initPieces() {
    this.nextPiece = createRandomPiece();
    this.spawnNewPiece();
  }

  spawnNewPiece() {
    this.activePiece = this.nextPiece;
    this.activePiece.setSpawnPosition();
    this.nextPiece = createRandomPiece();
    this.gravityTimer = 0;
    this.lastAction = null;
    this.lastKick = false;
    
    // Trigga next piece animation
    this.renderer.triggerNextPieceAnim(this.nextPiece.type);
    
    // Reset lock delay
    this.lockDelayTimer = 0;
    this.lockDelayResets = 0;
    this.pieceOnGround = false;

    if (!this.grid.canMove(this.activePiece, 0, 0)) {
      this.endGame();
    }
  }

  endGame() {
    this.gameOver = true;
    this.running = false;
    this.audio.play("gameover");
    this.audio.stopMusic();
    
    // Anropa global funktion för att visa overlay
    if (window.showGameOver) {
      window.showGameOver(this.score);
    }
  }

  restart() {
    // Reset allt
    this.grid.reset();
    resetPieceBag();  // Reset 7-bag
    this.score = 0;
    this.lines = 0;
    this.level = this.startLevel;  // Återställ till vald startlevel
    const idx = Math.min(this.level, GRAVITY_TABLE.length - 1);
    this.gravityInterval = GRAVITY_TABLE[idx];
    this.gravityTimer = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.paused = false;
    this.activePiece = null;
    this.nextPiece = null;
    this.lastAction = null;
    this.lastKick = false;
    this.lastClearType = null;
    this.clearMessageTimer = 0;
    this.combo = 0;
    
    // Reset mode-specifikt
    if (this.gameMode === 'ultra') {
      this.timeRemaining = this.ultraTime;
    }
    
    // Reset lock delay
    this.lockDelayTimer = 0;
    this.lockDelayResets = 0;
    this.pieceOnGround = false;
    
    // Reset stats
    this.stats = {
      piecesPlaced: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      tetrises: 0,
      tSpins: 0,
      tSpinMinis: 0,
      maxCombo: 0,
      hardDrops: 0,
      time: 0,
    };
    
    // Starta om
    this.initPieces();
    this.start();
  }

  setStartLevel(level) {
    this.startLevel = level;
    this.level = level;
    const idx = Math.min(level, GRAVITY_TABLE.length - 1);
    this.gravityInterval = GRAVITY_TABLE[idx];
  }

  setGameMode(mode) {
    this.gameMode = mode;
    if (mode === 'ultra') {
      this.timeRemaining = this.ultraTime;
    }
  }

  togglePause() {
    if (this.gameOver) return;
    
    this.paused = !this.paused;
    
    if (this.paused) {
      // Pausa musik
      this.audio.pauseMusic();
    } else {
      // Återuppta spelet och musik
      this.lastTime = performance.now();
      requestAnimationFrame(this.loop);
      this.audio.playMusic();
    }
    
    // Meddela UI
    if (window.togglePauseOverlay) {
      window.togglePauseOverlay(this.paused);
    }
  }

  toggleOption(option) {
    if (option === 'ghost') {
      this.options.ghostEnabled = !this.options.ghostEnabled;
      localStorage.setItem("tetris_ghost", this.options.ghostEnabled);
    } else if (option === 'sound') {
      this.options.soundEnabled = !this.options.soundEnabled;
      localStorage.setItem("tetris_sound", this.options.soundEnabled);
    }
    return this.options;
  }

  getOptions() {
    return this.options;
  }

  start() {
    if (this.running) return;
    
    // Om första gången, initiera pjäser
    if (!this.activePiece) {
      this.initPieces();
    }
    
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  loop(ts) {
    if (!this.running || this.paused) return;
    const dt = (ts - this.lastTime) / 1000;
    this.lastTime = ts;

    this.update(dt);
    this.renderer.drawFrame(ts, this.activePiece, this.getHudState());

    requestAnimationFrame(this.loop);
  }

  update(dt) {
    if (!this.activePiece || this.gameOver) return;

    // Tracka tid
    this.stats.time += dt;

    // Ultra mode: räkna ner tid
    if (this.gameMode === 'ultra') {
      this.timeRemaining -= dt;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.endGame();
        return;
      }
    }

    // Kolla om pjäsen är på marken (kan inte flytta ner)
    const onGround = !this.grid.canMove(this.activePiece, 0, 1);
    
    if (onGround) {
      // Starta eller fortsätt lock delay timer
      if (!this.pieceOnGround) {
        this.pieceOnGround = true;
        this.lockDelayTimer = 0;
      }
      
      this.lockDelayTimer += dt;
      
      // Lock när timern går ut
      if (this.lockDelayTimer >= this.lockDelayTime) {
        this.lockPieceAndHandleLines();
        this.spawnNewPiece();
        return;
      }
    } else {
      // Pjäsen är inte på marken längre
      this.pieceOnGround = false;
      this.lockDelayTimer = 0;
      
      // Normal gravity
      this.gravityTimer += dt;
      if (this.gravityTimer >= this.gravityInterval) {
        this.gravityTimer -= this.gravityInterval;
        this.gravityStep();
      }
    }
    
    // Uppdatera meddelande-timer
    if (this.clearMessageTimer > 0) {
      this.clearMessageTimer -= dt * 1000;
    }
  }

  getHudState() {
    return {
      score: this.score,
      highScore: this.highScore,
      level: this.level,
      lines: this.lines,
      nextPiece: this.nextPiece,
      clearMessage: this.clearMessageTimer > 0 ? this.lastClearType : null,
      gameMode: this.gameMode,
      sprintLines: this.sprintLines,
      timeRemaining: this.timeRemaining,
    };
  }

  gravityStep() {
    const p = this.activePiece;
    if (!p) return;

    if (this.grid.canMove(p, 0, 1)) {
      p.row++;
      this.lastAction = 'drop';
    }
    // Lock hanteras nu i update() via lock delay
  }

  // Detektera T-spin
  detectTSpin() {
    const p = this.activePiece;
    
    // Måste vara T-pjäs och senaste action var rotation
    if (p.type !== 'T' || this.lastAction !== 'rotate') {
      return null;
    }

    // T-spinns hörn-check: 3 av 4 hörn runt T:ets centrum måste vara fyllda
    // T:ets centrum är på position (row+1, col+1) i 4x4 matrisen
    const centerRow = p.row + 1;
    const centerCol = p.col + 1;

    // De 4 hörnen runt centrum
    const corners = [
      [centerRow - 1, centerCol - 1], // top-left
      [centerRow - 1, centerCol + 1], // top-right
      [centerRow + 1, centerCol - 1], // bottom-left
      [centerRow + 1, centerCol + 1], // bottom-right
    ];

    let filledCorners = 0;
    let frontCornersFilled = 0;

    // Vilka hörn är "front" beror på rotation
    // rotation 0: front = top-left, top-right (index 0, 1)
    // rotation 1: front = top-right, bottom-right (index 1, 3)
    // rotation 2: front = bottom-left, bottom-right (index 2, 3)
    // rotation 3: front = top-left, bottom-left (index 0, 2)
    const frontIndices = {
      0: [0, 1],
      1: [1, 3],
      2: [2, 3],
      3: [0, 2],
    };

    corners.forEach(([r, c], idx) => {
      const isFilled = this.isOccupied(r, c);
      if (isFilled) {
        filledCorners++;
        if (frontIndices[p.rotation].includes(idx)) {
          frontCornersFilled++;
        }
      }
    });

    // T-spin: minst 3 hörn fyllda
    if (filledCorners >= 3) {
      // Full T-spin: båda fronthörn fyllda ELLER det var en wall kick
      if (frontCornersFilled === 2 || this.lastKick) {
        return 'full';
      } else {
        return 'mini';
      }
    }

    return null;
  }

  isOccupied(row, col) {
    // Utanför banan räknas som fyllt
    if (col < 0 || col >= this.grid.cols) return true;
    if (row >= this.grid.rows) return true;
    if (row < 0) return false; // Ovanför banan är tomt
    
    return this.grid.cells[row][col] !== null;
  }

  lockPieceAndHandleLines() {
    // Detektera T-spin INNAN vi låser pjäsen
    const tSpin = this.detectTSpin();
    
    // Statistik: pjäs placerad
    this.stats.piecesPlaced++;
    
    // Land-effekt
    this.renderer.triggerLandEffect(this.activePiece);
    
    this.grid.lockPiece(this.activePiece);
    
    // Spara cell-data INNAN vi rensar (för effekter)
    this.clearedCells = {};
    for (let r = 0; r < this.grid.rows; r++) {
      this.clearedCells[r] = [...this.grid.cells[r]];
    }
    
    const res = this.grid.clearFullLines();

    // Bygg meddelande
    let message = null;
    const isTetris = res.count === 4;
    
    if (res.count > 0) {
      // Öka combo
      this.combo++;
      
      // Statistik: max combo
      if (this.combo > this.stats.maxCombo) {
        this.stats.maxCombo = this.combo;
      }
      
      // Statistik: line clears
      if (tSpin === 'full') {
        this.stats.tSpins++;
        const names = ['T-SPIN', 'T-SPIN SINGLE', 'T-SPIN DOUBLE', 'T-SPIN TRIPLE'];
        message = names[res.count] || 'T-SPIN';
        this.renderer.triggerTSpinEffect();
      } else if (tSpin === 'mini') {
        this.stats.tSpinMinis++;
        message = `MINI T-SPIN ${res.count}`;
      } else if (isTetris) {
        this.stats.tetrises++;
        message = 'TETRIS!';
      } else if (res.count === 3) {
        this.stats.triples++;
      } else if (res.count === 2) {
        this.stats.doubles++;
      } else if (res.count === 1) {
        this.stats.singles++;
      }
      
      // Lägg till combo i meddelande
      if (this.combo > 1) {
        const comboText = `COMBO ×${this.combo}`;
        message = message ? `${message}\n${comboText}` : comboText;
      }
      
      const points = getLineScore(res.count, this.level, tSpin, this.combo);
      this.addScore(points);
      this.lines += res.count;

      // Sprint mode: kolla om vi vann
      if (this.gameMode === 'sprint' && this.lines >= this.sprintLines) {
        this.lines = this.sprintLines; // Cap at 40
        this.gameWon = true;
        this.endGame();
        return;
      }

      // Score popup
      const L = this.renderer.layout;
      const popupX = L.boardX + L.boardWidth / 2;
      const popupY = L.boardY + (res.rows[0]) * L.cellSize;
      let popupColor = "#45d9c8";
      if (tSpin) popupColor = "#a78bda";
      else if (isTetris) popupColor = "#f5d63d";
      this.renderer.triggerScorePopup(points, popupX, popupY, popupColor);

      // Ljud
      if (tSpin || isTetris) {
        this.audio.play("tetris");
      } else {
        this.audio.play("clear");
      }

      this.updateLevel();
      
      // Trigga visuella effekter
      this.renderer.triggerClearAnimation(res.rows, isTetris);
      
    } else {
      // Ingen rad rensad - bryt combo
      this.combo = 0;
      
      // T-spin utan rader ger fortfarande poäng
      if (tSpin) {
        if (tSpin === 'full') this.stats.tSpins++;
        else this.stats.tSpinMinis++;
        
        const points = getLineScore(0, this.level, tSpin, 0);
        this.addScore(points);
        message = tSpin === 'full' ? 'T-SPIN' : 'MINI T-SPIN';
        this.renderer.triggerTSpinEffect();
        
        // Score popup för T-spin utan rader
        const L = this.renderer.layout;
        const popupX = L.boardX + L.boardWidth / 2;
        const popupY = L.boardY + this.activePiece.row * L.cellSize;
        this.renderer.triggerScorePopup(points, popupX, popupY, "#a78bda");
      }
    }
    
    // Visa meddelande
    if (message) {
      this.lastClearType = message;
      this.clearMessageTimer = 1500;
    }
  }

  updateLevel() {
    const newLevel = Math.floor(this.lines / 10);
    if (newLevel !== this.level) {
      this.level = newLevel;
      const idx = Math.min(this.level, GRAVITY_TABLE.length - 1);
      this.gravityInterval = GRAVITY_TABLE[idx];
      this.audio.play("levelup");
      
      // Trigga level up effekt
      this.renderer.triggerLevelUp(this.level);
    }
  }

  addScore(points) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("pulse_tetris_highscore", this.highScore);
    }
  }

  // ----- Kontroller (Input kallar dessa) -----
  moveLeft() {
    if (this.gameOver || !this.activePiece) return;
    if (this.grid.canMove(this.activePiece, -1, 0)) {
      this.activePiece.col--;
      this.lastAction = 'move';
      this.resetLockDelay();
      this.audio.play("rotate");
    }
  }

  moveRight() {
    if (this.gameOver || !this.activePiece) return;
    if (this.grid.canMove(this.activePiece, 1, 0)) {
      this.activePiece.col++;
      this.lastAction = 'move';
      this.resetLockDelay();
      this.audio.play("rotate");
    }
  }

  rotateCW() {
    if (this.gameOver || !this.activePiece) return;
    const result = this.activePiece.tryRotateCW(this.grid);
    if (result) {
      this.lastAction = 'rotate';
      this.lastKick = result.wasKick || false;
      this.resetLockDelay();
      this.audio.play("rotate");
    }
  }

  rotateCCW() {
    if (this.gameOver || !this.activePiece) return;
    const result = this.activePiece.tryRotateCCW(this.grid);
    if (result) {
      this.lastAction = 'rotate';
      this.lastKick = result.wasKick || false;
      this.resetLockDelay();
      this.audio.play("rotate");
    }
  }
  
  // Reset lock delay när spelaren gör ett drag (max antal resets)
  resetLockDelay() {
    if (this.pieceOnGround && this.lockDelayResets < this.lockDelayMaxResets) {
      this.lockDelayTimer = 0;
      this.lockDelayResets++;
    }
  }

  softDrop() {
    if (this.gameOver || !this.activePiece) return;
    if (this.grid.canMove(this.activePiece, 0, 1)) {
      this.activePiece.row++;
      this.lastAction = 'drop';
      this.addScore(1);
      this.audio.play("soft");
    } else {
      this.lockPieceAndHandleLines();
      this.spawnNewPiece();
    }
  }

  hardDrop() {
    if (this.gameOver || !this.activePiece) return;
    this.stats.hardDrops++;
    const startRow = this.activePiece.row;
    
    let dropped = 0;
    while (this.grid.canMove(this.activePiece, 0, 1)) {
      this.activePiece.row++;
      dropped++;
    }
    if (dropped > 0) {
      this.lastAction = 'drop';
      this.addScore(dropped * 2);
      this.audio.play("hard");
      
      // Trigga speed lines om vi droppade tillräckligt långt
      if (dropped >= 3) {
        this.renderer.triggerSpeedLines(this.activePiece, startRow, this.activePiece.row);
      }
    }
    this.lockPieceAndHandleLines();
    this.spawnNewPiece();
  }

  getStats() {
    return this.stats;
  }
}

// BOOT - Skapa spelet men starta INTE
const canvas = document.getElementById("gameCanvas");
const game = new Game(canvas);
window.PULSE_TETRIS = game;