console.log("RENDERER SAFE 1.0 LOADED");

import { CONFIG } from "./config.js";

// Polyfill för roundRect (saknas i äldre iOS Safari)
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
    if (typeof radii === 'undefined') {
      radii = 0;
    }
    if (typeof radii === 'number') {
      radii = [radii, radii, radii, radii];
    } else if (Array.isArray(radii)) {
      if (radii.length === 1) radii = [radii[0], radii[0], radii[0], radii[0]];
      else if (radii.length === 2) radii = [radii[0], radii[1], radii[0], radii[1]];
      else if (radii.length === 3) radii = [radii[0], radii[1], radii[2], radii[1]];
      else if (radii.length === 4) radii = [radii[0], radii[1], radii[2], radii[3]];
    }
    
    const [tl, tr, br, bl] = radii.map(r => Math.min(r, w / 2, h / 2));
    
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    
    return this;
  };
}

// Bakgrundspartikel - långsam, subtil
class BackgroundParticle {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.reset(true);
  }
  
  reset(initial = false) {
    this.x = Math.random() * this.canvasWidth;
    this.y = initial ? Math.random() * this.canvasHeight : this.canvasHeight + 20;
    this.size = 2 + Math.random() * 4;
    this.speedY = -0.2 - Math.random() * 0.5;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.alpha = 0.1 + Math.random() * 0.2;
    this.pulse = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.02 + Math.random() * 0.02;
  }
  
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.pulse += this.pulseSpeed;
    
    // Återställ om utanför skärmen
    if (this.y < -20) {
      this.reset();
    }
  }
  
  draw(ctx) {
    const pulsedAlpha = this.alpha * (0.7 + 0.3 * Math.sin(this.pulse));
    ctx.save();
    ctx.globalAlpha = pulsedAlpha;
    ctx.fillStyle = "#45d9c8";
    ctx.shadowColor = "#45d9c8";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Speed line för hard drop
class SpeedLine {
  constructor(x, startY, endY, color) {
    this.x = x;
    this.startY = startY;
    this.endY = endY;
    this.color = color;
    this.life = 1.0;
    this.decay = 0.08;
    this.width = 2 + Math.random() * 2;
    // Liten variation i x
    this.offsetX = (Math.random() - 0.5) * 6;
  }
  
  update() {
    this.life -= this.decay;
    // Linjen "krymper" uppåt
    this.startY += (this.endY - this.startY) * 0.15;
  }
  
  draw(ctx) {
    if (this.life <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.life * 0.7;
    
    // Gradient från färg till transparent
    const gradient = ctx.createLinearGradient(
      this.x + this.offsetX, this.startY,
      this.x + this.offsetX, this.endY
    );
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.3, this.color);
    gradient.addColorStop(0.7, this.color);
    gradient.addColorStop(1, "transparent");
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = this.width * this.life;
    ctx.lineCap = "round";
    
    ctx.beginPath();
    ctx.moveTo(this.x + this.offsetX, this.startY);
    ctx.lineTo(this.x + this.offsetX, this.endY);
    ctx.stroke();
    
    ctx.restore();
  }
  
  isDead() {
    return this.life <= 0;
  }
}

// Partikelklass
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    
    // Slumpad riktning och hastighet
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 3; // Lite uppåt-bias
    
    this.gravity = 0.3;
    this.life = 1.0;
    this.decay = 0.02 + Math.random() * 0.02;
    this.size = 4 + Math.random() * 6;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.3;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.98; // Lite friktion
    this.life -= this.decay;
    this.rotation += this.rotationSpeed;
  }
  
  draw(ctx) {
    if (this.life <= 0) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.life;
    
    // Rita som liten fyrkant (block-bit)
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    const s = this.size * this.life;
    ctx.fillRect(-s/2, -s/2, s, s);
    
    ctx.restore();
  }
}

