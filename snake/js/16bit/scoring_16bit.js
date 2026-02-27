// ============================================================
// Scoring16bit.js — Chain combo system with lock-in
// ============================================================

export class Scoring16bit {
    constructor() {
        this.reset();
    }

    reset() {
        // Score
        this.score = 0;
        this.basePointsPerFruit = 10;
        
        // Chain system
        this.chain = 0;
        this.bestChain = 0;
        
        // Round tracking
        this.currentRound = 1;
        this.roundsCompleted = 0;
        
        // Stats
        this.fruitsEaten = 0;
        this.correctFruits = 0;
        this.wrongFruits = 0;
        this.totalLockInBonus = 0;
        
        // Timing
        this.startTime = Date.now();
        
        // Multiplier thresholds
        this.multiplierThresholds = [
            { chain: 0, multiplier: 1, name: '', lockInBonus: 0 },
            { chain: 5, multiplier: 2, name: 'NICE!', lockInBonus: 250 },
            { chain: 10, multiplier: 3, name: 'GREAT!', lockInBonus: 500 },
            { chain: 15, multiplier: 4, name: 'AMAZING!', lockInBonus: 750 },
            { chain: 20, multiplier: 5, name: 'INCREDIBLE!', lockInBonus: 1000 },
            { chain: 25, multiplier: 6, name: '🔥 FEVER 🔥', lockInBonus: 1500 }
        ];
        
        // Wrong fruit penalty
        this.wrongPenalty = 25;
        
        // Speed settings (base speed per round)
        this.baseSpeedPerRound = [
            0.12,  // Round 1
            0.11,  // Round 2
            0.10,  // Round 3
            0.09,  // Round 4
            0.08,  // Round 5+
        ];
    }

    // Get current multiplier info
    getMultiplierInfo() {
        let current = this.multiplierThresholds[0];
        
        for (const threshold of this.multiplierThresholds) {
            if (this.chain >= threshold.chain) {
                current = threshold;
            } else {
                break;
            }
        }
        
        return current;
    }

    // Get current multiplier value
    getMultiplier() {
        return this.getMultiplierInfo().multiplier;
    }

    // Check if can lock in (need at least x2 = chain 5)
    canLockIn() {
        return this.chain >= 5;
    }

    // Eat correct fruit
    eatCorrect() {
        this.chain++;
        this.fruitsEaten++;
        this.correctFruits++;
        
        if (this.chain > this.bestChain) {
            this.bestChain = this.chain;
        }
        
        const multiplier = this.getMultiplier();
        const points = this.basePointsPerFruit * multiplier;
        this.score += points;
        
        const info = this.getMultiplierInfo();
        
        return {
            points,
            multiplier,
            chain: this.chain,
            levelUp: this._checkLevelUp(),
            message: info.name
        };
    }

    // Check if we just crossed a threshold
    _checkLevelUp() {
        for (const threshold of this.multiplierThresholds) {
            if (this.chain === threshold.chain && threshold.chain > 0) {
                return threshold;
            }
        }
        return null;
    }

    // Eat wrong fruit
    eatWrong() {
        this.fruitsEaten++;
        this.wrongFruits++;
        
        const lostChain = this.chain;
        this.chain = 0;
        
        this.score = Math.max(0, this.score - this.wrongPenalty);
        
        return {
            points: -this.wrongPenalty,
            lostChain,
            message: 'WRONG!'
        };
    }

    // Lock in bonus
    lockIn() {
        const info = this.getMultiplierInfo();
        const bonus = info.lockInBonus;
        
        this.score += bonus;
        this.totalLockInBonus += bonus;
        this.roundsCompleted++;
        this.currentRound++;
        
        const result = {
            bonus,
            chain: this.chain,
            multiplier: info.multiplier,
            message: `LOCKED x${info.multiplier}!`,
            newRound: this.currentRound
        };
        
        // Reset chain for new round
        this.chain = 0;
        
        return result;
    }

    // Get base speed for current round
    getBaseSpeed() {
        const index = Math.min(this.currentRound - 1, this.baseSpeedPerRound.length - 1);
        return this.baseSpeedPerRound[index];
    }

    // Get speed including chain bonus
    getCurrentSpeed() {
        const baseSpeed = this.getBaseSpeed();
        
        // Speed increases with chain (faster = lower stepTime)
        // Each chain level reduces stepTime slightly
        const chainSpeedBonus = this.chain * 0.002;
        
        // Minimum speed cap (don't go too fast)
        return Math.max(0.05, baseSpeed - chainSpeedBonus);
    }

    // Check if in fever mode
    isFeverMode() {
        return this.chain >= 25;
    }

    // Get progress to next multiplier (0-1)
    getProgressToNext() {
        const thresholds = this.multiplierThresholds;
        
        for (let i = 0; i < thresholds.length - 1; i++) {
            if (this.chain >= thresholds[i].chain && this.chain < thresholds[i + 1].chain) {
                const current = thresholds[i].chain;
                const next = thresholds[i + 1].chain;
                return (this.chain - current) / (next - current);
            }
        }
        
        // Max level
        return 1;
    }

    // Get final stats for game over
    getFinalStats() {
        const elapsed = Date.now() - this.startTime;
        
        return {
            score: this.score,
            bestChain: this.bestChain,
            roundsCompleted: this.roundsCompleted,
            fruitsEaten: this.fruitsEaten,
            correctFruits: this.correctFruits,
            wrongFruits: this.wrongFruits,
            accuracy: this.fruitsEaten > 0 
                ? Math.round((this.correctFruits / this.fruitsEaten) * 100) 
                : 0,
            totalLockInBonus: this.totalLockInBonus,
            totalTimeSeconds: Math.floor(elapsed / 1000),
            level: this.currentRound
        };
    }

    // For compatibility
    getDisplayScore() {
        return this.score;
    }

    eat() {
        // This is called by the base game - we override with eatCorrect/eatWrong
        return { points: 0, combo: this.chain };
    }

    advanceLevel() {
        this.currentRound++;
    }

    setLevel(level) {
        this.currentRound = level;
    }
}