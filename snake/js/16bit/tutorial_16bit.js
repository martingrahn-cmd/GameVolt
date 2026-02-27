// ============================================================
// Tutorial16bit.js — First-time player tutorial
// ============================================================

export class Tutorial16bit {
    constructor() {
        this.storageKey = 'snake16bit_tutorialSeen';
        this.overlay = null;
        this.currentStep = 0;
        this.onComplete = null;
        
        this.steps = [
            {
                title: "🍎 FRUIT CHAIN",
                text: "Eat fruits in the correct order!\nFollow the queue at the top of the screen.",
                highlight: "queue"
            },
            {
                title: "✅ RIGHT FRUIT",
                text: "The correct fruit GLOWS!\nEat it to build your chain.",
                highlight: "fruit"
            },
            {
                title: "❌ WRONG FRUIT",
                text: "Eat the wrong fruit?\nChain resets and you lose points!",
                highlight: null
            },
            {
                title: "⭐ MULTIPLIER",
                text: "Chain 5 = x2 points\nChain 10 = x3 points\n...up to x6 FEVER!",
                highlight: "multiplier"
            },
            {
                title: "🔒 LOCK-IN ZONE",
                text: "Pass through the center to\nLOCK your bonus and start fresh!\n(Requires at least x2)",
                highlight: "lockin"
            },
            {
                title: "⚡ SPEED UP",
                text: "Higher chain = faster snake!\nEach round gets harder too.",
                highlight: null
            },
            {
                title: "🎮 READY?",
                text: "Swipe or use D-pad to move.\nGood luck!",
                highlight: null
            }
        ];
    }

    // Check if tutorial should be shown
    shouldShow() {
        return !localStorage.getItem(this.storageKey);
    }

    // Mark tutorial as seen
    markAsSeen() {
        localStorage.setItem(this.storageKey, 'true');
    }

    // Reset tutorial (for testing)
    resetTutorial() {
        localStorage.removeItem(this.storageKey);
    }

    // Show the tutorial
    show(onComplete) {
        if (!this.shouldShow()) {
            if (onComplete) onComplete();
            return;
        }

        this.onComplete = onComplete;
        this.currentStep = 0;
        this._createOverlay();
        this._showStep(0);
    }

    _createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorial-16bit';
        this.overlay.innerHTML = `
            <div class="tutorial-backdrop"></div>
            <div class="tutorial-card">
                <div class="tutorial-step-indicator"></div>
                <h2 class="tutorial-title"></h2>
                <p class="tutorial-text"></p>
                <div class="tutorial-buttons">
                    <button class="tutorial-skip">Skip</button>
                    <button class="tutorial-next">Next</button>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #tutorial-16bit {
                position: fixed;
                inset: 0;
                z-index: 20000;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'Press Start 2P', monospace;
            }
            
            .tutorial-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.85);
            }
            
            .tutorial-card {
                position: relative;
                background: linear-gradient(180deg, #1a3a5c 0%, #0f2a4a 100%);
                border: 4px solid #4a9fff;
                border-radius: 16px;
                padding: 30px 40px;
                max-width: 90%;
                width: 400px;
                text-align: center;
                box-shadow: 0 0 30px rgba(74, 159, 255, 0.5);
                animation: tutorial-pop 0.3s ease-out;
            }
            
            @keyframes tutorial-pop {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            
            .tutorial-step-indicator {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin-bottom: 20px;
            }
            
            .tutorial-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #2a5a8f;
                transition: all 0.3s;
            }
            
            .tutorial-dot.active {
                background: #4a9fff;
                box-shadow: 0 0 10px #4a9fff;
            }
            
            .tutorial-dot.done {
                background: #44ff88;
            }
            
            .tutorial-title {
                color: #ffff44;
                font-size: 18px;
                margin: 0 0 20px 0;
                text-shadow: 0 0 10px rgba(255, 255, 68, 0.5);
            }
            
            .tutorial-text {
                color: #fff;
                font-size: 11px;
                line-height: 1.8;
                margin: 0 0 25px 0;
                white-space: pre-line;
            }
            
            .tutorial-buttons {
                display: flex;
                justify-content: center;
                gap: 15px;
            }
            
            .tutorial-skip,
            .tutorial-next {
                font-family: 'Press Start 2P', monospace;
                font-size: 10px;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .tutorial-skip {
                background: transparent;
                color: #888;
                border: 2px solid #444;
            }
            
            .tutorial-skip:hover {
                border-color: #888;
                color: #aaa;
            }
            
            .tutorial-next {
                background: linear-gradient(180deg, #44ff88 0%, #22aa55 100%);
                color: #000;
                border: 2px solid #44ff88;
            }
            
            .tutorial-next:hover {
                transform: scale(1.05);
                box-shadow: 0 0 15px rgba(68, 255, 136, 0.5);
            }
            
            @media (max-width: 500px) {
                .tutorial-card {
                    padding: 20px;
                    width: 95%;
                }
                
                .tutorial-title {
                    font-size: 14px;
                }
                
                .tutorial-text {
                    font-size: 9px;
                }
                
                .tutorial-skip,
                .tutorial-next {
                    font-size: 8px;
                    padding: 10px 16px;
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(this.overlay);

        // Event listeners
        this.overlay.querySelector('.tutorial-skip').addEventListener('click', () => {
            if (window.audioNeoSFX) window.audioNeoSFX.click();
            this._complete();
        });
        this.overlay.querySelector('.tutorial-next').addEventListener('click', () => {
            if (window.audioNeoSFX) window.audioNeoSFX.click();
            this._nextStep();
        });
        
        // Keyboard/gamepad support
        this._keyHandler = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (window.audioNeoSFX) window.audioNeoSFX.click();
                this._nextStep();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                if (window.audioNeoSFX) window.audioNeoSFX.click();
                this._complete();
            }
        };
        window.addEventListener('keydown', this._keyHandler);

        // Touch support - tap anywhere to advance
        this.overlay.querySelector('.tutorial-card').addEventListener('click', (e) => {
            if (!e.target.classList.contains('tutorial-skip')) {
                // Don't advance if clicking skip button
            }
        });
    }

    _showStep(index) {
        const step = this.steps[index];
        
        this.overlay.querySelector('.tutorial-title').textContent = step.title;
        this.overlay.querySelector('.tutorial-text').textContent = step.text;
        
        // Update dots
        const indicator = this.overlay.querySelector('.tutorial-step-indicator');
        indicator.innerHTML = this.steps.map((_, i) => {
            let className = 'tutorial-dot';
            if (i < index) className += ' done';
            if (i === index) className += ' active';
            return `<div class="${className}"></div>`;
        }).join('');
        
        // Update button text
        const nextBtn = this.overlay.querySelector('.tutorial-next');
        nextBtn.textContent = index === this.steps.length - 1 ? "LET'S GO!" : "Next";
    }

    _nextStep() {
        this.currentStep++;
        
        if (this.currentStep >= this.steps.length) {
            this._complete();
        } else {
            this._showStep(this.currentStep);
        }
    }

    _complete() {
        this.markAsSeen();
        
        window.removeEventListener('keydown', this._keyHandler);
        
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            this.overlay.style.transition = 'opacity 0.3s';
            
            setTimeout(() => {
                this.overlay.remove();
                this.overlay = null;
                
                if (this.onComplete) {
                    this.onComplete();
                }
            }, 300);
        }
    }

    // Hide tutorial if showing
    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        window.removeEventListener('keydown', this._keyHandler);
    }
}