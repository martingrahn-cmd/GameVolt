// src/js/effects.js
import { TRAILS } from "./config.js";

export class Effects {
  constructor(grid) {
    this.grid = grid;
    this.particles = [];
    this.floatingTexts = []; 
    this.trailType = "trail_default";
    this.screenShake = 0;
  }

  setTrailType(type) { this.trailType = type; }
  shake(amount) { this.screenShake = amount; }

  getShakeOffset() {
      if (this.screenShake <= 0) return { x: 0, y: 0 };
      const dx = (Math.random() - 0.5) * this.screenShake * 0.5;
      const dy = (Math.random() - 0.5) * this.screenShake * 0.5;
      return { x: dx, y: dy };
  }

  emitTrail(x, y) {
      if (Math.random() > 0.5) return;
      
      const trailData = TRAILS[this.trailType];
      let color = trailData ? trailData.color : "#FFF";

      // Rainbow = slumpad färg från regnbågen
      if (color === "RAINBOW") {
          const colors = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3"];
          color = colors[Math.floor(Math.random() * colors.length)];
      }

      let size = Math.random() * 6 + 6;
      const rotation = Math.random() * Math.PI * 2;
      
      this.particles.push({
          x: x + (Math.random()-0.5) * 30, 
          y: y + (Math.random()-0.5) * 30,
          vx: (Math.random() - 0.5) * 3, 
          vy: (Math.random() - 0.5) * 3 - 1,
          life: 1.0, 
          decay: 0.02,
          color: color, 
          size: size,
          rotation: rotation,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          trailType: this.trailType,
          type: 'trail'
      });
  }

