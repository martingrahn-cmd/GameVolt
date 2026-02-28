export default class Laser {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 4;
    this.height = 15;
    this.vy = -600; // Snabb hastighet uppåt
    this.delete = false;
  }

  update(dt) {
    this.y += this.vy * dt;
    // Ta bort om den åker utanför skärmen
    if (this.y < -50) {
        this.delete = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = "#ff0000"; // Röd laser
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#ff0000";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Vit kärna för intensitet
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 0;
    ctx.fillRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2);
    ctx.restore();
  }
}