export class Ball {
  constructor(game) {
    this.game = game;
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

  update(dt) {
    if (dt > 0.05) dt = 0.05; 
    const g = this.game;

    if (!this.isLaunched) {
      this.x = g.paddle.x + g.paddle.width / 2;
      this.y = g.paddle.y - this.radius - 2;
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Väggar
    if (this.x < this.radius) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
      g.audio.play('wall_hit');
      g.shake(0.1, 2);
    }
    if (this.x > g.width - this.radius) {
      this.x = g.width - this.radius;
      this.vx = -Math.abs(this.vx);
      g.audio.play('wall_hit');
      g.shake(0.1, 2);
    }
    if (this.y < this.radius) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
      g.audio.play('wall_hit');
      g.shake(0.1, 2);
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
      
      g.combo = 0; // Reset combo
      
      const hit = (this.x - (p.x + p.width / 2)) / (p.width / 2);
      const angle = hit * (Math.PI / 3);
      
      // --- FIX: MILD ACCELERATION ---
      // Öka bara med 2% per träff (var 5% förut)
      // Maxhastighet är 1.6x basfarten (var 2.0x förut)
      this.speed = Math.min(this.baseSpeed * 1.6, this.speed * 1.02);
      
      // Applicera nya farten med vinkeln
      this.vx = Math.sin(angle) * this.speed;
      this.vy = -Math.cos(angle) * this.speed;
    }

    g.bricks.checkCollision(this);
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#00eaff";
    
    // Liten glöd
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00eaff";
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}