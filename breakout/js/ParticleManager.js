export default class ParticleManager {
  constructor(game) {
    this.game = game;
    this.particles = [];
  }

  explode(x, y, color) {
    // OPTIMERING 1: Minskat antal partiklar (från 20 till 12)
    // Det räcker för att ge känsla utan att döda mobilen.
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 500, // Lite snabbare explosion
        vy: (Math.random() - 0.5) * 500,
        life: 1.0,
        color: color,
        size: Math.random() * 4 + 2, // Storlek 2-6 px
        gravity: 400
      });
    }
  }

  update(dt) {
    for (let p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt * 2.0; // De försvinner lite snabbare nu
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw(ctx) {
    // Spara prestanda genom att inte rita om listan är tom
    if (this.particles.length === 0) return;

    ctx.save();
    
    // OPTIMERING 2: "lighter" ger neon-look UTAN tung shadowBlur
    ctx.globalCompositeOperation = 'lighter'; 

    for (let p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      
      // OPTIMERING 3: Använd fillRect (fyrkant) istället för arc (cirkel)
      // Detta är MYCKET snabbare för processorn att rita.
      // Det passar dessutom ditt "Data/Glitch"-tema bättre!
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    ctx.restore();
  }
}