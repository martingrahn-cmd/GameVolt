export default class ParticleManager {
  constructor(game) {
    this.game = game;
    this.particles = [];
    this.rings = [];
  }

  explode(x, y, color) {
    const count = this.game.effectsLevel === 'high'
      ? 14
      : (this.game.effectsLevel === 'low' ? 7 : 0);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 500,
        vy: (Math.random() - 0.5) * 500,
        life: 1.0,
        color: color,
        size: Math.random() * 4 + 2,
        gravity: 400,
        decay: 2.0
      });
    }
  }

  impact(x, y, color, strength = 1) {
    if (this.game.effectsLevel === 'off') return;

    const high = this.game.effectsLevel === 'high';
    const count = high ? Math.ceil(7 * strength) : Math.ceil(3 * strength);
    const speed = 220 * strength;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.35 + Math.random() * 0.65);
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1.0,
        color: color,
        size: Math.random() * 2.5 + 1,
        gravity: 0,
        decay: high ? 4.5 : 6
      });
    }

    this.rings.push({
      x: x,
      y: y,
      radius: 2,
      maxRadius: (high ? 24 : 15) * strength,
      life: 1,
      color: color
    });
  }

  clear() {
    this.particles = [];
    this.rings = [];
  }

  update(dt) {
    for (let p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt * (p.decay || 2.0);
    }
    this.particles = this.particles.filter(p => p.life > 0);

    for (let ring of this.rings) {
      ring.radius += (ring.maxRadius - ring.radius) * Math.min(1, dt * 18);
      ring.life -= dt * 5;
    }
    this.rings = this.rings.filter(ring => ring.life > 0);
  }

  draw(ctx) {
    if (this.particles.length === 0 && this.rings.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    for (let ring of this.rings) {
      ctx.globalAlpha = ring.life;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 1 + ring.life * 2;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
