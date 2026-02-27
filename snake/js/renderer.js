console.log(">>> LOADED RENDERER v5.3 (smooth spline ribbon)");

import { Background } from "./background.js";

export class Renderer {
  constructor(canvas, grid) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.grid = grid;   // grid.w == grid.h
    this.size = grid.w;

    this.square = 0;
    this.cell = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    
    // Jeff Minter-style background effects
    this.background = new Background();
    this.backgroundEnabled = true;
  }

  // ============================================================
  // RESIZE – kvadratisk spelplan, centrerad, DPI-korrekt
  // ============================================================
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Always use current grid size
    this.size = this.grid.w;

    const SAFE_SCALE = 0.92;
    this.square = Math.min(vw, vh) * SAFE_SCALE;
    this.cell = this.square / this.size;

    this.canvas.width  = vw * dpr;
    this.canvas.height = vh * dpr;

    this.canvas.style.width  = vw + "px";
    this.canvas.style.height = vh + "px";

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    this.offsetX = (vw - this.square) / 2;
    this.offsetY = (vh - this.square) / 2;
    ctx.translate(this.offsetX, this.offsetY);
    
    console.log(`[RENDERER] resize: grid=${this.size}, cell=${this.cell.toFixed(2)}`);
  }

  // ============================================================
  // BAKGRUND – neon gradient
  // ============================================================
  drawBackground() {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(
      this.square / 2, this.square / 2, 0,
      this.square / 2, this.square / 2, this.square * 0.82
    );

    g.addColorStop(0.00, "#4a0078");
    g.addColorStop(0.45, "#25003e");
    g.addColorStop(1.00, "#0d0013");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.square, this.square);
  }

  // ============================================================
  // GRID – neon rutnät + ram
  // ============================================================
  drawGrid() {
    const ctx = this.ctx;

    ctx.strokeStyle = "rgba(255, 20, 150, 0.05)";
    ctx.lineWidth = 0.8;

    for (let x = 0; x <= this.size; x++) {
      const px = x * this.cell;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, this.square);
      ctx.stroke();
    }

    for (let y = 0; y <= this.size; y++) {
      const py = y * this.cell;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(this.square, py);
      ctx.stroke();
    }

    ctx.shadowColor = "rgba(255, 0, 180, 0.7)";
    ctx.shadowBlur  = this.cell * 1.6;
    ctx.strokeStyle = "#ff1dac";
    ctx.lineWidth   = this.cell * 0.08;
    ctx.strokeRect(0, 0, this.square, this.square);
    ctx.shadowBlur = 0;
  }

  // ============================================================
  // SNAKE — slät spline med rundt huvud + avsmalnande svans
  // ============================================================
  drawSnake(snake) {
    const ctx = this.ctx;

    // Ta smoothede spline-punkter
    const pts = snake.getSmoothPoints(4);  // 4 = lagom, bra prestanda
    if (!pts || pts.length < 2) return;

    const n = pts.length;

    ctx.save();
    ctx.shadowColor = "rgba(0, 255, 240, 0.5)";
    ctx.shadowBlur  = this.cell * 0.5;

    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const t = i / (n - 1); // 0 = head, 1 = tail

      // Störst vid huvud, smalnar av mot svansen
      const radius = this.cell * (0.6 - 0.35 * t); // ~0.6 → ~0.25 cell
      if (radius <= 0) continue;

      // Head stark, tail svagare
      const alpha = 0.95 - 0.7 * t; // 0.95 → 0.25
      ctx.fillStyle = `rgba(0,255,240,${alpha.toFixed(3)})`;

      ctx.beginPath();
      ctx.arc(p.x * this.cell, p.y * this.cell, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ============================================================
  // FOOD — neon square
  // ============================================================
  drawFood(food) {
    const ctx = this.ctx;
    ctx.shadowColor = "rgba(255, 0, 140, 0.55)";
    ctx.shadowBlur  = this.cell * 0.7;
    ctx.fillStyle   = "#ff0077";

    const px = (food.x + 0.5) * this.cell;
    const py = (food.y + 0.5) * this.cell;
    const s  = this.cell;

    ctx.fillRect(px - s / 2, py - s / 2, s, s);
    ctx.shadowBlur = 0;
  }

  // ============================================================
  // RENDER
  // ============================================================
  render(game, dt = 1/60) {
    const ctx = this.ctx;

    ctx.clearRect(
      -this.offsetX,
      -this.offsetY,
      this.canvas.width,
      this.canvas.height
    );

    // Update and draw psychedelic background (behind everything)
    if (this.backgroundEnabled && this.background) {
      this.background.update(dt);
      this.background.render(ctx, this.square);
    } else {
      // Fallback to static background
      this.drawBackground();
    }
    
    this.drawGrid();
    this.drawWalls(game.level?.walls || []);
    this.drawFood(game.food);
    this.drawSnake(game.snake);
    
    // Draw HUD inside game area
    if (game.hud && game.hud.renderInGame) {
      game.hud.renderInGame(ctx, this.cell, this.size, this.size);
    }
  }

  // ============================================================
  // WALLS — neon blocks
  // ============================================================
  drawWalls(walls) {
    if (!walls || walls.length === 0) return;
    
    const ctx = this.ctx;
    
    ctx.shadowColor = "rgba(255, 0, 100, 0.6)";
    ctx.shadowBlur = this.cell * 0.5;
    ctx.fillStyle = "#ff0066";
    
    for (const wall of walls) {
      const px = wall.x * this.cell;
      const py = wall.y * this.cell;
      const pw = wall.w * this.cell;
      const ph = wall.h * this.cell;
      
      ctx.fillRect(px, py, pw, ph);
    }
    
    ctx.shadowBlur = 0;
  }
  
  // Toggle background effects
  toggleBackground() {
    this.backgroundEnabled = !this.backgroundEnabled;
    return this.backgroundEnabled;
  }
  
  // Switch to next background effect
  nextBackgroundEffect() {
    if (this.background) {
      this.background.nextEffect();
      return this.background.getEffectName();
    }
    return null;
  }
}