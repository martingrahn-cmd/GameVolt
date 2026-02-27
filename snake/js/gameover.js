// ============================================================
// GameOver.js — Game Over Screen with Continue (Rewarded Ad)
// ============================================================

export class GameOverScreen {
    constructor() {
        this.element = null;
        this.onRestart = null;
        this.onMenu = null;
        this.onContinue = null;
        this.selectedIndex = 0;
        this.buttons = [];
        this.continueUsed = false; // Track if continue was used this session
        
        // Ad configuration
        this.adEnabled = true; // Set to true when ad SDK is ready
        this.isShowingAd = false;
    }

    show(stats, onRestart, onMenu, onContinue) {
        this.onRestart = onRestart;
        this.onMenu = onMenu;
        this.onContinue = onContinue;
        this.selectedIndex = 0;

        const canContinue = !this.continueUsed && onContinue;

        // Create overlay
        const div = document.createElement("div");
        div.id = "gameOverScreen";
        div.innerHTML = `
            <div class="gameover-container">
                <h1 class="gameover-title glitch" data-text="GAME OVER">GAME OVER</h1>
                
                <div class="gameover-stats">
                    <div class="stat-row">
                        <span class="stat-label">SCORE</span>
                        <span class="stat-value score-value">${stats.score.toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">LEVEL</span>
                        <span class="stat-value">${stats.levelsCompleted + 1}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">FOOD</span>
                        <span class="stat-value">${stats.foodEaten}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">MAX COMBO</span>
                        <span class="stat-value">${stats.maxCombo > 0 ? (1 + stats.maxCombo * 0.5).toFixed(1) + 'x' : '-'}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">TIME</span>
                        <span class="stat-value">${this._formatTime(stats.totalTimeSeconds)}</span>
                    </div>
                </div>

                <div class="gameover-buttons">
                    ${canContinue ? `
                    <button class="gameover-btn continue" data-action="continue">
                        <span class="btn-icon">▶</span>
                        CONTINUE
                        <span class="btn-hint">Watch Ad · Score Reset</span>
                    </button>
                    ` : ''}
                    <button class="gameover-btn primary" data-action="restart">
                        PLAY AGAIN
                        <span class="btn-hint">Enter / A</span>
                    </button>
                    <button class="gameover-btn secondary" data-action="menu">
                        MAIN MENU
                        <span class="btn-hint">Esc / B</span>
                    </button>
                </div>
            </div>
        `;

        // Add styles if not present
        if (!document.getElementById("gameOverStyles")) {
            const style = document.createElement("style");
            style.id = "gameOverStyles";
            style.textContent = this._getStyles();
            document.head.appendChild(style);
        }

        document.body.appendChild(div);
        this.element = div;
        this.buttons = Array.from(div.querySelectorAll(".gameover-btn"));

        // Button handlers
        this.buttons.forEach((btn, index) => {
            btn.addEventListener("click", () => {
                this._handleAction(btn.dataset.action);
            });
            btn.addEventListener("mouseenter", () => {
                this._selectButton(index);
            });
        });

        // Highlight first button
        this._selectButton(0);

        // Animate in
        requestAnimationFrame(() => {
            div.classList.add("visible");
        });
    }

    _selectButton(index) {
        if (index < 0) index = this.buttons.length - 1;
        if (index >= this.buttons.length) index = 0;
        
        this.selectedIndex = index;
        this.buttons.forEach((btn, i) => {
            btn.classList.toggle("selected", i === index);
        });
        
        // Play menu click sound
        if (window.audioNeoSFX) window.audioNeoSFX.menuClick();
    }

    // Handle gamepad/keyboard actions from Input class
    handleAction(action) {
        if (!this.element || this.isShowingAd) return;
        
        if (action === "confirm") {
            const btn = this.buttons[this.selectedIndex];
            if (btn) {
                this._handleAction(btn.dataset.action);
            }
        } else if (action === "back") {
            this._handleAction("menu");
        }
    }

    // Handle direction input for navigation
    handleDirection(dir) {
        if (!this.element || this.isShowingAd) return;
        
        if (dir === "up") {
            this._selectButton(this.selectedIndex - 1);
        } else if (dir === "down") {
            this._selectButton(this.selectedIndex + 1);
        }
    }

    _handleAction(action) {
        if (!this.element) return;

        if (action === "continue") {
            this._showRewardedAd();
            return;
        }

        this.element.classList.remove("visible");
        
        setTimeout(() => {
            this.element.remove();
            this.element = null;
            
            if (action === "restart" && this.onRestart) {
                this.onRestart();
            } else if (action === "menu" && this.onMenu) {
                this.onMenu();
            }
        }, 300);
    }

    // --------------------------------------------------------
    // REWARDED AD FOR CONTINUE
    // --------------------------------------------------------
    
