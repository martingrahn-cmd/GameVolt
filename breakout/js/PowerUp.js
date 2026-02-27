export default class PowerUp {
  constructor(game, x, y, type) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.type = type; 
    this.width = 40;
    this.height = 20;
    this.vy = 150; 
    this.delete = false;
  }

  update(dt) {
    this.y += this.vy * dt;
    if (this.y > this.game.height) {
      this.delete = true;
    }
  }

  draw(ctx) {
    ctx.save();
    
    let color = "#ffffff";
    let text = "?";
    
    // --- DESIGN OCH TEXT ---
    if (this.type === 'wide')  { color = "#33ff33"; text = "W"; } 
    if (this.type === 'multi') { color = "#00eaff"; text = "M"; } 
    if (this.type === 'life')  { color = "#ff00ff"; text = "♥"; } 
    
    // HÄR ÄR FIXEN:
    if (this.type === 'laser') { color = "#ff0000"; text = "L"; } 
    if (this.type === 'floor') { color = "#ffd700"; text = "_"; } 
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(this.x, this.y, this.width, this.height, 10);
    } else {
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "black"; 
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Centrera texten snyggt
    ctx.fillText(text, this.x + this.width/2, this.y + this.height/2 + 1);

    ctx.restore();
  }
}