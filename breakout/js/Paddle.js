export default class Paddle {
  constructor(game) {
    this.game = game;
    
    this.baseWidthRatio = 0.15; 
    this.currentScale = 1.0;    
    
    this.resize();
  }

  resize() {
    this.width = (this.game.width * this.baseWidthRatio) * this.currentScale;
    this.height = this.game.height * 0.025;
    this.y = this.game.height * 0.85;
    this.x = (this.game.width - this.width) / 2;
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

  update(dt) {
    // Inget här just nu
  }

  draw(ctx) {
    const radius = this.height / 2;

    ctx.save();

    // --- LASER KANONER (Rita dessa underst om lasern är aktiv) ---
    if (this.game.laserActive) {
        ctx.fillStyle = "#ff0000";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ff0000";
        
        // Vänster kanon
        ctx.fillRect(this.x + 5, this.y - 10, 6, 15);
        // Höger kanon
        ctx.fillRect(this.x + this.width - 11, this.y - 10, 6, 15);
    }

    // --- PADDEL ---
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.fillStyle = "#cccccc";
    
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(this.x, this.y, this.width, this.height, radius);
    } else {
      ctx.rect(this.x, this.y, this.width, this.height);
    }
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.clip(); 

    ctx.fillStyle = "#444444";
    const gripWidth = this.width * 0.15;
    ctx.fillRect(this.x, this.y, gripWidth, this.height);
    ctx.fillRect(this.x + this.width - gripWidth, this.y, gripWidth, this.height);

    // Energikärna (Byter färg till RÖD om laser är aktiv!)
    if (this.game.laserActive) {
        ctx.fillStyle = "#ff0000"; // Röd kärna
    } else {
        ctx.fillStyle = "#00eaff"; // Cyan kärna
    }
    
    const coreHeight = this.height * 0.2; 
    ctx.fillRect(this.x, this.y + this.height/2 - coreHeight/2, this.width, coreHeight);

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillRect(this.x, this.y, this.width, this.height * 0.35);

    ctx.restore();
  }
}