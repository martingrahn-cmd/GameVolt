// src/js/grid.js
import { CONFIG, GLOWS } from './config.js';

const BOARD_THEMES = {
  jungle: { slabTop:"rgba(53,62,42,.98)", slabMid:"rgba(24,32,24,.98)", slabBottom:"rgba(9,15,12,.99)", well:"rgba(4,11,7,.76)", grid:"rgba(204,224,173,.055)", rim:"rgba(238,196,86,.42)", accent:"rgba(255,220,125,.7)", targetTop:"rgba(133,158,107,.25)", targetBottom:"rgba(6,13,9,.38)", targetEdge:"rgba(218,187,104,.3)", targetDot:"rgba(235,216,157,.25)" },
  frozen: { slabTop:"rgba(61,86,101,.98)", slabMid:"rgba(24,43,56,.98)", slabBottom:"rgba(7,18,28,.99)", well:"rgba(4,15,24,.78)", grid:"rgba(186,231,255,.075)", rim:"rgba(151,224,255,.5)", accent:"rgba(214,247,255,.78)", targetTop:"rgba(162,224,245,.24)", targetBottom:"rgba(8,28,42,.42)", targetEdge:"rgba(156,226,255,.38)", targetDot:"rgba(225,249,255,.34)" },
  inferno: { slabTop:"rgba(84,48,34,.98)", slabMid:"rgba(45,23,20,.98)", slabBottom:"rgba(18,8,9,.99)", well:"rgba(20,6,7,.8)", grid:"rgba(255,174,110,.065)", rim:"rgba(255,132,65,.48)", accent:"rgba(255,194,92,.78)", targetTop:"rgba(170,74,39,.24)", targetBottom:"rgba(31,7,8,.44)", targetEdge:"rgba(255,129,64,.36)", targetDot:"rgba(255,192,105,.34)" },
  neon: { slabTop:"rgba(34,43,73,.98)", slabMid:"rgba(16,21,46,.98)", slabBottom:"rgba(4,7,21,.99)", well:"rgba(2,5,18,.82)", grid:"rgba(62,221,255,.075)", rim:"rgba(76,226,255,.52)", accent:"rgba(203,91,255,.8)", targetTop:"rgba(38,133,170,.22)", targetBottom:"rgba(6,9,32,.46)", targetEdge:"rgba(66,226,255,.4)", targetDot:"rgba(224,101,255,.38)" },
  zen: { slabTop:"rgba(53,68,64,.98)", slabMid:"rgba(24,39,37,.98)", slabBottom:"rgba(8,18,18,.99)", well:"rgba(4,14,14,.78)", grid:"rgba(188,232,218,.055)", rim:"rgba(116,210,187,.42)", accent:"rgba(203,239,214,.7)", targetTop:"rgba(112,171,151,.22)", targetBottom:"rgba(7,24,22,.4)", targetEdge:"rgba(139,213,190,.32)", targetDot:"rgba(217,241,219,.3)" }
};

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
    this.hoverValid = true;
    this.fitPulse = null;
    this.theme = 'jungle';
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

  setTheme(theme) { this.theme = BOARD_THEMES[theme] ? theme : 'jungle'; }
  getThemeStyle() { return BOARD_THEMES[this.theme] || BOARD_THEMES.jungle; }

  drawWorldDetails(ctx, ox, oy, w, h, accent) {
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = .52;
    if (this.theme === 'jungle' || this.theme === 'zen') {
      ctx.beginPath();
      ctx.moveTo(ox - 5, oy + h * .18);
      ctx.bezierCurveTo(ox + 12, oy + h * .27, ox - 12, oy + h * .4, ox + 7, oy + h * .5);
      ctx.stroke();
      [[-1,.23,1], [5,.35,-1], [0,.46,1]].forEach(([dx, fy, side]) => {
        ctx.beginPath(); ctx.ellipse(ox + dx + side * 4, oy + h * fy, 4, 2, side * .55, 0, Math.PI * 2); ctx.fill();
      });
    } else if (this.theme === 'frozen') {
      [0, 1].forEach(side => {
        const x = side ? ox + w + 5 : ox - 5, dir = side ? -1 : 1;
        ctx.beginPath(); ctx.moveTo(x, oy + 12); ctx.lineTo(x + dir * 8, oy + 24); ctx.lineTo(x + dir * 2, oy + 31); ctx.lineTo(x + dir * 10, oy + 43); ctx.stroke();
      });
    } else if (this.theme === 'inferno') {
      ctx.beginPath();
      ctx.moveTo(ox + w * .2, oy + h + 6); ctx.lineTo(ox + w * .25, oy + h - 4); ctx.lineTo(ox + w * .3, oy + h + 5);
      ctx.moveTo(ox + w * .72, oy - 6); ctx.lineTo(ox + w * .68, oy + 5); ctx.lineTo(ox + w * .76, oy + 10);
      ctx.stroke();
    } else if (this.theme === 'neon') {
      [[ox - 6, oy + h * .25, 1], [ox + w + 6, oy + h * .68, -1]].forEach(([x,y,dir]) => {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dir * 9, y); ctx.lineTo(x + dir * 9, y + 11); ctx.lineTo(x + dir * 16, y + 11); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + dir * 16, y + 11, 2, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.restore();
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

  setHoverCells(cells, valid = true) {
    this.hoverCells = (cells && Array.isArray(cells)) ? [...cells] : [];
    this.hoverValid = !!valid;
  }

  triggerFit(cells, color) {
    this.fitPulse = { cells: Array.isArray(cells) ? [...cells] : [], color: color || "#FFD76A", life: 1 };
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
    const theme = this.getThemeStyle();

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.85)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    const slab = ctx.createLinearGradient(ox, oy, ox, oy + h);
    slab.addColorStop(0, theme.slabTop);
    slab.addColorStop(.45, theme.slabMid);
    slab.addColorStop(1, theme.slabBottom);
    ctx.fillStyle = slab;
    ctx.fillRect(ox - 7, oy - 7, w + 14, h + 14);
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = theme.rim;
    ctx.lineWidth = 2;
    ctx.strokeRect(ox - 6, oy - 6, w + 12, h + 12);
    ctx.strokeStyle = "rgba(8,12,9,.9)";
    ctx.lineWidth = 3;
    ctx.strokeRect(ox - 2, oy - 2, w + 4, h + 4);
    ctx.fillStyle = theme.well; ctx.fillRect(ox, oy, w, h);
    ctx.strokeStyle = theme.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= this.cols; c++) { ctx.moveTo(ox + c * this.pitch, oy); ctx.lineTo(ox + c * this.pitch, oy + h); }
    for (let r = 0; r <= this.rows; r++) { ctx.moveTo(ox, oy + r * this.pitch); ctx.lineTo(ox + w, oy + r * this.pitch); }
    ctx.stroke();

    if (this.hoverCells.length > 0) {
      ctx.save();
      const validColor = this.ghostColor === "transparent" ? "rgba(120,255,189,1)" : this.ghostColor;
      const ghostColor = this.hoverValid ? validColor : "rgba(255,82,82,1)";
      ctx.strokeStyle = ghostColor;
      ctx.fillStyle = ghostColor;
      ctx.shadowColor = ghostColor;
      ctx.shadowBlur = this.hoverValid ? 14 : 8;
      ctx.lineWidth = this.hoverValid ? 2.5 : 2;
      ctx.setLineDash(this.hoverValid ? [7, 4] : [3, 4]);
      ctx.lineDashOffset = -this.pulseTimer * 10; 

      for (const { col, row } of this.hoverCells) {
        if (col >= 0 && row >= 0 && col < this.cols && row < this.rows) {
            const x = ox + col * this.pitch;
            const y = oy + row * this.pitch;
            const s = this.cell;
            ctx.globalAlpha = (this.hoverValid ? .16 : .12) + pulse * .1;
            ctx.fillRect(x + 3, y + 3, s - 6, s - 6);
            ctx.globalAlpha = .65 + pulse * .25;
            ctx.strokeRect(x + 3, y + 3, s - 6, s - 6);
        }
      }
      ctx.restore();
    }

    if (this.fitPulse && this.fitPulse.life > 0) {
      const fit = this.fitPulse;
      fit.life = Math.max(0, fit.life - .055);
      fit.cells.forEach(({ col, row }, index) => {
        if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return;
        const delay = index * .08;
        const localLife = Math.max(0, Math.min(1, fit.life + delay));
        const progress = 1 - localLife;
        const inset = 3 + progress * this.pitch * .18;
        ctx.save();
        ctx.globalAlpha = localLife * .75;
        ctx.strokeStyle = index % 2 === 0 ? "#FFF0B5" : fit.color;
        ctx.shadowColor = fit.color;
        ctx.shadowBlur = 16 * localLife;
        ctx.lineWidth = 1 + localLife * 2;
        ctx.strokeRect(
          ox + col * this.pitch + inset,
          oy + row * this.pitch + inset,
          this.pitch - inset * 2,
          this.pitch - inset * 2
        );
        ctx.restore();
      });
      if (fit.life <= 0) this.fitPulse = null;
    }

    ctx.shadowColor = theme.rim; ctx.shadowBlur = 12;
    ctx.strokeStyle = theme.rim; ctx.lineWidth = 1.5;
    ctx.strokeRect(ox, oy, w, h);
    ctx.shadowBlur = 5;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    const mark = Math.min(12, this.pitch * .45);
    [[ox,oy,1,1],[ox+w,oy,-1,1],[ox,oy+h,1,-1],[ox+w,oy+h,-1,-1]].forEach(([x,y,sx,sy]) => {
      ctx.beginPath();
      ctx.moveTo(x + sx * 3, y + sy * mark);
      ctx.lineTo(x + sx * 3, y + sy * 3);
      ctx.lineTo(x + sx * mark, y + sy * 3);
      ctx.stroke();
    });
    this.drawWorldDetails(ctx, ox, oy, w, h, theme.accent);
    ctx.restore();
  }
}
