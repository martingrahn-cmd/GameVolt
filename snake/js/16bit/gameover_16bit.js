// ============================================================
// GameOver16bit.js — Stats-rich game over screen
// ============================================================

export class GameOver16bit {
    constructor() {
        this.overlay = null;
        this.onRestart = null;
        this.onMenu = null;
        this.selectedIndex = 0;
        this.buttons = [];
    }

    show(stats, onRestart, onMenu) {
        this.onRestart = onRestart;
        this.onMenu = onMenu;
        this.selectedIndex = 0;

        this._createOverlay(stats);
        this._setupEventListeners();
    }

    _createOverlay(stats) {
        this.overlay = document.createElement('div');
        this.overlay.id = 'gameover-16bit';
        
        // Format time
        const mins = Math.floor(stats.totalTimeSeconds / 60);
        const secs = stats.totalTimeSeconds % 60;
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        
        // Determine rank based on score
        const rank = this._getRank(stats.score);
        
        this.overlay.innerHTML = `
            <div class="go-backdrop"></div>
            <div class="go-container">
                <h1 class="go-title">GAME OVER</h1>
                
                <div class="go-rank">${rank.emoji} ${rank.name}</div>
                
                <div class="go-score-big">${stats.score.toLocaleString()}</div>
                <div class="go-score-label">TOTAL SCORE</div>
                
                <div class="go-stats">
                    <div class="go-stat">
                        <span class="go-stat-value">${stats.bestChain}</span>
                        <span class="go-stat-label">Best Chain</span>
                    </div>
                    <div class="go-stat">
                        <span class="go-stat-value">x${this._getMultiplierForChain(stats.bestChain)}</span>
                        <span class="go-stat-label">Max Multi</span>
                    </div>
                    <div class="go-stat">
                        <span class="go-stat-value">${stats.roundsCompleted}</span>
                        <span class="go-stat-label">Lock-ins</span>
                    </div>
                    <div class="go-stat">
                        <span class="go-stat-value">${stats.fruitsEaten}</span>
                        <span class="go-stat-label">Fruits</span>
                    </div>
                    <div class="go-stat">
                        <span class="go-stat-value">${stats.accuracy}%</span>
                        <span class="go-stat-label">Accuracy</span>
                    </div>
                    <div class="go-stat">
                        <span class="go-stat-value">${timeStr}</span>
                        <span class="go-stat-label">Time</span>
                    </div>
                </div>
                
                ${stats.totalLockInBonus > 0 ? `
                    <div class="go-bonus-info">
                        Lock-in Bonus: +${stats.totalLockInBonus.toLocaleString()}
                    </div>
                ` : ''}
                
                <div class="go-buttons">
                    <button class="go-btn selected" data-action="restart">
                        PLAY AGAIN
                    </button>
                    <button class="go-btn" data-action="menu">
                        MAIN MENU
                    </button>
                </div>
            </div>
        `;

        // Add styles
        if (!document.getElementById('gameover-16bit-styles')) {
            const style = document.createElement('style');
            style.id = 'gameover-16bit-styles';
            style.textContent = this._getStyles();
            document.head.appendChild(style);
        }

        document.body.appendChild(this.overlay);
        
        // Animate in
        requestAnimationFrame(() => {
            this.overlay.classList.add('visible');
        });

        this.buttons = Array.from(this.overlay.querySelectorAll('.go-btn'));
    }

    _getRank(score) {
        if (score >= 10000) return { emoji: '👑', name: 'FRUIT KING' };
        if (score >= 5000) return { emoji: '🔥', name: 'CHAIN MASTER' };
        if (score >= 2500) return { emoji: '⭐', name: 'PRO EATER' };
        if (score >= 1000) return { emoji: '🍎', name: 'FRUIT LOVER' };
        if (score >= 500) return { emoji: '🌱', name: 'BEGINNER' };
        return { emoji: '🐣', name: 'FIRST BITE' };
    }

    _getMultiplierForChain(chain) {
        if (chain >= 25) return 6;
        if (chain >= 20) return 5;
        if (chain >= 15) return 4;
        if (chain >= 10) return 3;
        if (chain >= 5) return 2;
        return 1;
    }

