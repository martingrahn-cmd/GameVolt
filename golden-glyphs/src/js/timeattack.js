// src/js/timeattack.js
import { LEVELS_EASY } from "./levels_easy.js";
import { LEVELS_MEDIUM } from "./levels_medium.js";
import { LEVELS_HARD } from "./levels_hard.js";
import { LEVELS_ARCANE } from "./levels_arcane.js";

export class TimeAttack {
    constructor() {
        this.score = 0;
        this.timeLeft = 60.0; // Starta med 60 sekunder
        this.solvedCount = 0;
        this.isPlaying = false;
        
        // Håll koll på livlinan
        this.hasUsedRevive = false; 
        
        // Skapa "kortlekar" av index som vi kan blanda
        this.decks = {
            // Vi använder en specialmetod för Easy för att filtrera bort tutorial
            easy: this.createFilteredDeck(LEVELS_EASY),
            medium: this.createDeck(LEVELS_MEDIUM.length),
            hard: this.createDeck(LEVELS_HARD.length),
            arcane: this.createDeck(LEVELS_ARCANE.length)
        };

        // Spara originalstorlekarna för att kunna återställa kortlekar
        this.deckOriginalSizes = {
            easy: this.decks.easy.length,
            medium: LEVELS_MEDIUM.length,
            hard: LEVELS_HARD.length,
            arcane: LEVELS_ARCANE.length
        };
    }

    start() {
        this.score = 0;
        this.timeLeft = 60.0;
        this.solvedCount = 0;
        this.isPlaying = true;
        this.hasUsedRevive = false;
        this.combo = 0;
        this.maxCombo = 0;
        this.levelStartTime = 0; // sätts när nivå laddas
        this.shuffleDecks();
    }

    // Anropas när en ny nivå börjar
    markLevelStart() {
        this.levelStartTime = performance.now();
    }

    // Hämta vilken tier man nått baserat på solvedCount
    getTier() {
        if (this.solvedCount >= 25) return 'ARCANE';
        if (this.solvedCount >= 15) return 'HARD';
        if (this.solvedCount >= 5)  return 'MEDIUM';
        return 'EASY';
    }

    // Spara och hämta PB-stats
    savePB() {
        const pb = this.loadPB();
        let isNewBest = false;
        if (this.score > pb.bestScore) { pb.bestScore = this.score; isNewBest = true; }
        if (this.solvedCount > pb.bestSolved) { pb.bestSolved = this.solvedCount; isNewBest = true; }
        const tierRank = { 'EASY': 0, 'MEDIUM': 1, 'HARD': 2, 'ARCANE': 3 };
        const currentTier = this.getTier();
        if (tierRank[currentTier] > tierRank[pb.bestTier]) { pb.bestTier = currentTier; isNewBest = true; }
        localStorage.setItem('goldenGlyphsTA_PB', JSON.stringify(pb));
        return { pb, isNewBest };
    }

    loadPB() {
        try {
            const saved = localStorage.getItem('goldenGlyphsTA_PB');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return { bestScore: 0, bestSolved: 0, bestTier: 'EASY' };
    }

    update(dt) {
        if (!this.isPlaying) return;
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.isPlaying = false;
            return "GAME_OVER";
        }
        return "PLAYING";
    }
    
    // Återuppliva (+20 sekunder)
    revive() {
        if (this.hasUsedRevive) return false;
        
        this.hasUsedRevive = true;
        this.timeLeft = 20.0; 
        this.isPlaying = true;
        return true;
    }

    // Ger belöning baserat på nuvarande svårighetsgrad + combo
    onSolve() {
        this.solvedCount++;
        let bonusTime = 0;
        let basePoints = 0;

        // Basbelöning per tier
        if (this.solvedCount <= 5) { // Easy
            bonusTime = 8;
            basePoints = 100;
        } else if (this.solvedCount <= 15) { // Medium
            bonusTime = 12;
            basePoints = 250;
        } else { // Hard/Arcane
            bonusTime = 15;
            basePoints = 500;
        }

        // Combo: löste man nivån under 15s?
        const solveTime = (performance.now() - this.levelStartTime) / 1000;
        const comboThreshold = 15; // sekunder
        if (solveTime < comboThreshold) {
            this.combo++;
        } else {
            this.combo = 0;
        }
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // Combo-multiplikator: x1.0, x1.2, x1.4, x1.6... (cap x2.0)
        const comboMultiplier = Math.min(2.0, 1.0 + this.combo * 0.2);
        const points = Math.round(basePoints * comboMultiplier);

        // Combo ger +2s extra tid per combo-steg (cap +6s)
        const comboTimeBonus = Math.min(6, this.combo * 2);
        bonusTime += comboTimeBonus;

        this.timeLeft += bonusTime;
        this.score += points;

        if (window.audio) window.audio.playSfx('win');

        return { addedTime: bonusTime, totalScore: this.score, combo: this.combo, comboMultiplier, comboTimeBonus };
    }

    getNextLevel() {
        let set = 'LEVELS_EASY';
        let index = 0;

        // Progressions-kurva (använder sparade originalstorlekarna)
        if (this.solvedCount < 5) {
            set = 'LEVELS_EASY';
            index = this.drawCard(this.decks.easy, 'easy');
        } else if (this.solvedCount < 15) {
            set = 'LEVELS_MEDIUM';
            index = this.drawCard(this.decks.medium, 'medium');
        } else if (this.solvedCount < 25) {
            set = 'LEVELS_HARD';
            index = this.drawCard(this.decks.hard, 'hard');
        } else {
            set = 'LEVELS_ARCANE';
            index = this.drawCard(this.decks.arcane, 'arcane');
        }

        return { set, index };
    }

    // --- Hjälpfunktioner ---

    // NYTT: Filtrera bort tutorial
    createFilteredDeck(levels) {
        const indices = [];
        levels.forEach((level, index) => {
            if (level.id !== 'tutorial_step_by_step') {
                indices.push(index);
            }
        });
        return indices;
    }
    
    createDeck(size) {
        return Array.from({length: size}, (_, i) => i);
    }

    shuffleDecks() {
        for (let key in this.decks) {
            this.shuffleArray(this.decks[key]);
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    drawCard(deck, deckKey) {
        if (deck.length === 0) {
            // Återställ med den sparade originalstorleken
            const originalSize = this.deckOriginalSizes[deckKey];
            if (deckKey === 'easy') {
                // Easy-leken: återställ med samma filtrerade indices (utan tutorial)
                const filtered = this.createFilteredDeck(LEVELS_EASY);
                for (const idx of filtered) deck.push(idx);
            } else {
                for (let i = 0; i < originalSize; i++) deck.push(i);
            }
            this.shuffleArray(deck);
        }
        return deck.pop();
    }
}