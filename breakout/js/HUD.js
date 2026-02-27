export default class HUD {
  constructor(game) {
    this.game = game;
    this.blinkTimer = 0;
    
    // Knappar för Game Over
    this.buttons = {
        restart: { x: 0, y: 0, w: 280, h: 50 },
        continue: { x: 0, y: 0, w: 280, h: 50 }
    };
  }

  update(dt) {
    this.blinkTimer += dt;
  }

  checkClick(mouseX, mouseY) {
    if (this.game.state !== 'gameover') return null;

    const b1 = this.buttons.restart;
    const b2 = this.buttons.continue;

    if (mouseX >= b1.x && mouseX <= b1.x + b1.w && mouseY >= b1.y && mouseY <= b1.y + b1.h) {
        return 'restart';
    }
    if (mouseX >= b2.x && mouseX <= b2.x + b2.w && mouseY >= b2.y && mouseY <= b2.y + b2.h) {
        return 'continue';
    }
    return null;
  }

  draw(ctx) {
    ctx.save();
    ctx.font = '20px "Press Start 2P", monospace';

    if (this.game.state === 'menu') {
        this.drawMenu(ctx);
    } else if (this.game.state === 'gameover') {
        this.drawGameOver(ctx);
    } else {
        this.drawGameUI(ctx);
    }

    ctx.restore();
  }

  drawMenu(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const centerX = w / 2;
    const centerY = h / 2;

    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, w, h);

    // HI-SCORE
    ctx.textAlign = 'center';
    ctx.fillStyle = "#ffff00"; 
    ctx.font = '15px "Press Start 2P", monospace'; 
    ctx.fillText(`HI-SCORE: ${this.game.highScore}`, centerX, 40);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // BREAKOUT
    ctx.font = '50px "Press Start 2P", monospace'; 
    const gradient = ctx.createLinearGradient(0, centerY - 120, 0, centerY - 60);
    gradient.addColorStop(0, "#ff00ff");
    gradient.addColorStop(1, "#00ffff");
    ctx.fillStyle = gradient;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "white";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ff00ff";
    ctx.fillText("BREAKOUT", centerX, centerY - 90);
    ctx.strokeText("BREAKOUT", centerX, centerY - 90);

    // NEON DRIFT
    ctx.font = '40px "Press Start 2P", monospace'; 
    ctx.fillStyle = "#00eaff";
    ctx.shadowBlur = 40;
    ctx.shadowColor = "#00eaff";
    ctx.fillText("NEON DRIFT", centerX, centerY + 10);

    // START
    if (Math.sin(this.blinkTimer * 4) > 0) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "white";
        ctx.fillStyle = "white";
        ctx.font = '20px "Press Start 2P", monospace';
        ctx.fillText("TOUCH TO START", centerX, centerY + 120);
    }

    // --- STUDIO NAMN (SmarProc Games) ---
    // En snygg, lite mindre text längst ner
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#aaaaaa"; // Ljusgrå
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText("© 2025 SmarProc Games", centerX, h - 30);
  }

  drawGameOver(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const centerX = w / 2;

    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ff4444";
    ctx.fillStyle = "#ff4444";
    ctx.font = '40px "Press Start 2P", monospace';
    ctx.fillText("SYSTEM FAILURE", centerX, h * 0.3);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "white";
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillText(`SCORE: ${this.game.score}`, centerX, h * 0.45);

    // Knappar
    const btnW = this.buttons.continue.w; 
    const btnH = 50;
    const gap = 20;
    
    this.buttons.continue.x = centerX - btnW/2;
    this.buttons.continue.y = h * 0.6;
    this.buttons.continue.h = btnH;

    this.buttons.restart.x = centerX - btnW/2;
    this.buttons.restart.y = h * 0.6 + btnH + gap;
    this.buttons.restart.w = btnW;
    this.buttons.restart.h = btnH;

    this.drawButton(ctx, this.buttons.continue, "CONTINUE (3 LIVES)", "#00eaff");
    this.drawButton(ctx, this.buttons.restart, "RESTART GAME", "#ff4444");
  }

  drawButton(ctx, btn, text, color) {
    ctx.save();
    
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

    ctx.fillStyle = "white";
    ctx.shadowBlur = 0;
    ctx.font = '13px "Press Start 2P", monospace'; 
    ctx.fillText(text, btn.x + btn.w/2, btn.y + btn.h/2);

    ctx.restore();
  }

  drawGameUI(ctx) {
    ctx.fillStyle = '#00eaff'; 
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom'; 
    ctx.shadowBlur = 0;

    const padding = 20; 
    const yPos = this.game.height - padding;

    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillText(`SCORE: ${this.game.score}`, padding, yPos);
    
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = "#ffff00"; 
    ctx.fillText(`HI: ${this.game.highScore}`, this.game.width/2, yPos);
    ctx.restore();

    ctx.save();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText(`LVL ${this.game.level}: ${this.game.currentLevelName}`, padding, 20);
    ctx.restore();

    const heartSize = 20;
    const startX = this.game.width - padding - (heartSize * 1.5 * 3);
    for (let i = 0; i < this.game.lives; i++) {
        this.drawHeart(ctx, startX + (i * heartSize * 1.5), yPos - 25, heartSize);
    }
  }

  drawHeart(ctx, x, y, size) {
    ctx.save();
    ctx.fillStyle = "#ff00ff";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ff00ff";
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 2, x, y + size);
    ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.fill();
    ctx.restore();
  }
}