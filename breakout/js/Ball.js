import { isPerfectDrift, getDriftAimBoost } from './Drift.js';

export class Ball {
  constructor(game, options = {}) {
    this.game = game;
    this.powerUpDropScale = typeof options.powerUpDropScale === 'number'
      ? Math.max(0, options.powerUpDropScale)
      : 1;
    this.reset();
  }

  reset() {
    this.radius = Math.max(6, this.game.height * 0.015);
    
    // --- LEVEL HASTIGHET ---
    // Basfart ökar med 5% per level.
    // Level 1: 100%, Level 2: 105%, Level 10: 145%
    const levelMultiplier = 1 + (this.game.level - 1) * 0.05;
    
    // Grundfart baserat på skärmhöjd (65% av höjden per sekund)
    this.baseSpeed = (this.game.height * 0.65) * levelMultiplier; 
    
    this.speed = this.baseSpeed;
    this.isLaunched = false;
    
    this.x = this.game.width / 2;
    this.y = this.game.height * 0.8;
    this.vx = 0;
    this.vy = 0;
    this.trail = [];
  }

  launch() {
    if (this.isLaunched) return;
    this.isLaunched = true;
    
    this.game.audio.play('ball_launch');
    this.game.audio.play('music');

    const angle = -Math.PI / 2 + (Math.random() * 0.35 - 0.175);
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;
  }

  resize(scaleX, scaleY, newHeight) {
    const speedScale = Math.min(scaleX, scaleY);
    this.x *= scaleX;
    this.y *= scaleY;
    this.radius = Math.max(6, newHeight * 0.015);
    this.baseSpeed *= speedScale;
    this.speed *= speedScale;
    this.vx *= speedScale;
    this.vy *= speedScale;
    this.trail.forEach(point => {
      point.x *= scaleX;
      point.y *= scaleY;
    });
  }

  update(dt) {
    if (dt > 0.05) dt = 0.05;
    const g = this.game;

    if (!this.isLaunched) {
      this.x = g.paddle.x + g.paddle.width / 2;
      this.y = g.paddle.y - this.radius - 2;
      return;
    }

    // Split fast frames into small collision steps. This prevents the ball
    // from tunnelling through thin bricks as speed increases on later levels.
    const maxTravel = Math.max(Math.abs(this.vx), Math.abs(this.vy)) * dt;
    const maxStepDistance = Math.max(4, this.radius * 0.75);
    const steps = Math.min(16, Math.max(1, Math.ceil(maxTravel / maxStepDistance)));
    const stepDt = dt / steps;

    for (let step = 0; step < steps; step++) {
      this.x += this.vx * stepDt;
      this.y += this.vy * stepDt;

      // Väggar
      if (this.x < this.radius) {
        this.x = this.radius;
        this.vx = Math.abs(this.vx);
        g.audio.play('wall_hit');
        g.shake(0.1, 2);
        g.particles.impact(this.x, this.y, '#00eaff', 0.45);
      }
      if (this.x > g.width - this.radius) {
        this.x = g.width - this.radius;
        this.vx = -Math.abs(this.vx);
        g.audio.play('wall_hit');
        g.shake(0.1, 2);
        g.particles.impact(this.x, this.y, '#00eaff', 0.45);
      }
      if (this.y < this.radius) {
        this.y = this.radius;
        this.vy = Math.abs(this.vy);
        g.audio.play('wall_hit');
        g.shake(0.1, 2);
        g.particles.impact(this.x, this.y, '#00eaff', 0.45);
      }

      // Paddel
      const p = g.paddle;
      if (
        this.y + this.radius > p.y &&
        this.y - this.radius < p.y + p.height &&
        this.x > p.x &&
        this.x < p.x + p.width &&
        this.vy > 0
      ) {
        this.y = p.y - this.radius;
        g.audio.play('paddle_hit');

        const hit = (this.x - (p.x + p.width / 2)) / (p.width / 2);
        const perfectDrift = isPerfectDrift(hit, p.velocityX, g.width);

        if (perfectDrift) {
          g.registerPerfectDrift(hit, this.x, this.y);
        } else {
          g.resetCombo();
          g.particles.impact(this.x, this.y, '#00eaff', 0.8);
        }

        const driftBoost = perfectDrift ? getDriftAimBoost(p.velocityX, g.width) : 0;
        const aimedHit = Math.max(-1, Math.min(1, hit + driftBoost));
        const angle = aimedHit * (Math.PI / 3);

        // Öka med 2% per träff, upp till 1.6x basfarten.
        this.speed = Math.min(this.baseSpeed * 1.6, this.speed * 1.02);
        this.vx = Math.sin(angle) * this.speed;
        this.vy = -Math.cos(angle) * this.speed;
        g.bricks.onPaddleHit();
      }

      g.bricks.checkCollision(this);
    }

    const trailLength = g.effectsLevel === 'high' ? 12 : (g.effectsLevel === 'low' ? 6 : 0);
    if (trailLength > 0) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > trailLength) {
        this.trail.splice(0, this.trail.length - trailLength);
      }
    } else if (this.trail.length > 0) {
      this.trail = [];
    }
  }

  draw(ctx) {
    const ballColor = this.game.overdriveActive ? '#ff5cff' : '#00eaff';

    if (this.trail.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.trail.length; i++) {
        const point = this.trail[i];
        const progress = (i + 1) / this.trail.length;
        ctx.globalAlpha = progress * 0.28;
        ctx.fillStyle = ballColor;
        ctx.beginPath();
        ctx.arc(point.x, point.y, this.radius * (0.25 + progress * 0.55), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = ballColor;
    
    ctx.shadowBlur = this.game.effectsLevel === 'off'
      ? 0
      : (this.game.overdriveActive ? 10 : 5);
    ctx.shadowColor = ballColor;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
