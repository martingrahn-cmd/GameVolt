// ============================================================
// Pause.js — Pause Menu with Options & Highscores
// ============================================================

export class PauseScreen {
    constructor() {
        this.element = null;
        this.onResume = null;
        this.onRestart = null;
        this.onMenu = null;
        this.onOptions = null;
        this.onHighscores = null;
        this.selectedIndex = 0;
        this.buttons = [];
    }

    show(onResume, onRestart, onMenu, onOptions, onHighscores) {
        if (this.element) return; // Already showing

        this.onResume = onResume;
        this.onRestart = onRestart;
        this.onMenu = onMenu;
        this.onOptions = onOptions;
        this.onHighscores = onHighscores;
        this.selectedIndex = 0;

        const div = document.createElement("div");
        div.id = "pauseScreen";
        div.innerHTML = `
            <div class="pause-container">
                <h1 class="pause-title">PAUSED</h1>
                
                <div class="pause-buttons">
                    <button class="pause-btn selected" data-action="resume">
                        RESUME
                        <span class="btn-hint">Press A / Enter</span>
                    </button>
                    <button class="pause-btn" data-action="restart">
                        RESTART
                    </button>
                    <button class="pause-btn" data-action="options">
                        OPTIONS
                    </button>
                    <button class="pause-btn" data-action="highscores">
                        HIGHSCORES
                    </button>
                    <button class="pause-btn" data-action="menu">
                        MAIN MENU
                        <span class="btn-hint">Press B / Esc</span>
                    </button>
                </div>
            </div>
        `;

        // Add styles if not present
        if (!document.getElementById("pauseStyles")) {
            const style = document.createElement("style");
            style.id = "pauseStyles";
            style.textContent = this._getStyles();
            document.head.appendChild(style);
        }

        document.body.appendChild(div);
        this.element = div;
        this.buttons = Array.from(div.querySelectorAll(".pause-btn"));

        // Button click handlers
        this.buttons.forEach((btn, index) => {
            btn.addEventListener("click", () => {
                this._handleAction(btn.dataset.action);
            });
            btn.addEventListener("mouseenter", () => {
                this._selectButton(index);
            });
        });

        // Animate in
        requestAnimationFrame(() => {
            div.classList.add("visible");
        });
    }

    // Handle gamepad/keyboard navigation
    handleAction(action) {
        if (!this.element) return false;

        if (action === "confirm") {
            const selectedBtn = this.buttons[this.selectedIndex];
            if (selectedBtn) {
                this._handleAction(selectedBtn.dataset.action);
            }
            return true;
        } else if (action === "back") {
            this._handleAction("resume");
            return true;
        }
        return false;
    }

    handleDirection(dir) {
        if (!this.element) return;

        if (dir === "up") {
            this._selectButton(this.selectedIndex - 1);
        } else if (dir === "down") {
            this._selectButton(this.selectedIndex + 1);
        }
    }

    _selectButton(index) {
        // Wrap around
        if (index < 0) index = this.buttons.length - 1;
        if (index >= this.buttons.length) index = 0;

        this.selectedIndex = index;
        this.buttons.forEach((btn, i) => {
            btn.classList.toggle("selected", i === index);
        });
        
        // Play menu click sound
        if (window.audioNeoSFX) window.audioNeoSFX.menuClick();
    }

    _handleAction(action) {
        if (!this.element) return;

        // For options/highscores, don't close pause - just trigger callback
        if (action === "options" && this.onOptions) {
            this.onOptions();
            return;
        }
        
        if (action === "highscores" && this.onHighscores) {
            this.onHighscores();
            return;
        }

        this.element.classList.remove("visible");
        
        setTimeout(() => {
            this.element.remove();
            this.element = null;
            
            if (action === "resume" && this.onResume) {
                this.onResume();
            } else if (action === "restart" && this.onRestart) {
                this.onRestart();
            } else if (action === "menu" && this.onMenu) {
                this.onMenu();
            }
        }, 200);
    }

    hide() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }

    isVisible() {
        return this.element !== null;
    }

    _getStyles() {
        return `
            #pauseScreen {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.2s ease, background 0.2s ease;
            }

            #pauseScreen.visible {
                opacity: 1;
                background: rgba(0, 0, 0, 0.75);
            }

            .pause-container {
                text-align: center;
                font-family: "Press Start 2P", monospace;
                color: #fff;
            }

            .pause-title {
                font-size: clamp(24px, 6vw, 40px);
                margin-bottom: 40px;
                color: #00fff0;
                text-shadow: 0 0 20px rgba(0, 255, 240, 0.6);
            }

            .pause-buttons {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .pause-btn {
                display: block;
                width: 240px;
                margin: 0 auto;
                padding: 12px 20px;
                font-family: "Press Start 2P", monospace;
                font-size: clamp(10px, 2.5vw, 12px);
                border: 2px solid rgba(255, 255, 255, 0.3);
                background: transparent;
                color: rgba(255, 255, 255, 0.6);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .pause-btn:hover,
            .pause-btn.selected {
                border-color: #00fff0;
                color: #00fff0;
                box-shadow: 0 0 15px rgba(0, 255, 240, 0.3);
            }

            .pause-btn .btn-hint {
                display: block;
                font-size: 8px;
                opacity: 0.5;
                margin-top: 6px;
            }
        `;
    }
}