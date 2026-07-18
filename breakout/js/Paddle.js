export default class Paddle {
  constructor(game) {
    this.game = game;
    
    this.baseWidthRatio = 0.15; 
    this.baseScale = 1.0;
    this.currentScale = 1.0;
    this.velocityX = 0;
    this.driftFlash = 0;
    this._previousCenterX = null;

    this.resize();
  }

  resize() {
    this.width = (this.game.width * this.baseWidthRatio) * this.currentScale;
    this.height = this.game.height * 0.025;
    this.y = this.game.height * 0.85;
    this.x = (this.game.width - this.width) / 2;
    this.resetMotionTracking();
  }

  setScale(scale) {
    this.currentScale = scale;
    const oldWidth = this.width;
    const oldX = this.x;
    const centerX = oldX + oldWidth / 2;
    this.width = (this.game.width * this.baseWidthRatio) * this.currentScale;
    this.x = centerX - this.width / 2;
    
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > this.game.width) this.x = this.game.width - this.width;
  }

  moveTo(targetX) {
    this.x = targetX - this.width / 2;
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > this.game.width) {
      this.x = this.game.width - this.width;
    }
  }

  resetMotionTracking() {
    this.velocityX = 0;
    this._previousCenterX = this.x + this.width / 2;
  }

  update(dt) {
    const centerX = this.x + this.width / 2;
    if (this._previousCenterX === null || dt <= 0) {
      this._previousCenterX = centerX;
      return;
    }

    const rawVelocity = (centerX - this._previousCenterX) / dt;
    const blend = Math.min(1, dt * 28);
    this.velocityX += (rawVelocity - this.velocityX) * blend;
    if (Math.abs(centerX - this._previousCenterX) < 0.01) {
      this.velocityX *= Math.max(0, 1 - dt * 16);
    }

    this._previousCenterX = centerX;
    this.driftFlash = Math.max(0, this.driftFlash - dt * 2.8);
  }

  draw(ctx) {
    const radius = this.height / 2;

    ctx.save();

    // --- LASER KANONER (Rita dessa underst om lasern är aktiv) ---
    if (this.game.laserActive) {
        ctx.fillStyle = "#ff0000";
        ctx.shadowBlur = 5;
        ctx.shadowColor = "#ff0000";
        
        // Vänster kanon
        ctx.fillRect(this.x + 5, this.y - 10, 6, 15);
        // Höger kanon
        ctx.fillRect(this.x + this.width - 11, this.y - 10, 6, 15);
    }

    // --- PADDEL ---
    // Drop shadow (simple offset rect instead of expensive shadowBlur)
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(this.x + 2, this.y + 3, this.width, this.height, radius);
    } else {
      ctx.rect(this.x + 2, this.y + 3, this.width, this.height);
    }
    ctx.fill();

    // Paddle body
    ctx.fillStyle = "#cccccc";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(this.x, this.y, this.width, this.height, radius);
    } else {
      ctx.rect(this.x, this.y, this.width, this.height);
    }
    ctx.fill();
    ctx.clip(); 

    ctx.fillStyle = "#444444";
    const gripWidth = this.width * 0.15;
    ctx.fillRect(this.x, this.y, gripWidth, this.height);
    ctx.fillRect(this.x + this.width - gripWidth, this.y, gripWidth, this.height);

    // Energikärna
    if (this.game.laserActive) {
        ctx.fillStyle = "#ff0000";
    } else if (this.game.overdriveActive) {
        ctx.fillStyle = "#ff3dff";
    } else {
        ctx.fillStyle = "#00eaff";
    }
    
    const coreHeight = this.height * 0.2; 
    ctx.fillRect(this.x, this.y + this.height/2 - coreHeight/2, this.width, coreHeight);

    // The outer grips are the Perfect Drift zones. The leading grip lights
    // while the paddle is moving fast enough, teaching the mechanic visually.
    const driftReady = Math.abs(this.velocityX) >= this.game.width * 0.18;
    if (driftReady || this.driftFlash > 0) {
        const direction = this.driftFlash > 0
          ? (this.driftFlashDirection || Math.sign(this.velocityX) || 1)
          : Math.sign(this.velocityX);
        const zoneWidth = this.width * 0.225;
        ctx.globalAlpha = this.driftFlash > 0 ? 1 : 0.55;
        ctx.fillStyle = this.driftFlash > 0 ? "#ffffff" : "#ff3dff";
        ctx.fillRect(
          direction < 0 ? this.x : this.x + this.width - zoneWidth,
          this.y,
          zoneWidth,
          this.height
        );
        ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillRect(this.x, this.y, this.width, this.height * 0.35);

    ctx.restore();

    if (this.game.laserActive) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = "#ff5555";
        if (this.game.effectsLevel !== 'off') {
          ctx.shadowBlur = 5;
          ctx.shadowColor = "#ff0000";
        }
        ctx.fillText(`LASER ${this.game.laserVolleys}`, this.x + this.width / 2, this.y - 13);
        ctx.restore();
    }
  }
}