// Exploderande block
class ExplodingBlock {
  constructor(x, y, size, color) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.scale = 1.0;
    this.alpha = 1.0;
    this.phase = 'expand'; // 'expand' -> 'pop'
    this.expandSpeed = 0.15;
    this.maxScale = 1.3;
  }
  
  update() {
    if (this.phase === 'expand') {
      this.scale += this.expandSpeed;
      if (this.scale >= this.maxScale) {
        this.phase = 'pop';
      }
    } else {
      this.scale += 0.1;
      this.alpha -= 0.15;
    }
  }
  
  draw(ctx) {
    if (this.alpha <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    const s = this.size * this.scale;
    const offset = (s - this.size) / 2;
    
    // Glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20 * this.scale;
    
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(this.x - offset, this.y - offset, s, s, 4);
    ctx.fill();
    
    // Vit flash i mitten
    if (this.phase === 'expand') {
      ctx.fillStyle = `rgba(255,255,255,${0.5 * this.alpha})`;
      ctx.beginPath();
      ctx.roundRect(this.x - offset + s*0.2, this.y - offset + s*0.2, s*0.6, s*0.6, 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  isDead() {
    return this.alpha <= 0;
  }
}

// Score popup
class ScorePopup {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 1.0;
    this.vy = -2;
  }
  
  update() {
    this.y += this.vy;
    this.vy *= 0.95;
    this.life -= 0.02;
  }
  
  draw(ctx, font) {
    if (this.life <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
  
  isDead() {
    return this.life <= 0;
  }
}

// Ring-pulse effekt
class RingPulse {
  constructor(x, y, color, maxRadius) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = 0;
    this.maxRadius = maxRadius;
    this.alpha = 0.8;
    this.speed = maxRadius / 15;
  }
  
  update() {
    this.radius += this.speed;
    this.alpha = 0.8 * (1 - this.radius / this.maxRadius);
  }
  
  draw(ctx) {
    if (this.alpha <= 0) return;
    
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = this.alpha;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }
  
  isDead() {
    return this.radius >= this.maxRadius;
  }
}

export class Renderer {
  constructor(canvas, grid, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.grid = grid;
    this.game = game;
    this.layout = null;

    // Effektsystem
    this.particles = [];
    this.explodingBlocks = [];
    this.ringPulses = [];
    this.scorePopups = [];
    this.speedLines = [];
    
    // Land-effekt
    this.landingBlocks = [];
    
    // Bakgrundspartiklar
    this.bgParticles = [];
    
    // Next piece animation
    this.nextPieceAnim = {
      active: false,
      progress: 1, // 0 = start, 1 = done
      lastPieceType: null
    };
    
    // Level up effekt
    this.levelUpAnim = {
      active: false,
      progress: 0,
      level: 0
    };
    
    // Screen flash
    this.flashAlpha = 0;
    this.flashColor = "#ffffff";
  }
  
  initBackgroundParticles() {
    this.bgParticles = [];
    const count = 30;
    for (let i = 0; i < count; i++) {
      this.bgParticles.push(new BackgroundParticle(this.canvas.width, this.canvas.height));
    }
  }
  
  // Trigga next piece animation
  triggerNextPieceAnim(pieceType) {
    if (this.nextPieceAnim.lastPieceType !== pieceType) {
      this.nextPieceAnim.active = true;
      this.nextPieceAnim.progress = 0;
      this.nextPieceAnim.lastPieceType = pieceType;
    }
  }
  
  // Trigga level up effekt
  triggerLevelUp(level) {
    this.levelUpAnim.active = true;
    this.levelUpAnim.progress = 0;
    this.levelUpAnim.level = level;
    
    // Flash
    this.flashAlpha = 0.4;
    this.flashColor = "#45d9c8";
    
    // Partiklar från mitten av brädet
    const L = this.layout;
    if (L) {
      const centerX = L.boardX + L.boardWidth / 2;
      const centerY = L.boardY + L.boardHeight / 2;
      
      // Skapa partiklar i en cirkel
      for (let i = 0; i < 30; i++) {
        const angle = (i / 30) * Math.PI * 2;
        const speed = 4 + Math.random() * 4;
        const p = new Particle(centerX, centerY, "#45d9c8");
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.gravity = 0;
        p.size = 6 + Math.random() * 6;
        p.decay = 0.025;
        this.particles.push(p);
      }
      
      // Ring pulse
      this.ringPulses.push(new RingPulse(centerX, centerY, "#45d9c8", L.boardWidth * 0.8));
    }
  }

  setLayout(layout) {
    this.layout = layout;
  }

  // Trigga line clear effekt
  triggerClearAnimation(rows, isTetris = false) {
    const L = this.layout;
    const cellSize = L.cellSize;
    
    // Hämta sparade celler från game
    const clearedCells = this.game.clearedCells || {};
    
    for (const row of rows) {
      for (let c = 0; c < this.grid.cols; c++) {
        const cell = clearedCells[row]?.[c];
        const color = cell?.color || CONFIG.COLORS.pieceI;
        
        const x = L.boardX + c * cellSize;
        const y = L.boardY + row * cellSize;
        
        // Exploderande block
        this.explodingBlocks.push(new ExplodingBlock(x, y, cellSize, color));
        
        // Partiklar från varje block
        const particleCount = isTetris ? 8 : 4;
        for (let i = 0; i < particleCount; i++) {
          this.particles.push(new Particle(
            x + cellSize/2,
            y + cellSize/2,
            color
          ));
        }
      }
    }
    
    // Ring pulse från mitten
    const centerX = L.boardX + L.boardWidth / 2;
    const centerY = L.boardY + (rows[Math.floor(rows.length/2)]) * cellSize + cellSize/2;
    
    if (isTetris) {
      // TETRIS! Flera ringar och stor flash
      this.ringPulses.push(new RingPulse(centerX, centerY, "#45d9c8", L.boardWidth * 0.8));
      this.ringPulses.push(new RingPulse(centerX, centerY, "#ffffff", L.boardWidth * 0.6));
      this.flashAlpha = 0.4;
      this.flashColor = "#45d9c8";
    } else if (rows.length >= 2) {
      // Double/Triple
      this.ringPulses.push(new RingPulse(centerX, centerY, "#45d9c8", L.boardWidth * 0.5));
      this.flashAlpha = 0.2;
      this.flashColor = "#45d9c8";
    }
  }
  
  // Trigga T-spin effekt
  triggerTSpinEffect() {
    const L = this.layout;
    const centerX = L.boardX + L.boardWidth / 2;
    const centerY = L.boardY + L.boardHeight / 2;
    
    this.ringPulses.push(new RingPulse(centerX, centerY, "#a78bda", L.boardWidth * 0.7));
    this.flashAlpha = 0.3;
    this.flashColor = "#a78bda";
    
    // Extra partiklar i lila
    for (let i = 0; i < 20; i++) {
      this.particles.push(new Particle(
        centerX + (Math.random() - 0.5) * L.boardWidth * 0.5,
        centerY + (Math.random() - 0.5) * L.boardHeight * 0.3,
        "#a78bda"
      ));
    }
  }
  
  // Score popup
  triggerScorePopup(points, x, y, color = "#45d9c8") {
    const text = `+${points.toLocaleString()}`;
    this.scorePopups.push(new ScorePopup(x, y, text, color));
  }
  
  // Land-effekt när pjäs låser sig
  triggerLandEffect(piece) {
    const L = this.layout;
    const cellSize = L.cellSize;
    const m = piece.matrix;
    
    // Hitta alla block i pjäsen och skapa partiklar
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!m[r][c]) continue;
        
        const x = L.boardX + (piece.col + c) * cellSize + cellSize / 2;
        const y = L.boardY + (piece.row + r) * cellSize + cellSize;
        
        // Partiklar som sprider sig åt sidorna
        for (let i = 0; i < 5; i++) {
          const p = new Particle(x, y, piece.color);
          p.vy = -2 - Math.random() * 3;
          p.vx = (Math.random() - 0.5) * 6;
          p.size = 4 + Math.random() * 4;
          p.decay = 0.03;
          p.gravity = 0.2;
          this.particles.push(p);
        }
      }
    }
    
    // Liten flash
    this.flashAlpha = 0.1;
    this.flashColor = piece.color;
  }

  // Speed lines vid hard drop
  triggerSpeedLines(piece, startRow, endRow) {
    const L = this.layout;
    const cellSize = L.cellSize;
    const m = piece.matrix;
    
    // Hitta alla kolumner som pjäsen täcker
    for (let c = 0; c < 4; c++) {
      let hasBlock = false;
      for (let r = 0; r < 4; r++) {
        if (m[r][c]) {
          hasBlock = true;
          break;
        }
      }
      
      if (hasBlock) {
        const x = L.boardX + (piece.col + c) * cellSize + cellSize / 2;
        const startY = L.boardY + startRow * cellSize;
        const endY = L.boardY + endRow * cellSize;
        
        // Skapa 2-3 linjer per kolumn
        const lineCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < lineCount; i++) {
          this.speedLines.push(new SpeedLine(x, startY, endY, piece.color));
        }
      }
    }
  }
  
  updateEffects() {
    // Uppdatera partiklar
    this.particles = this.particles.filter(p => {
      p.update();
      return p.life > 0;
    });
    
    // Uppdatera exploderande block
    this.explodingBlocks = this.explodingBlocks.filter(b => {
      b.update();
      return !b.isDead();
    });
    
    // Uppdatera ring pulses
    this.ringPulses = this.ringPulses.filter(r => {
      r.update();
      return !r.isDead();
    });
    
    // Uppdatera score popups
    this.scorePopups = this.scorePopups.filter(s => {
      s.update();
      return !s.isDead();
    });
    
    // Uppdatera speed lines
    this.speedLines = this.speedLines.filter(l => {
      l.update();
      return !l.isDead();
    });
    
    // Uppdatera next piece animation
    if (this.nextPieceAnim.active) {
      this.nextPieceAnim.progress += 0.08;
      if (this.nextPieceAnim.progress >= 1) {
        this.nextPieceAnim.progress = 1;
        this.nextPieceAnim.active = false;
      }
    }
    
    // Uppdatera level up animation
    if (this.levelUpAnim.active) {
      this.levelUpAnim.progress += 0.02;
      if (this.levelUpAnim.progress >= 1) {
        this.levelUpAnim.active = false;
      }
    }
    
    // Fade flash
    if (this.flashAlpha > 0) {
      this.flashAlpha -= 0.03;
    }
  }
  
  drawEffects() {
    const ctx = this.ctx;
    const L = this.layout;
    
    // Rita speed lines (bakom andra effekter)
    for (const line of this.speedLines) {
      line.draw(ctx);
    }
    
    // Rita exploderande block
    for (const block of this.explodingBlocks) {
      block.draw(ctx);
    }
    
    // Rita partiklar
    for (const particle of this.particles) {
      particle.draw(ctx);
    }
    
    // Rita ring pulses
    for (const ring of this.ringPulses) {
      ring.draw(ctx);
    }
    
    // Rita score popups
    const fontSize = Math.floor(L.cellSize * 0.7);
    const font = `700 ${fontSize}px ${CONFIG.FONT.hudFamily}`;
    for (const popup of this.scorePopups) {
      popup.draw(ctx, font);
    }
    
    // Screen flash
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    }
  }

  drawFrame(ts, activePiece, hud) {
    if (!this.layout) return;
    
    this.updateEffects();
    
    this.drawBackground();
    this.drawOuterFrame();
    this.drawBoard(activePiece, ts);
    this.drawEffects();
    this.drawSidebar(hud, ts);
    this.drawClearMessage(hud);
  }

  drawBackground() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Teal gradient bakgrund
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#1a3a3a");
    g.addColorStop(0.5, "#162f2f");
    g.addColorStop(1, "#1a3a3a");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    
    // Initiera bakgrundspartiklar om de inte finns
    if (this.bgParticles.length === 0) {
      this.initBackgroundParticles();
    }
    
    // Uppdatera och rita bakgrundspartiklar
    for (const p of this.bgParticles) {
      p.update();
      p.draw(ctx);
    }
  }

  drawOuterFrame() {
    // Ingen hård ram - vi låter det vara mjukt och öppet
  }

  drawBoard(activePiece, timestamp = 0) {
    const ctx = this.ctx;
    const L = this.layout;
    const { boardX, boardY, boardWidth, boardHeight, cellSize } = L;
    const radius = 12; // Rundade hörn

    ctx.save();
    
    // Animerad RGB glow runt spelplanen
    const time = timestamp / 1000;
    const hue1 = (time * 30) % 360;
    const hue2 = (hue1 + 60) % 360;
    const hue3 = (hue1 + 120) % 360;
    const hue4 = (hue1 + 180) % 360;
    
    // Skapa gradient som går runt kanten
    const rgbGradient = ctx.createLinearGradient(
      boardX, boardY, 
      boardX + boardWidth, boardY + boardHeight
    );
    rgbGradient.addColorStop(0, `hsla(${hue1}, 80%, 60%, 0.4)`);
    rgbGradient.addColorStop(0.25, `hsla(${hue2}, 80%, 60%, 0.4)`);
    rgbGradient.addColorStop(0.5, `hsla(${hue3}, 80%, 60%, 0.4)`);
    rgbGradient.addColorStop(0.75, `hsla(${hue4}, 80%, 60%, 0.4)`);
    rgbGradient.addColorStop(1, `hsla(${hue1}, 80%, 60%, 0.4)`);
    
    // Rita RGB glow-kant
    ctx.strokeStyle = rgbGradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(boardX - 3, boardY - 3, boardWidth + 6, boardHeight + 6, radius + 3);
    ctx.stroke();
    
    // Yttre mjukare glow
    const outerGradient = ctx.createLinearGradient(
      boardX, boardY, 
      boardX + boardWidth, boardY + boardHeight
    );
    outerGradient.addColorStop(0, `hsla(${hue1}, 80%, 60%, 0.15)`);
    outerGradient.addColorStop(0.5, `hsla(${hue3}, 80%, 60%, 0.15)`);
    outerGradient.addColorStop(1, `hsla(${hue1}, 80%, 60%, 0.15)`);
    
    ctx.strokeStyle = outerGradient;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(boardX - 6, boardY - 6, boardWidth + 12, boardHeight + 12, radius + 6);
    ctx.stroke();

    // Mjuk skugga bakom brädet
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;

    // Rita brädet med rundade hörn
    ctx.fillStyle = CONFIG.COLORS.boardBg;
    ctx.beginPath();
    ctx.roundRect(boardX, boardY, boardWidth, boardHeight, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Mjuk kant
    ctx.strokeStyle = CONFIG.COLORS.boardBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boardX + 1, boardY + 1, boardWidth - 2, boardHeight - 2, radius);
    ctx.stroke();

    // Klippa innehållet till rundade hörn
    ctx.beginPath();
    ctx.roundRect(boardX, boardY, boardWidth, boardHeight, radius);
    ctx.clip();

    // Subtila gridlinjer
    ctx.strokeStyle = CONFIG.COLORS.gridLine;
    ctx.lineWidth = 1;

    for (let c = 1; c < this.grid.cols; c++) {
      const x = boardX + c * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, boardY);
      ctx.lineTo(x, boardY + boardHeight);
      ctx.stroke();
    }

    for (let r = 1; r < this.grid.rows; r++) {
      const y = boardY + r * cellSize;
      ctx.beginPath();
      ctx.moveTo(boardX, y);
      ctx.lineTo(boardX + boardWidth, y);
      ctx.stroke();
    }

    // Låsta celler
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const cell = this.grid.cells[r][c];
        if (!cell) continue;

        this.drawCell(
          boardX + c * cellSize,
          boardY + r * cellSize,
          cellSize,
          cell.color,
          false,
          timestamp,
          c,
          r
        );
      }
    }

    // Ghost piece (skugga var pjäsen landar)
    const ghostEnabled = this.game.options?.ghostEnabled !== false;
    if (activePiece && ghostEnabled) {
      const ghostRow = this.getGhostRow(activePiece);
      if (ghostRow > activePiece.row) {
        const m = activePiece.matrix;
        ctx.globalAlpha = 0.2;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (!m[r][c]) continue;

            const gx = activePiece.col + c;
            const gy = ghostRow + r;
            if (gy < 0) continue;

            this.drawCell(
              boardX + gx * cellSize,
              boardY + gy * cellSize,
              cellSize,
              activePiece.color,
              false
            );
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    // Aktiv pjäs
    if (activePiece) {
      const m = activePiece.matrix;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (!m[r][c]) continue;

          const gx = activePiece.col + c;
          const gy = activePiece.row + r;
          if (gy < 0) continue;

          this.drawCell(
            boardX + gx * cellSize,
            boardY + gy * cellSize,
            cellSize,
            activePiece.color,
            true
          );
        }
      }
    }

    ctx.restore();
  }

  getGhostRow(piece) {
    let testRow = piece.row;
    while (this.canMoveGhost(piece, testRow + 1)) {
      testRow++;
    }
    return testRow;
  }

  canMoveGhost(piece, row) {
    const m = piece.matrix;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!m[r][c]) continue;

        const newCol = piece.col + c;
        const newRow = row + r;

        if (newCol < 0 || newCol >= this.grid.cols) return false;
        if (newRow >= this.grid.rows) return false;
        if (newRow < 0) continue;
        if (this.grid.cells[newRow][newCol]) return false;
      }
    }
    return true;
  }

  drawCell(x, y, size, color, active, timestamp = 0, gridX = 0, gridY = 0) {
    const ctx = this.ctx;
    const inset = 2;
    const w = size - inset * 2;
    const radius = 4; // Rundade hörn på block

    // Mjuk skugga för aktiv pjäs
    if (active) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.15)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
    }

    // Huvudfärg med subtil gradient
    const g = ctx.createLinearGradient(x, y, x, y + w);
    g.addColorStop(0, this.lightenColor(color, 15));
    g.addColorStop(1, color);

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x + inset, y + inset, w, w, radius);
    ctx.fill();

    // Vit highlight i överkant
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.roundRect(x + inset + 2, y + inset + 2, w - 4, w * 0.3, [radius - 1, radius - 1, 0, 0]);
    ctx.fill();

    // Subtil kant
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + inset + 0.5, y + inset + 0.5, w - 1, w - 1, radius);
    ctx.stroke();
    
    // RGB shimmer för låsta block
    if (!active && timestamp > 0) {
      const time = timestamp / 1000;
      // Skapa en våg baserad på position och tid
      const wave = Math.sin(time * 2 + gridX * 0.5 + gridY * 0.3);
      const shimmerAlpha = 0.12 + wave * 0.08; // MEDIUM: 0.04 - 0.20 alpha
      
      // Roterande hue baserad på tid och position
      const hue = (time * 40 + gridX * 20 + gridY * 15) % 360;
      
      ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${shimmerAlpha})`;
      ctx.beginPath();
      ctx.roundRect(x + inset, y + inset, w, w, radius);
      ctx.fill();
    }

    if (active) {
      ctx.restore();
    }
  }

  // Hjälpfunktion för att ljusa upp färger
  lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `rgb(${R},${G},${B})`;
  }

  drawSidebar(hud, timestamp = 0) {
    const ctx = this.ctx;
    const L = this.layout;
    
    // Använd portrait-layout om flaggan är satt
    if (L.isPortrait) {
      this.drawSidebarPortrait(hud, timestamp);
      return;
    }
    
    const { sidebarX, sidebarY, sidebarWidth, sidebarHeight, cellSize } = L;
    const radius = 12;
    const centerX = sidebarX + sidebarWidth / 2;
    const padding = cellSize * 0.5;

    ctx.save();
    
    // Animerad RGB glow runt sidebar
    const time = timestamp / 1000;
    const hue1 = (time * 30 + 90) % 360;
    const hue2 = (hue1 + 120) % 360;
    
    const rgbGradient = ctx.createLinearGradient(
      sidebarX, sidebarY, 
      sidebarX + sidebarWidth, sidebarY + sidebarHeight
    );
    rgbGradient.addColorStop(0, `hsla(${hue1}, 80%, 60%, 0.3)`);
    rgbGradient.addColorStop(0.5, `hsla(${hue2}, 80%, 60%, 0.3)`);
    rgbGradient.addColorStop(1, `hsla(${hue1}, 80%, 60%, 0.3)`);
    
    ctx.strokeStyle = rgbGradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(sidebarX - 2, sidebarY - 2, sidebarWidth + 4, sidebarHeight + 4, radius + 2);
    ctx.stroke();

    // Mjuk skugga
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;

    // Bakgrund med rundade hörn
    ctx.fillStyle = CONFIG.COLORS.sidebarBg;
    ctx.beginPath();
    ctx.roundRect(sidebarX, sidebarY, sidebarWidth, sidebarHeight, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Mjuk kant
    ctx.strokeStyle = CONFIG.COLORS.sidebarBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(sidebarX + 1, sidebarY + 1, sidebarWidth - 2, sidebarHeight - 2, radius);
    ctx.stroke();

    let y = sidebarY + cellSize * 0.6;

    // ===== LOGO SECTION =====
    // Animerade logo-block
    const blockSize = Math.floor(cellSize * 0.4);
    const blockGap = Math.floor(blockSize * 0.25);
    const totalBlockWidth = blockSize * 4 + blockGap * 3;
    const blockStartX = centerX - totalBlockWidth / 2;
    
    const blockColors = [
      { base: "#45d9c8", light: "#6ee4d6" },
      { base: "#a78bda", light: "#bda6e8" },
      { base: "#f5a623", light: "#f7b84d" },
      { base: "#e85b6c", light: "#ed7f8d" },
    ];
    
    for (let i = 0; i < 4; i++) {
      const floatOffset = Math.sin(time * 2 + i * 0.5) * 3;
      const bx = blockStartX + i * (blockSize + blockGap);
      const by = y + floatOffset;
      
      const grad = ctx.createLinearGradient(bx, by, bx + blockSize, by + blockSize);
      grad.addColorStop(0, blockColors[i].light);
      grad.addColorStop(1, blockColors[i].base);
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(bx, by, blockSize, blockSize, 4);
      ctx.fill();
      
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.roundRect(bx + 2, by + 2, blockSize - 4, blockSize * 0.35, [3, 3, 0, 0]);
      ctx.fill();
    }
    
    y += blockSize + cellSize * 0.7;

    // Titel - "Pulse"
    const fontTitle = Math.floor(cellSize * 0.7);
    ctx.font = `700 ${fontTitle}px ${CONFIG.FONT.hudFamily}`;
    ctx.fillStyle = CONFIG.COLORS.textPrimary;
    ctx.textAlign = "center";
    ctx.fillText("Pulse", centerX, y);
    y += cellSize * 0.5;

    // Undertitel
    const fontSubtitle = Math.floor(cellSize * 0.32);
    ctx.font = `600 ${fontSubtitle}px ${CONFIG.FONT.hudFamily}`;
    ctx.fillStyle = CONFIG.COLORS.textAccent;
    ctx.fillText("BLOCK GAME", centerX, y);
    y += cellSize * 0.7;

    // ===== DIVIDER =====
    this.drawDivider(ctx, sidebarX + padding, y, sidebarWidth - padding * 2);
    y += cellSize * 0.5;

    // ===== SCORE SECTION =====
    const fontLabel = Math.floor(cellSize * 0.38);
    const fontValue = Math.floor(cellSize * 0.55);
    
    // Score
    ctx.font = `500 ${fontLabel}px ${CONFIG.FONT.hudFamily}`;
    ctx.fillStyle = CONFIG.COLORS.textAccent;
    ctx.fillText("SCORE", centerX, y);
    y += cellSize * 0.55;
    
    ctx.font = `700 ${fontValue}px ${CONFIG.FONT.hudFamily}`;
    ctx.fillStyle = CONFIG.COLORS.textPrimary;
    ctx.shadowColor = "rgba(69, 217, 200, 0.3)";
    ctx.shadowBlur = 8;
    ctx.fillText(hud.score.toLocaleString(), centerX, y);
    ctx.shadowBlur = 0;
    y += cellSize * 0.8;

    // Mode-specifik middle section
    if (hud.gameMode === 'sprint') {
      // Sprint: Lines Left
      const remaining = Math.max(0, hud.sprintLines - hud.lines);
      ctx.font = `500 ${fontLabel}px ${CONFIG.FONT.hudFamily}`;
      ctx.fillStyle = CONFIG.COLORS.textAccent;
      ctx.fillText("LINES LEFT", centerX, y);
      y += cellSize * 0.55;
      
      ctx.font = `700 ${fontValue}px ${CONFIG.FONT.hudFamily}`;
      ctx.fillStyle = remaining <= 10 ? "#f5a623" : CONFIG.COLORS.textPrimary;
      ctx.fillText(remaining.toString(), centerX, y);
      y += cellSize * 0.8;
      
    } else if (hud.gameMode === 'ultra') {
      // Ultra: Time
      const mins = Math.floor(hud.timeRemaining / 60);
      const secs = Math.floor(hud.timeRemaining % 60);
      const timeColor = hud.timeRemaining <= 30 ? "#e85b6c" : CONFIG.COLORS.textPrimary;
      
      ctx.font = `500 ${fontLabel}px ${CONFIG.FONT.hudFamily}`;
      ctx.fillStyle = CONFIG.COLORS.textAccent;
      ctx.fillText("TIME", centerX, y);
      y += cellSize * 0.55;
      
      ctx.font = `700 ${fontValue}px ${CONFIG.FONT.hudFamily}`;
      ctx.fillStyle = timeColor;
      if (hud.timeRemaining <= 30) {
        ctx.shadowColor = "rgba(232, 91, 108, 0.5)";
        ctx.shadowBlur = 10;
      }
      ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, centerX, y);
      ctx.shadowBlur = 0;
      y += cellSize * 0.8;
      
    } else {
      // Marathon: Best
      ctx.font = `500 ${fontLabel}px ${CONFIG.FONT.hudFamily}`;
      ctx.fillStyle = CONFIG.COLORS.textAccent;
      ctx.fillText("BEST", centerX, y);
      y += cellSize * 0.55;
      
      ctx.font = `700 ${fontValue}px ${CONFIG.FONT.hudFamily}`;
      ctx.fillStyle = "#f5a623";
      ctx.fillText(hud.highScore.toLocaleString(), centerX, y);
      y += cellSize * 0.8;
    }

    // ===== DIVIDER =====
    this.drawDivider(ctx, sidebarX + padding, y, sidebarWidth - padding * 2);
    y += cellSize * 0.5;

    // ===== LEVEL / LINES - SIDE BY SIDE =====
    const colWidth = (sidebarWidth - padding * 2) / 2;
    const leftCol = sidebarX + padding + colWidth / 2;
    const rightCol = sidebarX + sidebarWidth - padding - colWidth / 2;
    
    ctx.font = `500 ${fontLabel}px ${CONFIG.FONT.hudFamily}`;
    ctx.fillStyle = CONFIG.COLORS.textAccent;
    ctx.fillText("LEVEL", leftCol, y);
    ctx.fillText("LINES", rightCol, y);
    y += cellSize * 0.55;
    
    ctx.font = `700 ${fontValue}px ${CONFIG.FONT.hudFamily}`;
    ctx.fillStyle = CONFIG.COLORS.textPrimary;
    ctx.fillText(hud.level.toString(), leftCol, y);
    ctx.fillText(hud.lines.toString(), rightCol, y);
    y += cellSize * 0.8;

    // ===== DIVIDER =====
    this.drawDivider(ctx, sidebarX + padding, y, sidebarWidth - padding * 2);
    y += cellSize * 0.5;

    // ===== NEXT PIECE =====
    ctx.font = `500 ${fontLabel}px ${CONFIG.FONT.hudFamily}`;
    ctx.fillStyle = CONFIG.COLORS.textAccent;
    ctx.fillText("NEXT", centerX, y);
    y += cellSize * 0.5;

    if (hud.nextPiece) {
      // Centrera next piece
      const previewSize = cellSize * 0.65;
      const previewX = centerX - previewSize * 2;
      this.drawNextPiece(hud.nextPiece, previewX, y, previewSize);
    }

    ctx.restore();
  }
  
  // Portrait-läge sidebar (horisontell, kompakt)
  drawSidebarPortrait(hud, timestamp = 0) {
    const ctx = this.ctx;
    const L = this.layout;
    const { sidebarX, sidebarY, sidebarWidth, sidebarHeight } = L;
    const radius = 10;
    const time = timestamp / 1000;

    ctx.save();
    
    // Animerad RGB glow
    const hue1 = (time * 30 + 90) % 360;
    const hue2 = (hue1 + 120) % 360;
    
    const rgbGradient = ctx.createLinearGradient(sidebarX, sidebarY, sidebarX + sidebarWidth, sidebarY);
    rgbGradient.addColorStop(0, `hsla(${hue1}, 80%, 60%, 0.3)`);
    rgbGradient.addColorStop(0.5, `hsla(${hue2}, 80%, 60%, 0.3)`);
    rgbGradient.addColorStop(1, `hsla(${hue1}, 80%, 60%, 0.3)`);
    
    ctx.strokeStyle = rgbGradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(sidebarX - 2, sidebarY - 2, sidebarWidth + 4, sidebarHeight + 4, radius + 2);
    ctx.stroke();

    // Bakgrund
    ctx.fillStyle = CONFIG.COLORS.sidebarBg;
    ctx.beginPath();
    ctx.roundRect(sidebarX, sidebarY, sidebarWidth, sidebarHeight, radius);
    ctx.fill();

    // Kant
    ctx.strokeStyle = CONFIG.COLORS.sidebarBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(sidebarX + 1, sidebarY + 1, sidebarWidth - 2, sidebarHeight - 2, radius);
    ctx.stroke();

    // Super enkel layout - en rad med jämnt fördelade element
    const padding = 12;
    const centerY = sidebarY + sidebarHeight / 2;
    const fontSize = Math.min(14, Math.floor(sidebarHeight * 0.28));
    
    // Dela upp i 4 lika delar
    const partWidth = (sidebarWidth - padding * 2) / 4;
    
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Del 1: SCORE
    let x = sidebarX + padding + partWidth * 0.5;
    ctx.font = `600 ${fontSize}px ${CONFIG.FONT.hudFamily}`;
    ctx.fillStyle = "#45d9c8";
    ctx.fillText(hud.score.toLocaleString(), x, centerY);
    
    // Del 2: LVL
    x = sidebarX + padding + partWidth * 1.5;
    ctx.fillStyle = CONFIG.COLORS.textAccent;
    ctx.fillText(`LV ${hud.level}`, x, centerY);
    
    // Del 3: LINES
    x = sidebarX + padding + partWidth * 2.5;
    ctx.fillStyle = CONFIG.COLORS.textPrimary;
    ctx.fillText(`${hud.lines} L`, x, centerY);
    
    // Del 4: NEXT PIECE
    if (hud.nextPiece) {
      const previewSize = Math.min(14, Math.floor(sidebarHeight * 0.28));
      const previewX = sidebarX + padding + partWidth * 3.5 - previewSize * 2;
      const previewY = centerY - previewSize;
      this.drawNextPiece(hud.nextPiece, previewX, previewY, previewSize);
    }

    ctx.restore();
  }
  
  // Hjälpmetod för dividers
  drawDivider(ctx, x, y, width) {
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.2, "rgba(69, 217, 200, 0.3)");
    gradient.addColorStop(0.5, "rgba(69, 217, 200, 0.5)");
    gradient.addColorStop(0.8, "rgba(69, 217, 200, 0.3)");
    gradient.addColorStop(1, "transparent");
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
  }

  drawNextPiece(piece, x, y, cellSize) {
    const ctx = this.ctx;
    const m = piece.matrix;

    // Hitta bounds för pjäsen
    let minC = 4, maxC = 0, minR = 4, maxR = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (m[r][c]) {
          minC = Math.min(minC, c);
          maxC = Math.max(maxC, c);
          minR = Math.min(minR, r);
          maxR = Math.max(maxR, r);
        }
      }
    }

    const width = maxC - minC + 1;
    const height = maxR - minR + 1;

    // Centrera i preview-arean
    const offsetX = x + (4 - width) * cellSize * 0.5;
    const offsetY = y + (2 - height) * cellSize * 0.5;
    
    // Animation - flyga in från höger
    let animOffsetX = 0;
    let animScale = 1;
    let animAlpha = 1;
    
    if (this.nextPieceAnim.active) {
      const p = this.nextPieceAnim.progress;
      // Easing: ease out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      
      animOffsetX = (1 - eased) * 80; // Flyga in från höger
      animScale = 0.5 + eased * 0.5;   // Skala upp från 50% till 100%
      animAlpha = eased;                // Fada in
    }
    
    ctx.save();
    ctx.globalAlpha = animAlpha;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!m[r][c]) continue;

        const basePx = offsetX + (c - minC) * cellSize;
        const basePy = offsetY + (r - minR) * cellSize;
        
        // Applicera animation
        const centerX = offsetX + width * cellSize * 0.5;
        const centerY = offsetY + height * cellSize * 0.5;
        
        const px = centerX + (basePx - centerX) * animScale + animOffsetX;
        const py = centerY + (basePy - centerY) * animScale;
        const size = cellSize * animScale;

        this.drawCell(px, py, size, piece.color, true);
      }
    }
    
    ctx.restore();
  }

  drawClearMessage(hud) {
    if (!hud.clearMessage) return;

    const ctx = this.ctx;
    const L = this.layout;

    // Centrera meddelandet på brädet
    const centerX = L.boardX + L.boardWidth / 2;
    const centerY = L.boardY + L.boardHeight / 2;

    const fontSize = Math.floor(L.cellSize * 0.9);
    const lineHeight = fontSize * 1.3;
    
    // Dela upp i rader
    const lines = hud.clearMessage.split('\n');

    ctx.save();
    ctx.font = `700 ${fontSize}px ${CONFIG.FONT.hudFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Beräkna total höjd
    const totalHeight = lines.length * lineHeight;
    const startY = centerY - totalHeight / 2 + lineHeight / 2;

    // Mörk bakgrund med rundade hörn
    const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
    const padding = 24;
    const radius = 12;
    
    ctx.fillStyle = "rgba(13, 38, 38, 0.92)";
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.roundRect(
      centerX - maxWidth / 2 - padding,
      centerY - totalHeight / 2 - padding / 2,
      maxWidth + padding * 2,
      totalHeight + padding,
      radius
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Rita varje rad
    lines.forEach((line, i) => {
      const y = startY + i * lineHeight;
      
      // Bestäm färg baserat på innehåll
      let color = "#c8e6e3"; // Ljus teal
      if (line.includes("T-SPIN")) {
        color = "#a78bda"; // Lavendel
      } else if (line.includes("TETRIS")) {
        color = "#45d9c8"; // Stark turkos
      } else if (line.includes("COMBO")) {
        color = "#f5a623"; // Orange
      }

      ctx.fillStyle = color;
      ctx.fillText(line, centerX, y);
    });

    ctx.restore();
  }
}