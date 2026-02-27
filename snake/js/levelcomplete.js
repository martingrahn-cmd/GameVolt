// ============================================================
// LevelComplete.js — Level transition screen with ad slot
// ============================================================

export class LevelCompleteScreen {
    constructor() {
        this.overlay = null;
        this.isShowing = false;
        this.onContinue = null;
        
        // Animation state
        this.animTime = 0;
        this.phase = "intro"; // intro, stats, waiting, outro
        
        // Stats to display
        this.levelNum = 1;
        this.levelName = "";
        this.score = 0;
        this.foodEaten = 0;
        this.nextLevelNum = 2;
        this.nextLevelName = "";
        
        // Ad configuration
        this.adEnabled = false;
        this.adDuration = 3000; // ms to wait for ad
        this.adStartTime = 0;
        
        this._createOverlay();
    }

    _createOverlay() {
        this.overlay = document.createElement("div");
        this.overlay.id = "level-complete-overlay";
        this.overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Courier New', monospace;
            overflow: hidden;
        `;
        
        this.overlay.innerHTML = `
            <div class="lc-container" style="
                text-align: center;
                color: #0ff;
                transform: scale(0.8);
                opacity: 0;
                transition: all 0.5s ease-out;
            ">
                <div class="lc-complete" style="
                    font-size: 3em;
                    font-weight: bold;
                    text-shadow: 0 0 20px #0ff, 0 0 40px #0ff;
                    margin-bottom: 20px;
                    letter-spacing: 8px;
                ">LEVEL COMPLETE</div>
                
                <div class="lc-level-name" style="
                    font-size: 2em;
                    color: #ff00ff;
                    text-shadow: 0 0 15px #ff00ff;
                    margin-bottom: 40px;
                "></div>
                
                <div class="lc-stats" style="
                    font-size: 1.4em;
                    margin-bottom: 40px;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.5s ease-out 0.3s;
                ">
                    <div style="margin: 10px 0;">SCORE: <span class="lc-score" style="color: #0f0;">0</span></div>
                </div>
                
                <div class="lc-next" style="
                    font-size: 1.6em;
                    color: #ff0;
                    text-shadow: 0 0 15px #ff0;
                    margin-bottom: 30px;
                    opacity: 0;
                    transition: all 0.5s ease-out 0.6s;
                ">
                    NEXT: <span class="lc-next-name"></span>
                </div>
                
                <div class="lc-ad-slot" style="
                    width: 300px;
                    height: 250px;
                    margin: 20px auto;
                    background: rgba(50, 50, 50, 0.5);
                    border: 1px solid #333;
                    display: none;
                    justify-content: center;
                    align-items: center;
                    color: #666;
                    font-size: 0.9em;
                ">
                    <!-- Ad loads here -->
                    <span class="lc-ad-placeholder">AD SPACE</span>
                </div>
                
                <div class="lc-continue" style="
                    font-size: 1.2em;
                    color: #888;
                    opacity: 0;
                    transition: all 0.5s ease-out 0.9s;
                    animation: pulse 1.5s infinite;
                ">
                    <span class="lc-continue-text">PRESS ENTER TO CONTINUE</span>
                </div>
            </div>
            
            <style>
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
                
                @keyframes glow-cycle {
                    0% { text-shadow: 0 0 20px #0ff, 0 0 40px #0ff; }
                    33% { text-shadow: 0 0 20px #f0f, 0 0 40px #f0f; }
                    66% { text-shadow: 0 0 20px #ff0, 0 0 40px #ff0; }
                    100% { text-shadow: 0 0 20px #0ff, 0 0 40px #0ff; }
                }
                
                .lc-container.show {
                    transform: scale(1) !important;
                    opacity: 1 !important;
                }
                
                .lc-container.show .lc-stats,
                .lc-container.show .lc-next,
                .lc-container.show .lc-continue {
                    opacity: 1 !important;
                    transform: translateY(0) !important;
                }
                
                .lc-complete {
                    animation: glow-cycle 3s infinite;
                }
            </style>
        `;
        
        document.body.appendChild(this.overlay);
        
        // Input handlers
        this._boundKeyHandler = this._handleKey.bind(this);
        this._boundClickHandler = this._handleClick.bind(this);
        
        // Gamepad polling
        this._gamepadPollId = null;
        this._lastButtonState = false;
    }

    _handleKey(e) {
        if (!this.isShowing) return;
        
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this._continue();
        }
    }

    _handleClick() {
        if (!this.isShowing) return;
        this._continue();
    }

    _pollGamepad() {
        if (!this.isShowing) return;
        
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of gamepads) {
            if (!gp) continue;
            
            // A/X button (index 0) or Start button (index 9)
            const buttonPressed = gp.buttons[0]?.pressed || gp.buttons[9]?.pressed;
            
            // Only trigger on button down (not held)
            if (buttonPressed && !this._lastButtonState) {
                this._continue();
            }
            this._lastButtonState = buttonPressed;
            break;
        }
        
        this._gamepadPollId = requestAnimationFrame(() => this._pollGamepad());
    }

    _continue() {
        // If ad is showing, check if minimum time passed
        if (this.adEnabled && this.adStartTime > 0) {
            const elapsed = Date.now() - this.adStartTime;
            if (elapsed < this.adDuration) {
                // Still waiting for ad
                return;
            }
        }
        
        this.hide();
        if (this.onContinue) {
            this.onContinue();
        }
    }

    show(stats, onContinue) {
        this.levelNum = stats.levelNum || 1;
        this.levelName = stats.levelName || "Level";
        this.score = stats.score || 0;
        this.nextLevelNum = stats.nextLevelNum || this.levelNum + 1;
        this.nextLevelName = stats.nextLevelName || "Next Level";
        this.onContinue = onContinue;
        
        // Update content
        const container = this.overlay.querySelector(".lc-container");
        this.overlay.querySelector(".lc-level-name").textContent = `"${this.levelName}"`;
        this.overlay.querySelector(".lc-score").textContent = this.score.toLocaleString();
        this.overlay.querySelector(".lc-next-name").textContent = `"${this.nextLevelName}"`;
        
        // Show ad slot if enabled
        const adSlot = this.overlay.querySelector(".lc-ad-slot");
        if (this.adEnabled) {
            adSlot.style.display = "flex";
            this.adStartTime = Date.now();
            this._showAd();
            
            // Update continue text
            this.overlay.querySelector(".lc-continue-text").textContent = "LOADING...";
            
            // Allow continue after ad duration
            setTimeout(() => {
                this.overlay.querySelector(".lc-continue-text").textContent = "PRESS ENTER TO CONTINUE";
            }, this.adDuration);
        } else {
            adSlot.style.display = "none";
            this.overlay.querySelector(".lc-continue-text").textContent = "PRESS ENTER TO CONTINUE";
        }
        
        // Show overlay
        this.overlay.style.display = "flex";
        this.isShowing = true;
        
        // Trigger animation
        requestAnimationFrame(() => {
            container.classList.add("show");
        });
        
        // Add input listeners
        window.addEventListener("keydown", this._boundKeyHandler);
        this.overlay.addEventListener("click", this._boundClickHandler);
        
        // Start gamepad polling
        this._lastButtonState = false;
        this._pollGamepad();
    }

    hide() {
        const container = this.overlay.querySelector(".lc-container");
        container.classList.remove("show");
        
        setTimeout(() => {
            this.overlay.style.display = "none";
            this.isShowing = false;
        }, 300);
        
        // Remove input listeners
        window.removeEventListener("keydown", this._boundKeyHandler);
        this.overlay.removeEventListener("click", this._boundClickHandler);
        
        // Stop gamepad polling
        if (this._gamepadPollId) {
            cancelAnimationFrame(this._gamepadPollId);
            this._gamepadPollId = null;
        }
    }

    // --------------------------------------------------------
    // AD INTEGRATION
    // --------------------------------------------------------
    
    // Enable/disable ads
    setAdEnabled(enabled) {
        this.adEnabled = enabled;
    }
    
    // Set minimum ad display time
    setAdDuration(ms) {
        this.adDuration = ms;
    }
    
    // Override this to integrate real ads
    _showAd() {
        // Placeholder - integrate your ad SDK here
        // Example for AdSense, Unity Ads, etc:
        //
        // if (window.adsbygoogle) {
        //     (adsbygoogle = window.adsbygoogle || []).push({});
        // }
        //
        // For now, just show placeholder
        const placeholder = this.overlay.querySelector(".lc-ad-placeholder");
        if (placeholder) {
            placeholder.textContent = "AD SPACE";
        }
    }
    
    // Call this when ad finishes (for video ads)
    onAdComplete() {
        this.overlay.querySelector(".lc-continue-text").textContent = "PRESS ENTER TO CONTINUE";
    }
}