    _setupEventListeners() {
        // Button clicks
        this.buttons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this._handleAction(btn.dataset.action);
            });
            btn.addEventListener('mouseenter', () => {
                this._selectButton(index);
            });
        });

        // Keyboard
        this._keyHandler = (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                e.preventDefault();
                this._selectButton(this.selectedIndex - 1);
            }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                e.preventDefault();
                this._selectButton(this.selectedIndex + 1);
            }
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._handleAction(this.buttons[this.selectedIndex].dataset.action);
            }
        };
        window.addEventListener('keydown', this._keyHandler);

        // Gamepad polling
        this._startGamepadPolling();
    }

    _selectButton(index) {
        if (index < 0) index = this.buttons.length - 1;
        if (index >= this.buttons.length) index = 0;
        
        this.selectedIndex = index;
        this.buttons.forEach((btn, i) => {
            btn.classList.toggle('selected', i === index);
        });
        
        if (window.audioNeoSFX) window.audioNeoSFX.menuClick();
    }

    _handleAction(action) {
        this._cleanup();
        
        if (action === 'restart' && this.onRestart) {
            this.onRestart();
        } else if (action === 'menu' && this.onMenu) {
            this.onMenu();
        }
    }

    _startGamepadPolling() {
        this._lastGamepadState = { up: false, down: false, confirm: false };
        
        const poll = () => {
            if (!this.overlay) return;
            
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            
            for (const gp of gamepads) {
                if (!gp) continue;
                
                const state = {
                    up: gp.buttons[12]?.pressed || gp.axes[1] < -0.5,
                    down: gp.buttons[13]?.pressed || gp.axes[1] > 0.5,
                    confirm: gp.buttons[0]?.pressed
                };
                
                if (state.up && !this._lastGamepadState.up) {
                    this._selectButton(this.selectedIndex - 1);
                }
                if (state.down && !this._lastGamepadState.down) {
                    this._selectButton(this.selectedIndex + 1);
                }
                if (state.confirm && !this._lastGamepadState.confirm) {
                    this._handleAction(this.buttons[this.selectedIndex].dataset.action);
                }
                
                this._lastGamepadState = state;
                break;
            }
            
            this._gamepadPollId = requestAnimationFrame(poll);
        };
        
        poll();
    }

    _cleanup() {
        window.removeEventListener('keydown', this._keyHandler);
        
        if (this._gamepadPollId) {
            cancelAnimationFrame(this._gamepadPollId);
        }
        
        if (this.overlay) {
            this.overlay.classList.remove('visible');
            setTimeout(() => {
                this.overlay.remove();
                this.overlay = null;
            }, 300);
        }
    }

    hide() {
        this._cleanup();
    }

    handleDirection(dir) {
        if (dir === 'up') this._selectButton(this.selectedIndex - 1);
        if (dir === 'down') this._selectButton(this.selectedIndex + 1);
    }

    handleAction(action) {
        if (action === 'confirm') {
            this._handleAction(this.buttons[this.selectedIndex].dataset.action);
            return true;
        }
        return false;
    }

    _getStyles() {
        return `
            #gameover-16bit {
                position: fixed;
                inset: 0;
                z-index: 15000;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'Press Start 2P', monospace;
                opacity: 0;
                transition: opacity 0.3s;
            }
            
            #gameover-16bit.visible {
                opacity: 1;
            }
            
            .go-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
            }
            
            .go-container {
                position: relative;
                text-align: center;
                padding: 30px;
                max-width: 95%;
                width: 450px;
            }
            
            .go-title {
                font-size: clamp(24px, 6vw, 36px);
                color: #ff4444;
                margin: 0 0 10px 0;
                text-shadow: 0 0 20px rgba(255, 68, 68, 0.8);
                animation: go-pulse 1s ease-in-out infinite alternate;
            }
            
            @keyframes go-pulse {
                from { text-shadow: 0 0 20px rgba(255, 68, 68, 0.8); }
                to { text-shadow: 0 0 40px rgba(255, 68, 68, 1); }
            }
            
            .go-rank {
                font-size: clamp(12px, 3vw, 16px);
                color: #ffff44;
                margin-bottom: 20px;
            }
            
            .go-score-big {
                font-size: clamp(32px, 8vw, 48px);
                color: #44ffff;
                text-shadow: 0 0 20px rgba(68, 255, 255, 0.8);
                margin-bottom: 5px;
            }
            
            .go-score-label {
                font-size: 10px;
                color: #888;
                margin-bottom: 25px;
            }
            
            .go-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .go-stat {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 12px 8px;
            }
            
            .go-stat-value {
                display: block;
                font-size: clamp(14px, 4vw, 18px);
                color: #fff;
                margin-bottom: 5px;
            }
            
            .go-stat-label {
                display: block;
                font-size: 7px;
                color: #888;
            }
            
            .go-bonus-info {
                font-size: 10px;
                color: #44ff88;
                margin-bottom: 20px;
            }
            
            .go-buttons {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .go-btn {
                font-family: 'Press Start 2P', monospace;
                font-size: clamp(10px, 2.5vw, 12px);
                padding: 14px 24px;
                border: 2px solid #444;
                background: transparent;
                color: #888;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .go-btn:hover,
            .go-btn.selected {
                border-color: #44ffff;
                color: #44ffff;
                box-shadow: 0 0 15px rgba(68, 255, 255, 0.3);
            }
            
            @media (max-width: 400px) {
                .go-stats {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
        `;
    }
}