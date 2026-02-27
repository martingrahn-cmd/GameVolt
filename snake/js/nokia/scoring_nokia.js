// ============================================================
// ScoringNokia.js — Simple 1 point per food scoring
// ============================================================

export class ScoringNokia {
    constructor() {
        this.score = 0;
        this.foodEaten = 0;
        this.currentLevel = 1;
        this.startTime = Date.now();
    }

    // Called when snake eats food
    eat() {
        this.foodEaten++;
        this.score += 1;  // Simple: 1 point per food
        
        return {
            points: 1,
            combo: 0  // No combo in Nokia mode
        };
    }

    // Get display score
    getDisplayScore() {
        return this.score;
    }

    // Reset for new game
    reset() {
        this.score = 0;
        this.foodEaten = 0;
        this.currentLevel = 1;
        this.startTime = Date.now();
    }

    // For compatibility with Neo mode
    advanceLevel() {
        this.currentLevel++;
    }

    setLevel(level) {
        this.currentLevel = level;
    }

    getFinalStats() {
        return {
            score: this.score,
            foodEaten: this.foodEaten,
            levelsCompleted: this.currentLevel - 1,
            maxCombo: 0,
            totalTimeSeconds: Math.floor((Date.now() - this.startTime) / 1000)
        };
    }
}