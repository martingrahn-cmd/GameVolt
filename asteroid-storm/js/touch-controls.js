// Mobile touch controls
// Left half: virtual joystick (spawn on touch, drag to steer/thrust/brake)
// Right half: tap to shoot, fixed teleport button

class TouchControls {
    constructor() {
        this.active = false;
        this.input = {
            rotate: 0,
            thrust: 0,
            shoot: false,
            brake: false,
            teleport: false
        };

        // Left joystick state
        this._leftTouch = null;
        this._leftOrigin = null;
        this._deadzone = 25; // pixels

        // Right shoot state
        this._rightTouch = null;
        this._shootHeld = false;

        // Teleport button
        this._teleportTouch = null;

        // DOM elements
        this._joystickBase = null;
        this._joystickKnob = null;
        this._teleportBtn = null;
        this._shootZone = null;

        this._buildUI();
        this._bindEvents();
    }

    _buildUI() {
        // Container for all touch UI
        const container = document.createElement('div');
        container.id = 'touchControls';
        container.style.cssText = `
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: 25;
            pointer-events: none;
        `;

        // Joystick base (shown when touching left side)
        const joyBase = document.createElement('div');
        joyBase.id = 'touchJoystickBase';
        joyBase.style.cssText = `
            display: none;
            position: absolute;
            width: 120px; height: 120px;
            border: 2px solid rgba(0,255,255,0.25);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            box-shadow: 0 0 20px rgba(0,255,255,0.08) inset;
        `;
        container.appendChild(joyBase);
        this._joystickBase = joyBase;

        // Joystick knob
        const joyKnob = document.createElement('div');
        joyKnob.id = 'touchJoystickKnob';
        joyKnob.style.cssText = `
            display: none;
            position: absolute;
            width: 44px; height: 44px;
            background: rgba(0,255,255,0.2);
            border: 2px solid rgba(0,255,255,0.5);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            box-shadow: 0 0 12px rgba(0,255,255,0.3);
        `;
        container.appendChild(joyKnob);
        this._joystickKnob = joyKnob;

        // Shoot zone indicator (right half)
        const shootZone = document.createElement('div');
        shootZone.id = 'touchShootZone';
        shootZone.style.cssText = `
            position: absolute;
            right: 0; top: 0;
            width: 50%; height: 100%;
            pointer-events: auto;
            touch-action: none;
        `;
        container.appendChild(shootZone);
        this._shootZone = shootZone;

        // Left control zone
        const leftZone = document.createElement('div');
        leftZone.id = 'touchLeftZone';
        leftZone.style.cssText = `
            position: absolute;
            left: 0; top: 0;
            width: 50%; height: 100%;
            pointer-events: auto;
            touch-action: none;
        `;
        container.appendChild(leftZone);
        this._leftZone = leftZone;

        // Teleport button (fixed, bottom-right)
        const teleBtn = document.createElement('div');
        teleBtn.id = 'touchTeleport';
        teleBtn.style.cssText = `
            position: absolute;
            bottom: 80px; right: 20px;
            width: 56px; height: 56px;
            border: 2px solid rgba(0,255,255,0.4);
            border-radius: 50%;
            background: rgba(0,255,255,0.08);
            pointer-events: auto;
            touch-action: none;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Press Start 2P', monospace;
            font-size: 7px;
            color: rgba(0,255,255,0.6);
            letter-spacing: 1px;
            text-shadow: 0 0 6px rgba(0,255,255,0.4);
            box-shadow: 0 0 15px rgba(0,255,255,0.1);
        `;
        teleBtn.textContent = 'WARP';
        container.appendChild(teleBtn);
        this._teleportBtn = teleBtn;

        // Pause button (top-right)
        const pauseBtn = document.createElement('div');
        pauseBtn.id = 'touchPause';
        pauseBtn.style.cssText = `
            position: absolute;
            top: 12px; right: 12px;
            width: 40px; height: 40px;
            border: 2px solid rgba(0,255,255,0.3);
            border-radius: 6px;
            background: rgba(0,0,0,0.4);
            pointer-events: auto;
            touch-action: none;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Press Start 2P', monospace;
            font-size: 10px;
            color: rgba(0,255,255,0.5);
            z-index: 35;
        `;
        pauseBtn.textContent = '❚❚';
        pauseBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.gameInstance && window.gameInstance.gameActive) {
                window.gameInstance.togglePause();
            }
        }, { passive: false });
        container.appendChild(pauseBtn);
        this._pauseBtn = pauseBtn;

        document.body.appendChild(container);
        this._container = container;
    }

    _bindEvents() {
        // Left zone — joystick
        this._leftZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.changedTouches[0];
            this._leftTouch = t.identifier;
            this._leftOrigin = { x: t.clientX, y: t.clientY };
            this._joystickBase.style.display = 'block';
            this._joystickBase.style.left = t.clientX + 'px';
            this._joystickBase.style.top = t.clientY + 'px';
            this._joystickKnob.style.display = 'block';
            this._joystickKnob.style.left = t.clientX + 'px';
            this._joystickKnob.style.top = t.clientY + 'px';
        }, { passive: false });

        this._leftZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (t.identifier === this._leftTouch && this._leftOrigin) {
                    const dx = t.clientX - this._leftOrigin.x;
                    const dy = t.clientY - this._leftOrigin.y;

                    // Clamp knob to base radius
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxR = 55;
                    const clampDist = Math.min(dist, maxR);
                    const angle = Math.atan2(dy, dx);
                    const knobX = this._leftOrigin.x + Math.cos(angle) * clampDist;
                    const knobY = this._leftOrigin.y + Math.sin(angle) * clampDist;
                    this._joystickKnob.style.left = knobX + 'px';
                    this._joystickKnob.style.top = knobY + 'px';

                    // Separate axes with independent deadzones
                    const absDx = Math.abs(dx);
                    const absDy = Math.abs(dy);

                    // Horizontal axis = rotate (independent of vertical)
                    if (absDx > this._deadzone) {
                        const rotNorm = Math.min(1, (absDx - this._deadzone) / (maxR - this._deadzone));
                        this.input.rotate = dx < 0 ? rotNorm : -rotNorm;
                    } else {
                        this.input.rotate = 0;
                    }

                    // Vertical axis = thrust/brake (independent of horizontal)
                    if (dy < -this._deadzone) {
                        this.input.thrust = Math.min(1, (absDy - this._deadzone) / (maxR - this._deadzone));
                        this.input.brake = false;
                    } else if (dy > this._deadzone) {
                        this.input.brake = true;
                        this.input.thrust = 0;
                    } else {
                        this.input.thrust = 0;
                        this.input.brake = false;
                    }
                }
            }
        }, { passive: false });

        this._leftZone.addEventListener('touchend', (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === this._leftTouch) {
                    this._leftTouch = null;
                    this._leftOrigin = null;
                    this.input.rotate = 0;
                    this.input.thrust = 0;
                    this.input.brake = false;
                    this._joystickBase.style.display = 'none';
                    this._joystickKnob.style.display = 'none';
                }
            }
        });
        this._leftZone.addEventListener('touchcancel', (e) => {
            this._leftTouch = null;
            this._leftOrigin = null;
            this.input.rotate = 0;
            this.input.thrust = 0;
            this.input.brake = false;
            this._joystickBase.style.display = 'none';
            this._joystickKnob.style.display = 'none';
        });

        // Right zone — shoot on touch
        this._shootZone.addEventListener('touchstart', (e) => {
            // Ignore if it's on the teleport button
            const t = e.changedTouches[0];
            const teleRect = this._teleportBtn.getBoundingClientRect();
            if (t.clientX >= teleRect.left && t.clientX <= teleRect.right &&
                t.clientY >= teleRect.top && t.clientY <= teleRect.bottom) return;
            e.preventDefault();
            this._rightTouch = t.identifier;
            this._shootHeld = true;
            this.input.shoot = true;
        }, { passive: false });

        this._shootZone.addEventListener('touchend', (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === this._rightTouch) {
                    this._rightTouch = null;
                    this._shootHeld = false;
                    this.input.shoot = false;
                }
            }
        });
        this._shootZone.addEventListener('touchcancel', () => {
            this._rightTouch = null;
            this._shootHeld = false;
            this.input.shoot = false;
        });

        // Teleport button
        this._teleportBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._teleportTouch = e.changedTouches[0].identifier;
            this.input.teleport = true;
            this._teleportBtn.style.background = 'rgba(0,255,255,0.25)';
            this._teleportBtn.style.borderColor = 'rgba(0,255,255,0.7)';
        }, { passive: false });

        this._teleportBtn.addEventListener('touchend', (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === this._teleportTouch) {
                    this._teleportTouch = null;
                    this.input.teleport = false;
                    this._teleportBtn.style.background = 'rgba(0,255,255,0.08)';
                    this._teleportBtn.style.borderColor = 'rgba(0,255,255,0.4)';
                }
            }
        });
    }

    show() {
        this.active = true;
        this._container.style.display = 'block';
    }

    hide() {
        this.active = false;
        this._container.style.display = 'none';
        this.input.rotate = 0;
        this.input.thrust = 0;
        this.input.shoot = false;
        this.input.brake = false;
        this.input.teleport = false;
    }

    // Apply touch input to player (called from player.handleInput)
    applyTo(playerInput) {
        if (!this.active) return;
        if (this.input.rotate) playerInput.rotate = this.input.rotate;
        if (this.input.thrust) playerInput.thrust = this.input.thrust;
        if (this.input.shoot) playerInput.shoot = true;
        if (this.input.brake) playerInput.brake = true;
        if (this.input.teleport) playerInput.teleport = true;
    }
}

// Detect mobile/touch device
function isTouchDevice() {
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isMobile = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
    const isIPad = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return hasTouch && (isMobile || isIPad || isCoarse || window.innerWidth <= 1024);
}
