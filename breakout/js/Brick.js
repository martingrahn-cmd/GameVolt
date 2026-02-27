export default class Brick {
  constructor(game, x, y, width, height, color, hp) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.maxHP = hp;
    this.hp = hp;
    this.delete = false;

    this.fade = 1; // 1 → synlig, 0 → borta
    this.fadeSpeed = 0.15;
  }

  hit() {
    this.hp--;
    if (this.hp <= 0) {
      this.startFade = true;
    }
  }

  update(dt) {
    if (this.startFade) {
      this.fade -= this.fadeSpeed;
      if (this.fade <= 0) {
        this.delete = true;
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // Hantera fade-out
    if (this.fade < 1) ctx.globalAlpha = this.fade;

    // --- 1. BAS (Fyllning) ---
    ctx.globalAlpha = this.fade * 0.9; 
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // --- 2. FASETT (3D-kant / Bevel) ---
    // Detta ger känslan av att brickan sticker ut
    const bevelSize = 3;
    
    // Ljus kant (Topp & Vänster)
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.width, this.y);
    ctx.lineTo(this.x + this.width - bevelSize, this.y + bevelSize);
    ctx.lineTo(this.x + bevelSize, this.y + bevelSize);
    ctx.lineTo(this.x + bevelSize, this.y + this.height - bevelSize);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.closePath();
    ctx.fill();

    // Mörk kant (Botten & Höger)
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.moveTo(this.x + this.width, this.y);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + bevelSize, this.y + this.height - bevelSize);
    ctx.lineTo(this.x + this.width - bevelSize, this.y + this.height - bevelSize);
    ctx.lineTo(this.x + this.width - bevelSize, this.y + bevelSize);
    ctx.closePath();
    ctx.fill();

    // --- 3. SCANLINES ---
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    for(let i = 0; i < this.height; i += 4) {
         ctx.fillRect(this.x + bevelSize, this.y + i, this.width - bevelSize*2, 1);
    }

    // --- 4. PROGRESSIV GLITCH (Skada) ---
    if (this.hp < this.maxHP && this.hp > 0) {
        ctx.fillStyle = "#ffffff";
        
        const damageLevel = this.maxHP - this.hp;
        let particleCount = 0;
        let maxSize = 0;

        // Anpassa mängden glitch baserat på skada
        if (damageLevel === 1) {
            // Första träffen: Lite försiktigt flimmer
            particleCount = 2; 
            maxSize = 8; 
        } else {
            // Kritisk skada: Mycket flimmer och större block
            particleCount = 8; 
            maxSize = 15;
        }

        for(let i=0; i < particleCount; i++) {
            const gw = Math.random() * maxSize + 2; 
            const gh = Math.random() * 3 + 1;
            
            // Håll glitchen innanför ramen
            const gx = this.x + bevelSize + Math.random() * (this.width - bevelSize*2 - gw);
            const gy = this.y + bevelSize + Math.random() * (this.height - bevelSize*2 - gh);
            
            ctx.fillRect(gx, gy, gw, gh);
        }
    }

    // --- 5. RAM (Tunn Outline) ---
    ctx.globalAlpha = this.fade;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    ctx.restore();
  }
}