  explode(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1.0, decay: Math.random() * 0.03 + 0.01,
        color: color, size: Math.random() * 4 + 2, type: 'explode'
      });
    }
    // Ring-pulse
    this.particles.push({
        x: x, y: y, vx: 0, vy: 0,
        life: 1.0, decay: 0.04,
        color: color, radius: 5, maxRadius: 50,
        type: 'ring'
    });
  }

  triggerVictory(pieces) {
      this.shake(15);
      const cx = this.grid.originX + (this.grid.cols * this.grid.pitch) / 2;
      const cy = this.grid.originY + (this.grid.rows * this.grid.pitch) / 2;

      // Festliga färger
      const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#A06CD5", "#FF9F43", "#54E346", "#FF69B4", "#00E5FF"];

      for (let i = 0; i < 100; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 12 + 5;
          // Rektangulär konfetti med tumbling
          const w = Math.random() * 6 + 4;
          const h = Math.random() * 3 + 2;
          this.particles.push({
              x: cx, y: cy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 3,
              life: 2.0, decay: Math.random() * 0.008 + 0.004,
              color: colors[Math.floor(Math.random() * colors.length)],
              w: w, h: h,
              gravity: 0.12,
              rotation: Math.random() * Math.PI * 2,
              rotationSpeed: (Math.random() - 0.5) * 0.3,
              tumble: Math.random() * Math.PI * 2,
              tumbleSpeed: (Math.random() - 0.5) * 0.15,
              type: 'confetti'
          });
      }
  }

  spawnFloatingText(x, y, text, color="#FFF", size="normal") {
      this.floatingTexts.push({
          x: x, y: y, text: text, color: color,
          life: 1.5, maxLife: 1.5, vy: -2, scale: 0.1,
          size: size // "normal" eller "large"
      });
  }

  update(dt) {
    if (this.screenShake > 0) {
        this.screenShake -= dt * 60;
        if (this.screenShake < 0) this.screenShake = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.gravity) p.vy += p.gravity;
      if (p.rotation !== undefined) p.rotation += p.rotationSpeed || 0;
      if (p.tumble !== undefined) p.tumble += p.tumbleSpeed || 0;
      if (p.type === 'ring') p.radius += (p.maxRadius - p.radius) * 0.15;
      // Air resistance for confetti
      if (p.type === 'confetti') { p.vx *= 0.98; }
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y += ft.vy; 
        ft.life -= dt;
        const progress = 1.0 - (ft.life / ft.maxLife); 
        if (progress < 0.2) ft.scale = 0.1 + (progress / 0.2) * 1.4;
        else ft.scale = 1.5 - ((progress - 0.2) * 0.5);
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  // === RITA OLIKA FORMER ===
  
  drawHeart(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.moveTo(0, size * 0.3);
      ctx.bezierCurveTo(-size, -size * 0.5, -size, size * 0.3, 0, size);
      ctx.bezierCurveTo(size, size * 0.3, size, -size * 0.5, 0, size * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
  }

  drawStar(ctx, x, y, size, points = 5) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
          const r = (i % 2 === 0) ? size : size * 0.4;
          const angle = (i * Math.PI / points) - Math.PI / 2;
          if (i === 0) ctx.moveTo(r * Math.cos(angle), r * Math.sin(angle));
          else ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
  }

  drawSnowflake(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.lineWidth = size * 0.15;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI / 3);
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
          // Små grenar
          const branchLen = size * 0.4;
          const bx = Math.cos(angle) * size * 0.6;
          const by = Math.sin(angle) * size * 0.6;
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(angle + 0.5) * branchLen, by + Math.sin(angle + 0.5) * branchLen);
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(angle - 0.5) * branchLen, by + Math.sin(angle - 0.5) * branchLen);
      }
      ctx.stroke();
      ctx.restore();
  }

  drawFlower(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      // 5 kronblad
      for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2 / 5) - Math.PI / 2;
          ctx.beginPath();
          ctx.ellipse(
              Math.cos(angle) * size * 0.4,
              Math.sin(angle) * size * 0.4,
              size * 0.5, size * 0.3,
              angle, 0, Math.PI * 2
          );
          ctx.fill();
      }
      // Mitten
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
  }

  drawDiamond(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.6, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
  }

  drawSpiral(ctx, x, y, size, rotation) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.lineWidth = size * 0.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < 30; i++) {
          const angle = i * 0.3;
          const r = i * size * 0.05;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
  }

  drawBubble(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      // Yttre cirkel
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      // Glans
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(-size * 0.3, -size * 0.3, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      
      if (p.type === 'confetti') {
          // Tumbling rektangulär konfetti med 3D-perspektiv
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          // Fake 3D: skala höjden med cos(tumble) för tumbling-effekt
          const scaleY = Math.abs(Math.cos(p.tumble));
          ctx.scale(1, Math.max(0.15, scaleY));
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
      }
      else if (p.type === 'ring') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(0.5, 3 * p.life);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
      }
      else if (p.type === 'victory') {
          const halfSize = p.size / 2;
          ctx.fillRect(p.x - halfSize, p.y - halfSize, p.size, p.size);
      }
      else if (p.type === 'trail') {
          ctx.save();
          // Ingen shadowBlur för bättre prestanda
          
          if (p.rotation !== undefined) {
              ctx.translate(p.x, p.y);
              ctx.rotate(p.rotation);
              ctx.translate(-p.x, -p.y);
          }
          
          // Rita baserat på trail-typ
          switch(p.trailType) {
              case 'trail_hearts':
                  this.drawHeart(ctx, p.x, p.y, p.size);
                  break;
              case 'trail_stars':
              case 'trail_spark':
                  this.drawStar(ctx, p.x, p.y, p.size);
                  break;
              case 'trail_ice':
                  this.drawSnowflake(ctx, p.x, p.y, p.size);
                  break;
              case 'trail_sakura':
                  this.drawFlower(ctx, p.x, p.y, p.size);
                  break;
              case 'trail_gold':
                  this.drawDiamond(ctx, p.x, p.y, p.size);
                  break;
              case 'trail_magic':
                  this.drawSpiral(ctx, p.x, p.y, p.size, p.rotation || 0);
                  break;
              case 'trail_bubbles':
                  this.drawBubble(ctx, p.x, p.y, p.size);
                  break;
              case 'trail_fire':
                  // Eldflamma - triangel som pekar uppåt
                  ctx.beginPath();
                  ctx.moveTo(p.x, p.y - p.size);
                  ctx.lineTo(p.x - p.size * 0.6, p.y + p.size * 0.5);
                  ctx.lineTo(p.x + p.size * 0.6, p.y + p.size * 0.5);
                  ctx.closePath();
                  ctx.fill();
                  break;
              case 'trail_toxic':
                  // Giftbubbla med "droppar"
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.beginPath();
                  ctx.arc(p.x + p.size * 0.5, p.y + p.size * 0.3, p.size * 0.3, 0, Math.PI * 2);
                  ctx.fill();
                  break;
              case 'trail_shadow':
                  // Skuggig rök - lite större för att kompensera bortagen blur
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
                  ctx.fill();
                  break;
              case 'trail_rainbow':
                  // Regnbåge - liten båge
                  ctx.lineWidth = p.size * 0.3;
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, p.size, Math.PI, 0);
                  ctx.stroke();
                  break;
              default:
                  // Standard cirkel
                  ctx.beginPath(); 
                  ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); 
                  ctx.fill();
          }
          ctx.restore();
      } 
      else {
          ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }

    // RITA TEXT
    ctx.font = `900 36px 'Cinzel', serif`;
    ctx.textAlign = "center";

    for (const ft of this.floatingTexts) {
        ctx.save();
        const fontSize = ft.size === "large" ? 52 : 36;
        ctx.font = `900 ${fontSize}px 'Cinzel', serif`;
        ctx.translate(ft.x, ft.y);
        ctx.scale(ft.scale, ft.scale);
        ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "black";
        ctx.strokeText(ft.text, 0, 0);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();
    }
    ctx.restore();
  }
}