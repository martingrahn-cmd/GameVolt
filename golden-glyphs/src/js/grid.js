// src/js/grid.js
import { CONFIG, GLOWS } from './config.js';

export class Grid {
  constructor(ctx, cols, rows) {
    this.ctx = ctx;
    this.cols = cols || CONFIG.COLS || 11;
    this.rows = rows || CONFIG.ROWS || 11;
    this.cell = 0;
    this.pitch = 0;
    this.originX = 0;
    this.originY = 0;
    this.hoverCells = []; 
    this.ghostColor = "rgba(0, 255, 255, 1.0)"; 
    this.pulseTimer = 0;
  }

  setGlow(glowId) {
      const glow = GLOWS[glowId];
      if (!glow || glowId === 'glow_none') {
          this.ghostColor = "rgba(0, 255, 255, 1.0)";
      } else {
          this.ghostColor = glow.color;
      }
  }

  resize() {
    const canvas = this.ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    
    const topZone = Math.max(120, h * 0.18); 
    const bottomZone = Math.max(150, h * 0.30); 
    
    const availableHeight = h - topZone - bottomZone;
    const availableWidth = w - 20; 

    const cellW = Math.floor(availableWidth / this.cols);
    const cellH = Math.floor(availableHeight / this.rows);

    this.cell = Math.min(cellW, cellH);
    this.pitch = this.cell; 

    this.originX = Math.floor((w - (this.cols * this.pitch)) / 2);
    const gridPixelHeight = this.rows * this.pitch;
    this.originY = Math.floor(topZone + (availableHeight - gridPixelHeight) / 2);
  }

  setHoverCells(cells) {
    this.hoverCells = (cells && Array.isArray(cells)) ? [...cells] : [];
  }

  // Ritar en hint (gyllene spöke)
  drawActiveHint(hintData, shape) {
      if (!hintData || !shape) return;
      const { col, row } = hintData;
      const ox = this.originX;
      const oy = this.originY;
      const s = this.cell;

      this.ctx.save();
      const pulse = (Math.sin(this.pulseTimer * 3) + 1) / 2; 
      const alpha = 0.4 + (pulse * 0.4);
      
      this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`; 
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha + 0.2})`; 
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = "#FFD700"; this.ctx.shadowBlur = 20;

      shape.forEach(([dx, dy]) => {
          const cx = col + dx;
          const cy = row + dy;
          if (cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows) {
              const x = ox + cx * this.pitch;
              const y = oy + cy * this.pitch;
              this.ctx.fillRect(x+2, y+2, s-4, s-4);
              this.ctx.strokeRect(x+2, y+2, s-4, s-4);
          }
      });
      this.ctx.restore();
  }

  draw(ctx) {
    this.pulseTimer += 0.05;
    const pulse = (Math.sin(this.pulseTimer) + 1) / 2; 

    const ox = this.originX;
    const oy = this.originY;
    const w = this.cols * this.pitch;
    const h = this.rows * this.pitch;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; ctx.fillRect(ox, oy, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= this.cols; c++) { ctx.moveTo(ox + c * this.pitch, oy); ctx.lineTo(ox + c * this.pitch, oy + h); }
    for (let r = 0; r <= this.rows; r++) { ctx.moveTo(ox, oy + r * this.pitch); ctx.lineTo(ox + w, oy + r * this.pitch); }
    ctx.stroke();

    if (this.hoverCells.length > 0) {
      ctx.save();
      ctx.strokeStyle = this.ghostColor;
      ctx.fillStyle = this.ghostColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]); 
      ctx.lineDashOffset = -this.pulseTimer * 10; 

      for (const { col, row } of this.hoverCells) {
        if (col >= 0 && row >= 0 && col < this.cols && row < this.rows) {
            const x = ox + col * this.pitch;
            const y = oy + row * this.pitch;
            const s = this.cell;
            ctx.globalAlpha = 0.15 + (pulse * 0.1); 
            ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
            ctx.globalAlpha = 0.6 + (pulse * 0.2);
            ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
        }
      }
      ctx.restore();
    }

    ctx.shadowColor = "#00ffff"; ctx.shadowBlur = 10; 
    ctx.strokeStyle = "rgba(0, 255, 255, 0.5)"; ctx.lineWidth = 2; 
    ctx.strokeRect(ox, oy, w, h);
    ctx.restore();
  }
}