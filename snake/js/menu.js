// ============================================================
// Snake — Mode Selection Menu (Neo / Nokia)
// With Gamepad Support + Background Images
// ============================================================

export class MenuScreen {
    constructor() {
        this.element = null;
        this.selectedIndex = 0;
        this.buttons = [];
        this.resolve = null;
        this.lastDpad = { up: false, down: false };
        this.lastConfirm = false;
        this.pollId = null;
        
        // Background images per mode
        this.backgrounds = {
            neo: './assets/img/bg_neo.webp',
            nokia: './assets/img/bg_3310.webp',
            '16bit': './assets/img/bg_16.webp'
        };
    }

    show() {
        return new Promise(resolve => {
            this.resolve = resolve;

            // Create overlay
            const div = document.createElement("div");
            div.id = "snakeMenu";
            div.innerHTML = `
                <div class="menu-bg" id="menuBg"></div>
                <div class="menu-container">
                    <h1 class="menu-title">SNAKE</h1>

                    <button class="menu-btn selected" data-mode="neo">
                        Neo Synthwave
                        <span class="mode-desc">Neon levels & combos</span>
                    </button>

                    <button class="menu-btn" data-mode="nokia">
                        Nokia 3310
                        <span class="mode-desc">Classic endless</span>
                    </button>

                    <button class="menu-btn" data-mode="16bit">
                        16-Bit Arcade
                        <span class="mode-desc">Fruit chain puzzle</span>
                    </button>

                    <p class="menu-small">SmartProc Games</p>
                    <p class="menu-controls">
                        🎮 D-pad + A to select
                    </p>
                </div>
            `;

            // Add background image styles
            const style = document.createElement('style');
            style.textContent = `
                .menu-bg {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-size: cover;
                    background-position: center center;
                    background-repeat: no-repeat;
                    opacity: 0;
                    transition: opacity 0.4s ease;
                    z-index: -1;
                }
                .menu-bg.visible {
                    opacity: 0.5;
                }
                #snakeMenu {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                }
                .menu-container {
                    position: relative;
                    z-index: 1;
                }
            `;
            div.appendChild(style);

            document.body.appendChild(div);
            this.element = div;
            this.buttons = Array.from(div.querySelectorAll(".menu-btn"));
            this.bgElement = div.querySelector("#menuBg");

            // Preload images
            Object.values(this.backgrounds).forEach(src => {
                const img = new Image();
                img.src = src;
            });

            // Click handlers
            this.buttons.forEach((btn, index) => {
                btn.addEventListener("click", () => {
                    this._selectMode(btn.dataset.mode);
                });
                btn.addEventListener("mouseenter", () => {
                    this._highlightButton(index, false); // No sound on hover
                });
            });

            // Keyboard support
            this._keyHandler = (e) => {
                if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
                    e.preventDefault();
                    this._highlightButton(this.selectedIndex - 1, true); // Sound on keyboard
                }
                if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
                    e.preventDefault();
                    this._highlightButton(this.selectedIndex + 1, true); // Sound on keyboard
                }
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    this._selectMode(this.buttons[this.selectedIndex].dataset.mode);
                }
            };
            window.addEventListener("keydown", this._keyHandler);

            // Show initial background
            this._updateBackground('neo');

            // Start gamepad polling
            this._pollGamepad();
        });
    }

    _updateBackground(mode) {
        if (this.bgElement && this.backgrounds[mode]) {
            this.bgElement.style.backgroundImage = `url('${this.backgrounds[mode]}')`;
            this.bgElement.classList.add('visible');
        }
    }

    _highlightButton(index, playSound = false) {
        if (index < 0) index = this.buttons.length - 1;
        if (index >= this.buttons.length) index = 0;
        
        // Only play sound if requested and actually changing
        if (playSound && index !== this.selectedIndex) {
            if (window.audioNeoSFX) window.audioNeoSFX.click();
        }

        this.selectedIndex = index;
        this.buttons.forEach((btn, i) => {
            btn.classList.toggle("selected", i === index);
        });

        // Update background image
        const mode = this.buttons[index].dataset.mode;
        this._updateBackground(mode);
    }

    _selectMode(mode) {
        // Play click sound when selecting
        if (window.audioNeoSFX) window.audioNeoSFX.click();
        
        // Stop polling
        if (this.pollId) {
            cancelAnimationFrame(this.pollId);
            this.pollId = null;
        }
        
        // Remove keyboard handler
        window.removeEventListener("keydown", this._keyHandler);

        // Fade out animation
        this.element.style.opacity = "0";
        setTimeout(() => {
            this.element.remove();
            this.resolve(mode);
        }, 250);
    }

    _pollGamepad() {
        const poll = () => {
            this.pollId = requestAnimationFrame(poll);

            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            
            for (const gp of gamepads) {
                if (!gp) continue;

                // D-pad
                const dpad = {
                    up:   gp.buttons[12]?.pressed || gp.axes[1] < -0.5,
                    down: gp.buttons[13]?.pressed || gp.axes[1] > 0.5
                };

                if (dpad.up && !this.lastDpad.up) {
                    this._highlightButton(this.selectedIndex - 1, true); // Sound on gamepad
                }
                if (dpad.down && !this.lastDpad.down) {
                    this._highlightButton(this.selectedIndex + 1, true); // Sound on gamepad
                }

                this.lastDpad = { ...dpad };

                // Confirm (X / A)
                const confirm = gp.buttons[0]?.pressed;
                if (confirm && !this.lastConfirm) {
                    this._selectMode(this.buttons[this.selectedIndex].dataset.mode);
                }
                this.lastConfirm = confirm;

                break; // Only first gamepad
            }
        };

        poll();
    }
}