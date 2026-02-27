// ============================================================
// Scoring.js — Fair scoring system for competitive play
// ============================================================
// Designed for future Firebase leaderboard integration
// No exploits: points based on skill, not grinding

export class Scoring {
    constructor() {
        this.reset();
    }

    reset() {
        this.score = 0;
        this.foodEaten = 0;
        this.currentLevel = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.lastEatTime = 0;
        this.gameStartTime = Date.now();
        this.levelStartTime = Date.now();
    }

    // --------------------------------------------------------
    // SCORING FORMULA
    // --------------------------------------------------------
    // Base points increase with level
    // Combo multiplier for eating quickly
    // No time bonus (prevents rushing = dying)
    // --------------------------------------------------------
    
    getBasePoints() {
        // Level 1: 10 pts, Level 2: 15 pts, ... Level 10: 55 pts
        return 10 + (this.currentLevel - 1) * 5;
    }

    getComboMultiplier() {
        // 1x, 1.5x, 2x, 2.5x, 3x (max)
        return Math.min(1 + this.combo * 0.5, 3);
    }

    // Call when snake eats food
    eat() {
        const now = Date.now();
        const timeSinceLastEat = now - this.lastEatTime;
        
        // Combo: must eat within 3 seconds to maintain
        if (this.lastEatTime > 0 && timeSinceLastEat < 3000) {
            this.combo = Math.min(this.combo + 1, 4); // Max combo = 4 (3x multiplier)
        } else {
            this.combo = 0;
        }
        
        this.lastEatTime = now;
        this.foodEaten++;
        
        // Calculate points
        const base = this.getBasePoints();
        const multiplier = this.getComboMultiplier();
        const points = Math.round(base * multiplier);
        
        this.score += points;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        
        return {
            points,
            combo: this.combo,
            multiplier,
            totalScore: this.score
        };
    }

    // Call when advancing to next level
    advanceLevel() {
        this.currentLevel++;
        this.levelStartTime = Date.now();
        // Don't reset combo - reward for smooth level transitions
    }

    // DEV: Jump to specific level
    setLevel(level) {
        this.currentLevel = level;
        this.levelStartTime = Date.now();
        this.combo = 0;
    }

    // Get final stats for game over / leaderboard
    getFinalStats() {
        const totalTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
        
        return {
            score: this.score,
            foodEaten: this.foodEaten,
            levelsCompleted: this.currentLevel - 1,
            maxCombo: this.maxCombo,
            totalTimeSeconds: totalTime,
            // Unique identifier for anti-cheat (hash of game stats)
            checksum: this._generateChecksum()
        };
    }

    // Simple checksum for basic anti-cheat
    // Real anti-cheat would need server-side validation
    _generateChecksum() {
        const data = `${this.score}-${this.foodEaten}-${this.currentLevel}-${this.maxCombo}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    // For HUD display
    getDisplayScore() {
        return this.score.toLocaleString();
    }

    getComboDisplay() {
        if (this.combo === 0) return null;
        return `${this.getComboMultiplier().toFixed(1)}x`;
    }
}