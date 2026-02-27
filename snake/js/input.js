// ============================================================
// Input.js — Keyboard, Touch & Gamepad Support
// ============================================================

export class Input {
    constructor(onDir, onAction) {
        this.onDir = onDir;
        this.onAction = onAction || (() => {});
        
        // Track last d-pad state to detect new presses
        this.lastDpad = { up: false, down: false, left: false, right: false };
        this.lastButtons = { confirm: false, back: false };
        
        // Keyboard
        this._initKeyboard();
        
        // Touch
        this._initTouch();
        
        // Gamepad polling
        this.gamepadIndex = null;
        this._pollGamepad();
    }

    // --------------------------------------------------------
    // KEYBOARD
    // --------------------------------------------------------
    _initKeyboard() {
        window.addEventListener("keydown", e => {
            // Skip game controls if typing in an input field (highscore entry)
            const isTyping = document.activeElement?.tagName === "INPUT";
            
            // Direction (skip if typing)
            if (!isTyping) {
                if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
                    e.preventDefault();
                    this.onDir("up");
                }
                if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
                    e.preventDefault();
                    this.onDir("down");
                }
                if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
                    e.preventDefault();
                    this.onDir("left");
                }
                if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
                    e.preventDefault();
                    this.onDir("right");
                }
            }
            
            // Actions (skip if typing, except Enter)
            if (!isTyping) {
                if (e.key === " ") {
                    e.preventDefault();
                    this.onAction("confirm");
                }
                if (e.key === "Escape" || e.key === "p" || e.key === "P") {
                    e.preventDefault();
                    this.onAction("back");
                }
            }
            
            // Audio toggles removed - use icons instead
            // (M key conflicts with typing names like "Martin")
        });
    }

    // --------------------------------------------------------
    // TOUCH (swipe)
    // --------------------------------------------------------
    _initTouch() {
        let sx = 0, sy = 0;
        
        window.addEventListener("touchstart", e => {
            if (!e.touches.length) return;
            const t = e.touches[0];
            sx = t.clientX;
            sy = t.clientY;
        }, { passive: true });

        window.addEventListener("touchmove", e => {
            if (!e.touches.length) return;
            const t = e.touches[0];
            const dx = t.clientX - sx;
            const dy = t.clientY - sy;

            const threshold = 20;
            if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.onDir(dx > 0 ? "right" : "left");
                } else {
                    this.onDir(dy > 0 ? "down" : "up");
                }
                sx = t.clientX;
                sy = t.clientY;
            }
        }, { passive: true });
    }

    // --------------------------------------------------------
    // GAMEPAD (PS5 / Xbox / Generic)
    // --------------------------------------------------------
    _pollGamepad() {
        const poll = () => {
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            
            for (const gp of gamepads) {
                if (!gp) continue;
                
                // D-pad detection - multiple methods for compatibility
                // Method 1: Standard d-pad buttons (12-15)
                // Method 2: Left analog stick (axes 0-1)
                // Method 3: Some controllers use axes 9 for d-pad (PS5 on some browsers)
                
                const dpadButtons = {
                    up:    gp.buttons[12]?.pressed,
                    down:  gp.buttons[13]?.pressed,
                    left:  gp.buttons[14]?.pressed,
                    right: gp.buttons[15]?.pressed
                };
                
                const leftStick = {
                    up:    gp.axes[1] < -0.5,
                    down:  gp.axes[1] > 0.5,
                    left:  gp.axes[0] < -0.5,
                    right: gp.axes[0] > 0.5
                };
                
                // Combine all methods
                const dpad = {
                    up:    dpadButtons.up || leftStick.up,
                    down:  dpadButtons.down || leftStick.down,
                    left:  dpadButtons.left || leftStick.left,
                    right: dpadButtons.right || leftStick.right
                };

                // Detect NEW presses (not held)
                if (dpad.up && !this.lastDpad.up) this.onDir("up");
                if (dpad.down && !this.lastDpad.down) this.onDir("down");
                if (dpad.left && !this.lastDpad.left) this.onDir("left");
                if (dpad.right && !this.lastDpad.right) this.onDir("right");

                this.lastDpad = { ...dpad };

                // Action buttons
                // PS5: X = 0, O = 1  |  Xbox: A = 0, B = 1
                // Start/Options = 9
                const buttons = {
                    confirm: gp.buttons[0]?.pressed,  // X / A
                    back:    gp.buttons[1]?.pressed,  // O / B
                    start:   gp.buttons[9]?.pressed   // Start / Options
                };

                if (buttons.confirm && !this.lastButtons.confirm) {
                    this.onAction("confirm");
                }
                if (buttons.back && !this.lastButtons.back) {
                    this.onAction("back");
                }
                if (buttons.start && !this.lastButtons.start) {
                    this.onAction("start");
                }

                this.lastButtons = { ...buttons };
                
                // Only use first connected gamepad
                break;
            }

            requestAnimationFrame(poll);
        };

        // Start polling
        poll();

        // Log when gamepad connects
        window.addEventListener("gamepadconnected", e => {
            console.log(`🎮 Gamepad connected: ${e.gamepad.id}`);
            console.log(`🎮 Buttons: ${e.gamepad.buttons.length}, Axes: ${e.gamepad.axes.length}`);
        });

        window.addEventListener("gamepaddisconnected", e => {
            console.log(`🎮 Gamepad disconnected: ${e.gamepad.id}`);
        });
    }
}