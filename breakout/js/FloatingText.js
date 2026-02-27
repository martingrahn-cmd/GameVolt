export default class FloatingText {
  constructor(x, y, text, color = "#ffffff") {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.velocity = -50; // Flyger uppåt
    this.life = 1.0; // Synlig i 1 sekund
    this.delete = false;
  }

  update(dt) {
    this.y += this.velocity * dt;
    this.life -= dt * 1.5; // Tona ut
    if (this.life <= 0) this.delete = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 5;
    ctx.shadowColor = this.color;
    ctx.font = 'bold 16px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}