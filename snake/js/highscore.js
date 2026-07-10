// ============================================================
// Highscore.js — Local + Firebase-ready highscore system
// ============================================================

export class HighscoreManager {
    constructor(mode = "neo") {
        this.mode = mode;
        this.storageKey = `snakeHighscores_${mode}`;
        this.maxEntries = 10;
        
        // Firebase config (fill in later)
        this.firebaseEnabled = false;
        this.firebaseDb = null;
    }

    // Change mode (for switching between game modes)
    setMode(mode) {
        this.mode = mode;
        this.storageKey = `snakeHighscores_${mode}`;
    }

    // --------------------------------------------------------
    // LOCAL STORAGE
    // --------------------------------------------------------
    
    getLocalScores() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.log("Could not load highscores");
        }
        return [];
    }

    saveLocalScores(scores) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(scores));
        } catch (e) {
            console.log("Could not save highscores");
        }
    }

    // Add a new score (returns position 1-10, or 0 if not on list)
    addScore(score, level, stats = {}) {
        const entry = {
            score,
            level,
            date: Date.now(),
            ...stats
        };

        const scores = this.getLocalScores();
        scores.push(entry);
        
        // Sort by score descending
        scores.sort((a, b) => b.score - a.score);
        
        // Keep only top entries
        const trimmed = scores.slice(0, this.maxEntries);
        this.saveLocalScores(trimmed);
        
        // Find position (1-indexed)
        const position = trimmed.findIndex(s => 
            s.score === entry.score && s.date === entry.date
        ) + 1;
        
        // Upload to Firebase if enabled
        if (this.firebaseEnabled) {
            this._uploadToFirebase(entry);
        }
        
        return position > 0 && position <= this.maxEntries ? position : 0;
    }

    // Check if score qualifies for highscore list
    isHighscore(score) {
        const scores = this.getLocalScores();
        if (scores.length < this.maxEntries) return true;
        return score > scores[scores.length - 1].score;
    }

    // Get top scores
    getTopScores(count = 10) {
        return this.getLocalScores().slice(0, count);
    }

    // Clear all scores (for testing)
    clearScores() {
        this.saveLocalScores([]);
    }

    // --------------------------------------------------------
    // FIREBASE (stub for later)
    // --------------------------------------------------------
    
    async initFirebase(config) {
        // TODO: Initialize Firebase
        // this.firebaseDb = firebase.firestore();
        // this.firebaseEnabled = true;
        console.log("Firebase not yet implemented");
    }

    async _uploadToFirebase(entry) {
        if (!this.firebaseDb) return;
        
        // TODO: Upload to Firebase
        // await this.firebaseDb.collection('highscores').add(entry);
    }

    async getGlobalScores(count = 10) {
        if (!this.firebaseDb) return [];
        
        // TODO: Fetch from Firebase
        // const snapshot = await this.firebaseDb
        //     .collection('highscores')
        //     .orderBy('score', 'desc')
        //     .limit(count)
        //     .get();
        // return snapshot.docs.map(doc => doc.data());
        return [];
    }
}

// The modern LOCAL/GLOBAL high-score board lives in achievements.js
// (HighScoresScreen). The legacy name-entry and local-only list screens that
// used to live here were removed — name entry is gone entirely.