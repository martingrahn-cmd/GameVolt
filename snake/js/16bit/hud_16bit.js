// ============================================================
// HUD16bit.js — Minimal HUD (renderer handles most UI)
// ============================================================

export class Hud16bit {
    constructor(game) {
        this.game = game;
        this.high = Number(localStorage.getItem("snake_16bit_highscore")) || 0;
    }

    update(dt) {
        // Update high score
        const score = this.game.scoring?.score || 0;
        if (score > this.high) {
            this.high = score;
            localStorage.setItem("snake_16bit_highscore", this.high);
        }
    }

    // Not used - renderer handles display
    draw() {}

    // No forbidden zone needed
    getForbiddenZone() {
        return null;
    }

    setupForbiddenZone(food) {}
}