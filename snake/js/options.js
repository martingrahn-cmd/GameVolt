// ============================================================
// Options.js — Settings menu
// ============================================================

export class OptionsScreen {
    constructor() {
        this.overlay = null;
        this.isShowing = false;
        this.selectedIndex = 0;
        
        // Settings (will be loaded/saved)
        this.settings = {
            backgroundEffects: true,
            soundEffects: true,
            music: true
        };
        
        // Callbacks
        this.onClose = null;
        this.onSettingChange = null;
        
        // Menu items
        this.menuItems = [
            { key: "backgroundEffects", label: "BACKGROUND EFFECTS" },
            { key: "soundEffects", label: "SOUND EFFECTS" },
            { key: "music", label: "MUSIC" },
            { key: "back", label: "BACK", isAction: true }
        ];
        
        this._createOverlay();
        
        // Input
        this._boundKeyHandler = this._handleKey.bind(this);
        this._gamepadPollId = null;
        this._lastDpadState = { up: false, down: false, a: false, b: false };
    }

    _createOverlay() {
        this.overlay = document.createElement("div");
        this.overlay.id = "options-overlay";
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
            <div class="options-container" style="
                text-align: center;
                color: #0ff;
            ">
                <div class="options-title" style="
                    font-size: 2.5em;
                    font-weight: bold;
                    text-shadow: 0 0 20px #0ff, 0 0 40px #0ff;
                    margin-bottom: 50px;
                    letter-spacing: 6px;
                ">OPTIONS</div>
                
                <div class="options-menu" style="
                    font-size: 1.4em;
                "></div>
                
                <div class="options-hint" style="
                    margin-top: 50px;
                    font-size: 0.9em;
                    color: #666;
                ">↑↓ SELECT · ENTER/SPACE TOGGLE · ESC BACK</div>
            </div>
        `;
        
        document.body.appendChild(this.overlay);
    }

    _renderMenu() {
        const menuEl = this.overlay.querySelector(".options-menu");
        menuEl.innerHTML = "";
        
        this.menuItems.forEach((item, index) => {
            const row = document.createElement("div");
            row.style.cssText = `
                padding: 15px 40px;
                margin: 8px 0;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                justify-content: space-between;
                align-items: center;
                min-width: 350px;
            `;
            
            if (index === this.selectedIndex) {
                row.style.background = "rgba(0, 255, 255, 0.15)";
                row.style.color = "#0ff";
                row.style.textShadow = "0 0 10px #0ff";
            } else {
                row.style.color = "#888";
            }
            
            const label = document.createElement("span");
            label.textContent = item.label;
            row.appendChild(label);
            
            if (!item.isAction) {
                const value = document.createElement("span");
                const isOn = this.settings[item.key];
                value.textContent = isOn ? "ON" : "OFF";
                value.style.color = isOn ? "#0f0" : "#f00";
                value.style.textShadow = isOn ? "0 0 10px #0f0" : "0 0 10px #f00";
                row.appendChild(value);
            }
            
            row.addEventListener("click", () => {
                this.selectedIndex = index;
                this._selectItem();
            });
            
            menuEl.appendChild(row);
        });
    }

    _handleKey(e) {
        if (!this.isShowing) return;
        
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
            if (window.audioNeoSFX) window.audioNeoSFX.menuClick();
            this._renderMenu();
        }
        
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
            if (window.audioNeoSFX) window.audioNeoSFX.menuClick();
            this._renderMenu();
        }
        
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (window.audioNeoSFX) window.audioNeoSFX.menuClick();
            this._selectItem();
        }
        
        if (e.key === "Escape") {
            e.preventDefault();
            this.hide();
        }
    }

    _selectItem() {
        const item = this.menuItems[this.selectedIndex];
        
        // Play click sound
        if (window.audioNeoSFX) window.audioNeoSFX.click();
        
        if (item.key === "back") {
            this.hide();
            return;
        }
        
        // Toggle setting
        this.settings[item.key] = !this.settings[item.key];
        this._renderMenu();
        
        // Notify listener
        if (this.onSettingChange) {
            this.onSettingChange(item.key, this.settings[item.key]);
        }
        
        // Save to localStorage
        this._saveSettings();
    }

    _pollGamepad() {
        if (!this.isShowing) return;
        
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of gamepads) {
            if (!gp) continue;
            
            // D-pad
            const up = gp.buttons[12]?.pressed || gp.axes[1] < -0.5;
            const down = gp.buttons[13]?.pressed || gp.axes[1] > 0.5;
            const a = gp.buttons[0]?.pressed;
            const b = gp.buttons[1]?.pressed;
            
            // Up
            if (up && !this._lastDpadState.up) {
                this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
                this._renderMenu();
            }
            
            // Down
            if (down && !this._lastDpadState.down) {
                this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
                this._renderMenu();
            }
            
            // A = Select/Toggle
            if (a && !this._lastDpadState.a) {
                this._selectItem();
            }
            
            // B = Back
            if (b && !this._lastDpadState.b) {
                this.hide();
            }
            
            this._lastDpadState = { up, down, a, b };
            break;
        }
        
        this._gamepadPollId = requestAnimationFrame(() => this._pollGamepad());
    }

    show(onClose, onSettingChange) {
        this.onClose = onClose;
        this.onSettingChange = onSettingChange;
        this.selectedIndex = 0;
        
        // Load settings
        this._loadSettings();
        
        this._renderMenu();
        
        this.overlay.style.display = "flex";
        this.isShowing = true;
        
        window.addEventListener("keydown", this._boundKeyHandler);
        
        // Start gamepad polling
        this._lastDpadState = { up: false, down: false, a: false, b: false };
        this._pollGamepad();
    }

    hide() {
        this.overlay.style.display = "none";
        this.isShowing = false;
        
        window.removeEventListener("keydown", this._boundKeyHandler);
        
        // Stop gamepad polling
        if (this._gamepadPollId) {
            cancelAnimationFrame(this._gamepadPollId);
            this._gamepadPollId = null;
        }
        
        if (this.onClose) {
            this.onClose();
        }
    }

    // --------------------------------------------------------
    // SETTINGS PERSISTENCE
    // --------------------------------------------------------
    
    _saveSettings() {
        try {
            localStorage.setItem("snakeNeoOptions", JSON.stringify(this.settings));
        } catch (e) {
            console.log("Could not save settings");
        }
    }

    _loadSettings() {
        try {
            const saved = localStorage.getItem("snakeNeoOptions");
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.log("Could not load settings");
        }
    }

    // Get current settings (for external use)
    getSettings() {
        this._loadSettings();
        return { ...this.settings };
    }

    // Set a setting programmatically
    setSetting(key, value) {
        this.settings[key] = value;
        this._saveSettings();
    }
}