    _showRewardedAd() {
        this.isShowingAd = true;
        
        // Update button to show loading
        const continueBtn = this.element.querySelector('[data-action="continue"]');
        if (continueBtn) {
            continueBtn.innerHTML = `
                <span class="btn-loading">LOADING AD...</span>
            `;
            continueBtn.classList.add("loading");
        }
        
        // TODO: Replace with real ad SDK
        // Example for AdMob/Unity Ads:
        // if (window.adSDK && window.adSDK.showRewardedAd) {
        //     window.adSDK.showRewardedAd({
        //         onRewarded: () => this._onAdComplete(true),
        //         onClosed: () => this._onAdComplete(false),
        //         onError: () => this._onAdComplete(false)
        //     });
        // }
        
        // Simulate ad (remove this when real ads are integrated)
        this._simulateAd();
    }

    _simulateAd() {
        // Simulate watching an ad (1.5 seconds)
        // Replace this with real ad SDK integration
        setTimeout(() => {
            this._onAdComplete(true);
        }, 1500);
    }

    _onAdComplete(rewarded) {
        this.isShowingAd = false;
        
        if (rewarded && this.onContinue) {
            this.continueUsed = true;
            
            this.element.classList.remove("visible");
            
            setTimeout(() => {
                this.element.remove();
                this.element = null;
                this.onContinue();
            }, 300);
        } else {
            // Ad was skipped or failed - restore button
            const continueBtn = this.element.querySelector('[data-action="continue"]');
            if (continueBtn) {
                continueBtn.innerHTML = `
                    <span class="btn-icon">▶</span>
                    CONTINUE
                    <span class="btn-hint">Watch Ad · Score Reset</span>
                `;
                continueBtn.classList.remove("loading");
            }
        }
    }

