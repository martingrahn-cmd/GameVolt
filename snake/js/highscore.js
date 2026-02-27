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
    addScore(name, score, level, stats = {}) {
        const entry = {
            name: name.substring(0, 10).toUpperCase(),
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

// ============================================================
// Highscore Entry Screen
// ============================================================

export class HighscoreEntryScreen {
    constructor(highscoreManager) {
        this.manager = highscoreManager;
        this.overlay = null;
        this.isShowing = false;
        
        this.score = 0;
        this.level = 1;
        this.name = "";
        this.maxNameLength = 10;
        
        this.onComplete = null;
        
        this._createOverlay();
        this._boundKeyHandler = this._handleKey.bind(this);
    }

    _createOverlay() {
        this.overlay = document.createElement("div");
        this.overlay.id = "highscore-entry-overlay";
        this.overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1001;
            font-family: 'Courier New', monospace;
        `;
        
        this.overlay.innerHTML = `
            <div class="hs-container" style="text-align: center; color: #0ff;">
                <div class="hs-title" style="
                    font-size: 2.5em;
                    font-weight: bold;
                    text-shadow: 0 0 20px #ff0, 0 0 40px #ff0;
                    margin-bottom: 20px;
                    letter-spacing: 4px;
                    color: #ff0;
                ">NEW HIGHSCORE!</div>
                
                <div class="hs-score" style="
                    font-size: 3em;
                    color: #0f0;
                    text-shadow: 0 0 20px #0f0;
                    margin-bottom: 40px;
                "></div>
                
                <div style="
                    font-size: 1.4em;
                    margin-bottom: 20px;
                    color: #888;
                ">ENTER YOUR NAME:</div>
                
                <!-- Real input for mobile keyboard -->
                <input type="text" class="hs-input" maxlength="10" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" style="
                    font-family: 'Courier New', monospace;
                    font-size: 2.5em;
                    letter-spacing: 8px;
                    text-align: center;
                    background: transparent;
                    border: none;
                    border-bottom: 3px solid #0ff;
                    color: #0ff;
                    padding: 10px 20px;
                    min-width: 200px;
                    outline: none;
                    text-transform: uppercase;
                    caret-color: #0ff;
                " />
                
                <!-- OK Button for mobile -->
                <button class="hs-ok-btn" style="
                    display: block;
                    margin: 30px auto 0;
                    padding: 15px 60px;
                    font-family: 'Courier New', monospace;
                    font-size: 1.5em;
                    font-weight: bold;
                    background: #0ff;
                    color: #000;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    text-transform: uppercase;
                    letter-spacing: 4px;
                ">OK</button>
                
                <div style="
                    font-size: 0.9em;
                    color: #555;
                    margin-top: 15px;
                ">TAP OK WHEN DONE</div>
            </div>
            
            <style>
                .hs-input::placeholder {
                    color: #444;
                }
                .hs-ok-btn:active {
                    background: #0aa;
                    transform: scale(0.98);
                }
            </style>
        `;
        
        document.body.appendChild(this.overlay);
    }

    _handleKey(e) {
        if (!this.isShowing) return;
        
        // Enter = confirm
        if (e.key === "Enter") {
            const input = this.overlay.querySelector(".hs-input");
            if (input.value.length > 0) {
                e.preventDefault();
                this._submit();
            }
            return;
        }
    }

    _submit() {
        const input = this.overlay.querySelector(".hs-input");
        const name = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        
        if (name.length === 0) return;
        
        const position = this.manager.addScore(name, this.score, this.level);
        this.hide();
        
        if (this.onComplete) {
            this.onComplete(position);
        }
    }

    show(score, level, onComplete) {
        this.score = score;
        this.level = level;
        this.onComplete = onComplete;
        
        // Update score display
        this.overlay.querySelector(".hs-score").textContent = score.toLocaleString();
        
        // Reset and focus input
        const input = this.overlay.querySelector(".hs-input");
        input.value = "";
        
        // Setup OK button handler
        const okBtn = this.overlay.querySelector(".hs-ok-btn");
        okBtn.onclick = () => this._submit();
        
        this.overlay.style.display = "flex";
        this.isShowing = true;
        
        // Focus input after a short delay (for mobile)
        setTimeout(() => {
            input.focus();
        }, 100);
        
        window.addEventListener("keydown", this._boundKeyHandler);
    }

    hide() {
        this.overlay.style.display = "none";
        this.isShowing = false;
        window.removeEventListener("keydown", this._boundKeyHandler);
        
        // Blur input to hide mobile keyboard
        const input = this.overlay.querySelector(".hs-input");
        if (input) input.blur();
    }
}

// ============================================================
// Highscore List Screen (Improved with scrolling & context)
// ============================================================

export class HighscoreListScreen {
    constructor(highscoreManager) {
        this.manager = highscoreManager;
        this.overlay = null;
        this.isShowing = false;
        
        this.onClose = null;
        this.highlightPosition = -1; // Position to highlight (1-indexed)
        
        this._createOverlay();
        this._boundKeyHandler = this._handleKey.bind(this);
        this._gamepadPollId = null;
        this._lastButtonState = false;
    }

    _createOverlay() {
        this.overlay = document.createElement("div");
        this.overlay.id = "highscore-list-overlay";
        this.overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            font-family: 'Courier New', monospace;
        `;
        
        this.overlay.innerHTML = `
            <div class="hsl-container" style="text-align: center; color: #0ff; max-height: 90vh; overflow: hidden;">
                <div class="hsl-title" style="
                    font-size: 2.5em;
                    font-weight: bold;
                    text-shadow: 0 0 20px #0ff, 0 0 40px #0ff;
                    margin-bottom: 30px;
                    letter-spacing: 6px;
                ">HIGHSCORES</div>
                
                <div class="hsl-list-container" style="
                    max-height: 60vh;
                    overflow-y: auto;
                    padding: 10px 20px;
                    scrollbar-width: thin;
                    scrollbar-color: #0ff #222;
                ">
                    <div class="hsl-list" style="
                        font-size: 1.2em;
                        text-align: left;
                        display: inline-block;
                        min-width: 350px;
                    "></div>
                </div>
                
                <div class="hsl-empty" style="
                    font-size: 1.3em;
                    color: #666;
                    display: none;
                    padding: 40px;
                ">NO SCORES YET<br><span style="font-size: 0.7em; margin-top: 10px; display: block;">Play a game to set a highscore!</span></div>
                
                <div class="hsl-scroll-hint" style="
                    margin-top: 15px;
                    font-size: 0.8em;
                    color: #666;
                    display: none;
                ">↑↓ SCROLL · MORE SCORES BELOW</div>
                
                <!-- Close button for mobile -->
                <button class="hsl-close-btn" style="
                    display: block;
                    margin: 25px auto 0;
                    padding: 15px 50px;
                    font-family: 'Courier New', monospace;
                    font-size: 1.3em;
                    font-weight: bold;
                    background: #0ff;
                    color: #000;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                ">CLOSE</button>
            </div>
            
            <style>
                .hsl-list-container::-webkit-scrollbar {
                    width: 6px;
                }
                .hsl-list-container::-webkit-scrollbar-track {
                    background: #222;
                    border-radius: 3px;
                }
                .hsl-list-container::-webkit-scrollbar-thumb {
                    background: #0ff;
                    border-radius: 3px;
                }
                .hsl-entry {
                    margin: 10px 0;
                    padding: 8px 12px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                .hsl-entry.highlight {
                    background: rgba(0, 255, 240, 0.15);
                    border: 1px solid #0ff;
                    animation: highlightPulse 1.5s ease-in-out infinite;
                }
                .hsl-entry.top3 {
                    background: rgba(255, 255, 0, 0.05);
                }
                @keyframes highlightPulse {
                    0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 240, 0.3); }
                    50% { box-shadow: 0 0 20px rgba(0, 255, 240, 0.6); }
                }
                .hsl-separator {
                    border-top: 1px dashed #444;
                    margin: 15px 0;
                    position: relative;
                }
                .hsl-separator-text {
                    position: absolute;
                    top: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.95);
                    padding: 0 10px;
                    color: #666;
                    font-size: 0.8em;
                }
            </style>
        `;
        
        document.body.appendChild(this.overlay);
    }

    _handleKey(e) {
        if (!this.isShowing) return;
        
        // Allow scrolling with arrow keys
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            const container = this.overlay.querySelector('.hsl-list-container');
            if (container) {
                const scrollAmount = e.key === 'ArrowUp' ? -50 : 50;
                container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            }
            return;
        }
        
        e.preventDefault();
        this.hide();
    }

    _pollGamepad() {
        if (!this.isShowing) return;
        
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of gamepads) {
            if (!gp) continue;
            
            const anyButton = gp.buttons.some(b => b.pressed);
            
            if (anyButton && !this._lastButtonState) {
                this.hide();
            }
            this._lastButtonState = anyButton;
            break;
        }
        
        this._gamepadPollId = requestAnimationFrame(() => this._pollGamepad());
    }

    _renderList(newPosition = -1) {
        const scores = this.manager.getTopScores(10);
        const listEl = this.overlay.querySelector(".hsl-list");
        const emptyEl = this.overlay.querySelector(".hsl-empty");
        const scrollHint = this.overlay.querySelector(".hsl-scroll-hint");
        
        if (scores.length === 0) {
            listEl.style.display = "none";
            emptyEl.style.display = "block";
            scrollHint.style.display = "none";
            return;
        }
        
        listEl.style.display = "block";
        emptyEl.style.display = "none";
        
        // Show scroll hint if many entries
        scrollHint.style.display = scores.length > 6 ? "block" : "none";
        
        let html = '';
        
        // Build the list
        scores.forEach((s, i) => {
            const pos = i + 1;
            const isHighlight = pos === newPosition;
            const isTop3 = pos <= 3;
            
            const posStr = pos.toString().padStart(2, " ");
            const name = s.name.padEnd(10, " ");
            const score = s.score.toLocaleString().padStart(10, " ");
            const lvl = s.level ? `L${s.level}` : '';
            
            // Color based on position
            let color;
            if (pos === 1) color = "#ffd700"; // Gold
            else if (pos === 2) color = "#c0c0c0"; // Silver
            else if (pos === 3) color = "#cd7f32"; // Bronze
            else if (isHighlight) color = "#0ff";
            else color = "#0ff";
            
            const classes = ['hsl-entry'];
            if (isHighlight) classes.push('highlight');
            if (isTop3) classes.push('top3');
            
            // Medal emoji for top 3
            let medal = '';
            if (pos === 1) medal = '🥇 ';
            else if (pos === 2) medal = '🥈 ';
            else if (pos === 3) medal = '🥉 ';
            
            html += `<div class="${classes.join(' ')}" style="color: ${color};">
                <span style="color: #888;">${posStr}.</span> ${medal}${name} ${score} <span style="color: #666;">${lvl}</span>
            </div>`;
        });
        
        listEl.innerHTML = html;
        
        // Scroll to highlighted entry
        if (newPosition > 0) {
            setTimeout(() => {
                const highlighted = listEl.querySelector('.highlight');
                if (highlighted) {
                    highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }

    show(onClose, newPosition = -1) {
        this.onClose = onClose;
        this.highlightPosition = newPosition;
        this._renderList(newPosition);
        
        // Setup close button handler
        const closeBtn = this.overlay.querySelector(".hsl-close-btn");
        closeBtn.onclick = () => this.hide();
        
        this.overlay.style.display = "flex";
        this.isShowing = true;
        
        window.addEventListener("keydown", this._boundKeyHandler);
        
        // Start gamepad polling
        this._lastButtonState = true; // Prevent immediate close
        this._pollGamepad();
    }

    hide() {
        this.overlay.style.display = "none";
        this.isShowing = false;
        
        window.removeEventListener("keydown", this._boundKeyHandler);
        
        if (this._gamepadPollId) {
            cancelAnimationFrame(this._gamepadPollId);
            this._gamepadPollId = null;
        }
        
        if (this.onClose) {
            this.onClose();
        }
    }
}