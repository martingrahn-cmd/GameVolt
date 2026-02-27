// ============================================================
// HUDNokia.js – Pixel HUD (score + highscore) inside LCD
// v1.2 — left/right alignment + retro font
// ============================================================

export class HudNokia {
    constructor(game, canvas) {
        this.game = game;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.score = 0;
        this.high = Number(localStorage.getItem("snake_nokia_highscore")) || 0;

        this.lcdX = 0;
        this.lcdY = 0;
        this.lcdW = 0;
        this.lcdH = 0;
    }

    setPosition(lcdX, lcdY, lcdW, lcdH) {
        this.lcdX = lcdX;
        this.lcdY = lcdY;
        this.lcdW = lcdW;
        this.lcdH = lcdH;
    }

    update(score) {
        this.score = score;
        if (score > this.high) {
            this.high = score;
            localStorage.setItem("snake_nokia_highscore", this.high);
        }
    }

   draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.save();

    // ======= FONT SIZE =======
    // 3310-känslan: två steg mindre än tidigare
    const fontSize = this.lcdH * 0.035;
    ctx.font = `${fontSize}px 'Press Start 2P'`;
    ctx.textBaseline = "top";

    // ======= COLORS =======
    ctx.fillStyle = "#0f2605";

    // ======= POSITION =======
    const marginX = this.lcdW * 0.05;
    const marginY = this.lcdH * 0.04;

    const leftX  = this.lcdX + marginX;
    const rightX = this.lcdX + this.lcdW - marginX;

    const y = this.lcdY + marginY;

    // ======= SCORE (vänsterjusterad) =======
    const scoreText = `SCORE:${String(this.score).padStart(3, "0")}`;
    ctx.fillText(scoreText, leftX, y);

    // ======= HI-SCORE (högerjusterad) =======
    const highText = `HI:${String(this.high).padStart(3, "0")}`;
    const textWidth = ctx.measureText(highText).width;

    ctx.fillText(highText, rightX - textWidth, y);

    ctx.restore();
}
}
// ============================================================
// Supersimpel pixel-font (5x7)
// ============================================================

const FONT = {
    "0": [
        [1,1,1],
        [1,0,1],
        [1,0,1],
        [1,0,1],
        [1,1,1],
    ],
    "1": [
        [0,1,0],
        [1,1,0],
        [0,1,0],
        [0,1,0],
        [1,1,1],
    ],
    "2": [
        [1,1,1],
        [0,0,1],
        [1,1,1],
        [1,0,0],
        [1,1,1],
    ],
    "3": [
        [1,1,1],
        [0,0,1],
        [0,1,1],
        [0,0,1],
        [1,1,1],
    ],
    "4": [
        [1,0,1],
        [1,0,1],
        [1,1,1],
        [0,0,1],
        [0,0,1],
    ],
    "5": [
        [1,1,1],
        [1,0,0],
        [1,1,1],
        [0,0,1],
        [1,1,1],
    ],
    "6": [
        [1,1,1],
        [1,0,0],
        [1,1,1],
        [1,0,1],
        [1,1,1],
    ],
    "7": [
        [1,1,1],
        [0,0,1],
        [0,1,0],
        [0,1,0],
        [0,1,0],
    ],
    "8": [
        [1,1,1],
        [1,0,1],
        [1,1,1],
        [1,0,1],
        [1,1,1],
    ],
    "9": [
        [1,1,1],
        [1,0,1],
        [1,1,1],
        [0,0,1],
        [1,1,1],
    ],
    "S": [
        [1,1,1],
        [1,0,0],
        [1,1,1],
        [0,0,1],
        [1,1,1],
    ],
    "C": [
        [1,1,1],
        [1,0,0],
        [1,0,0],
        [1,0,0],
        [1,1,1],
    ],
    "O": [
        [1,1,1],
        [1,0,1],
        [1,0,1],
        [1,0,1],
        [1,1,1],
    ],
    "R": [
        [1,1,0],
        [1,0,1],
        [1,1,0],
        [1,0,1],
        [1,0,1],
    ],
    "E": [
        [1,1,1],
        [1,0,0],
        [1,1,1],
        [1,0,0],
        [1,1,1],
    ],
    "H": [
        [1,0,1],
        [1,0,1],
        [1,1,1],
        [1,0,1],
        [1,0,1],
    ],
    "I": [
        [1,1,1],
        [0,1,0],
        [0,1,0],
        [0,1,0],
        [1,1,1],
    ],
    ":": [
        [0],
        [1],
        [0],
        [1],
        [0],
    ],
    " ": [
        [0,0],
        [0,0],
        [0,0],
        [0,0],
        [0,0],
    ]
};