    // Reset continue availability (call at game start)
    resetContinue() {
        this.continueUsed = false;
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

    _formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    _getStyles() {
        return `
            #gameOverScreen {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease, background 0.3s ease;
            }

            #gameOverScreen.visible {
                opacity: 1;
                background: rgba(0, 0, 0, 0.85);
            }

            .gameover-container {
                text-align: center;
                font-family: "Press Start 2P", monospace;
                color: #fff;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            #gameOverScreen.visible .gameover-container {
                transform: scale(1);
            }

            .gameover-title {
                font-size: clamp(24px, 6vw, 48px);
                margin-bottom: 30px;
                color: #ff1dac;
                text-shadow: 0 0 20px rgba(255, 29, 172, 0.8),
                             0 0 40px rgba(255, 29, 172, 0.4);
            }

            /* Glitch effect */
            .glitch {
                position: relative;
                animation: glitch-skew 1s infinite linear alternate-reverse;
            }

            .glitch::before,
            .glitch::after {
                content: attr(data-text);
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }

            .glitch::before {
                left: 2px;
                text-shadow: -2px 0 #0ff;
                clip: rect(44px, 450px, 56px, 0);
                animation: glitch-anim 5s infinite linear alternate-reverse;
            }

            .glitch::after {
                left: -2px;
                text-shadow: -2px 0 #f0f;
                clip: rect(44px, 450px, 56px, 0);
                animation: glitch-anim2 5s infinite linear alternate-reverse;
            }

            @keyframes glitch-anim {
                0% { clip: rect(10px, 9999px, 31px, 0); transform: skew(0.5deg); }
                5% { clip: rect(70px, 9999px, 71px, 0); transform: skew(0.4deg); }
                10% { clip: rect(40px, 9999px, 51px, 0); transform: skew(0.5deg); }
                15% { clip: rect(20px, 9999px, 91px, 0); transform: skew(0.3deg); }
                20% { clip: rect(60px, 9999px, 61px, 0); transform: skew(0.1deg); }
                25% { clip: rect(30px, 9999px, 81px, 0); transform: skew(0.6deg); }
                30% { clip: rect(10px, 9999px, 21px, 0); transform: skew(0.2deg); }
                35% { clip: rect(50px, 9999px, 71px, 0); transform: skew(0.4deg); }
                40% { clip: rect(80px, 9999px, 91px, 0); transform: skew(0.5deg); }
                45% { clip: rect(5px, 9999px, 41px, 0); transform: skew(0.1deg); }
                50% { clip: rect(35px, 9999px, 56px, 0); transform: skew(0.3deg); }
                55% { clip: rect(65px, 9999px, 76px, 0); transform: skew(0.6deg); }
                60% { clip: rect(15px, 9999px, 36px, 0); transform: skew(0.2deg); }
                65% { clip: rect(45px, 9999px, 66px, 0); transform: skew(0.4deg); }
                70% { clip: rect(75px, 9999px, 86px, 0); transform: skew(0.5deg); }
                75% { clip: rect(25px, 9999px, 46px, 0); transform: skew(0.1deg); }
                80% { clip: rect(55px, 9999px, 76px, 0); transform: skew(0.3deg); }
                85% { clip: rect(5px, 9999px, 26px, 0); transform: skew(0.6deg); }
                90% { clip: rect(85px, 9999px, 96px, 0); transform: skew(0.2deg); }
                95% { clip: rect(35px, 9999px, 56px, 0); transform: skew(0.4deg); }
                100% { clip: rect(67px, 9999px, 78px, 0); transform: skew(0.5deg); }
            }

            @keyframes glitch-anim2 {
                0% { clip: rect(65px, 9999px, 76px, 0); transform: skew(0.3deg); }
                5% { clip: rect(25px, 9999px, 36px, 0); transform: skew(0.5deg); }
                10% { clip: rect(85px, 9999px, 96px, 0); transform: skew(0.1deg); }
                15% { clip: rect(45px, 9999px, 56px, 0); transform: skew(0.4deg); }
                20% { clip: rect(5px, 9999px, 16px, 0); transform: skew(0.6deg); }
                25% { clip: rect(75px, 9999px, 86px, 0); transform: skew(0.2deg); }
                30% { clip: rect(35px, 9999px, 46px, 0); transform: skew(0.5deg); }
                35% { clip: rect(95px, 9999px, 100px, 0); transform: skew(0.1deg); }
                40% { clip: rect(15px, 9999px, 26px, 0); transform: skew(0.3deg); }
                45% { clip: rect(55px, 9999px, 66px, 0); transform: skew(0.6deg); }
                50% { clip: rect(10px, 9999px, 21px, 0); transform: skew(0.4deg); }
                55% { clip: rect(70px, 9999px, 81px, 0); transform: skew(0.2deg); }
                60% { clip: rect(30px, 9999px, 41px, 0); transform: skew(0.5deg); }
                65% { clip: rect(90px, 9999px, 100px, 0); transform: skew(0.1deg); }
                70% { clip: rect(50px, 9999px, 61px, 0); transform: skew(0.3deg); }
                75% { clip: rect(20px, 9999px, 31px, 0); transform: skew(0.6deg); }
                80% { clip: rect(80px, 9999px, 91px, 0); transform: skew(0.4deg); }
                85% { clip: rect(40px, 9999px, 51px, 0); transform: skew(0.2deg); }
                90% { clip: rect(60px, 9999px, 71px, 0); transform: skew(0.5deg); }
                95% { clip: rect(0px, 9999px, 11px, 0); transform: skew(0.1deg); }
                100% { clip: rect(42px, 9999px, 53px, 0); transform: skew(0.3deg); }
            }

            @keyframes glitch-skew {
                0% { transform: skew(0deg); }
                20% { transform: skew(0deg); }
                21% { transform: skew(1deg); }
                22% { transform: skew(-1deg); }
                23% { transform: skew(0deg); }
                100% { transform: skew(0deg); }
            }

            .gameover-stats {
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid rgba(0, 255, 240, 0.3);
                border-radius: 10px;
                padding: 20px 30px;
                margin-bottom: 30px;
            }

            .stat-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                font-size: clamp(10px, 2.5vw, 14px);
            }

            .stat-label {
                color: rgba(255, 255, 255, 0.6);
            }

            .stat-value {
                color: #00fff0;
                text-shadow: 0 0 10px rgba(0, 255, 240, 0.5);
            }

            .stat-value.score-value {
                font-size: clamp(14px, 3.5vw, 20px);
                color: #fff;
            }

            .gameover-buttons {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .gameover-btn {
                display: block;
                width: 280px;
                margin: 0 auto;
                padding: 16px 20px;
                font-family: "Press Start 2P", monospace;
                font-size: clamp(10px, 2.5vw, 14px);
                border: 2px solid;
                background: transparent;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .gameover-btn.continue {
                border-color: #ff0;
                color: #ff0;
                position: relative;
                overflow: hidden;
            }

            .gameover-btn.continue::before {
                content: "";
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 0, 0.2), transparent);
                animation: shimmer 2s infinite;
            }

            @keyframes shimmer {
                100% { left: 100%; }
            }

            .gameover-btn.continue:hover,
            .gameover-btn.continue.selected {
                background: #ff0;
                color: #000;
                box-shadow: 0 0 30px rgba(255, 255, 0, 0.6);
            }

            .gameover-btn.continue .btn-icon {
                display: inline-block;
                margin-right: 8px;
                animation: pulse-icon 1s infinite;
            }

            @keyframes pulse-icon {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }

            .gameover-btn.continue.loading {
                pointer-events: none;
                opacity: 0.7;
            }

            .gameover-btn.continue.loading::before {
                display: none;
            }

            .btn-loading {
                animation: blink 0.5s infinite;
            }

            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.5; }
            }

            .gameover-btn.primary {
                border-color: #00fff0;
                color: #00fff0;
            }

            .gameover-btn.primary:hover,
            .gameover-btn.primary.selected {
                background: #00fff0;
                color: #000;
                box-shadow: 0 0 20px rgba(0, 255, 240, 0.5);
            }

            .gameover-btn.secondary {
                border-color: rgba(255, 255, 255, 0.5);
                color: rgba(255, 255, 255, 0.7);
            }

            .gameover-btn.secondary:hover,
            .gameover-btn.secondary.selected {
                border-color: #fff;
                color: #fff;
                background: rgba(255, 255, 255, 0.1);
            }

            .btn-hint {
                display: block;
                font-size: 8px;
                opacity: 0.5;
                margin-top: 6px;
            }
        `;
    }
}