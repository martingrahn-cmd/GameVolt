// Keyboard action bindings, persisted per player slot in localStorage.
// Mirrors GamepadBindings but for keyboard input.

const KeyboardBindings = {
    KEY_PREFIX: 'astroidStorm.kbBindings.',
    _cache: {},

    // Default bindings — designed for two players on one keyboard
    DEFAULTS: {
        keyboard1: {
            rotateLeft:  ['ArrowLeft'],
            rotateRight: ['ArrowRight'],
            thrust:      ['ArrowUp'],
            brake:       ['ArrowDown'],
            shoot:       ['Slash', 'Period'],
            teleport:    ['ShiftRight']
        },
        keyboard2: {
            rotateLeft:  ['KeyA'],
            rotateRight: ['KeyD'],
            thrust:      ['KeyW'],
            brake:       ['KeyS'],
            shoot:       ['Space'],
            teleport:    ['ShiftLeft']
        }
    },

    LABELS: {
        rotateLeft:  'Rotate Left',
        rotateRight: 'Rotate Right',
        thrust:      'Thrust',
        brake:       'Brake',
        shoot:       'Shoot',
        teleport:    'Teleport'
    },

    ACTIONS: ['rotateLeft', 'rotateRight', 'thrust', 'brake', 'shoot', 'teleport'],

    // Human-readable key names
    KEY_NAMES: {
        ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
        Space: 'SPACE', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT',
        ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL',
        AltLeft: 'L-ALT', AltRight: 'R-ALT',
        KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D', KeyE: 'E', KeyF: 'F',
        KeyG: 'G', KeyH: 'H', KeyI: 'I', KeyJ: 'J', KeyK: 'K', KeyL: 'L',
        KeyM: 'M', KeyN: 'N', KeyO: 'O', KeyP: 'P', KeyQ: 'Q', KeyR: 'R',
        KeyS: 'S', KeyT: 'T', KeyU: 'U', KeyV: 'V', KeyW: 'W', KeyX: 'X',
        KeyY: 'Y', KeyZ: 'Z',
        Digit0: '0', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
        Digit5: '5', Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9',
        Numpad0: 'NUM0', Numpad1: 'NUM1', Numpad2: 'NUM2', Numpad3: 'NUM3',
        Numpad4: 'NUM4', Numpad5: 'NUM5', Numpad6: 'NUM6', Numpad7: 'NUM7',
        Numpad8: 'NUM8', Numpad9: 'NUM9',
        NumpadAdd: 'NUM+', NumpadSubtract: 'NUM-',
        NumpadMultiply: 'NUM*', NumpadDivide: 'NUM/',
        NumpadEnter: 'NUM-ENTER', NumpadDecimal: 'NUM.',
        Period: '.', Comma: ',', Slash: '/', Semicolon: ';',
        Quote: "'", BracketLeft: '[', BracketRight: ']',
        Backslash: '\\', Minus: '-', Equal: '=',
        Tab: 'TAB', Enter: 'ENTER', Backspace: 'BACK',
        CapsLock: 'CAPS', Escape: 'ESC'
    },

    getKeyName(code) {
        return this.KEY_NAMES[code] || code.replace('Key', '').replace('Digit', '');
    },

    // Get bindings for a player slot (keyboard1 or keyboard2)
    get(slot) {
        if (this._cache[slot]) return this._cache[slot];
        try {
            const raw = localStorage.getItem(this.KEY_PREFIX + slot);
            if (raw) {
                const parsed = JSON.parse(raw);
                this._cache[slot] = parsed;
                return parsed;
            }
        } catch (e) {}
        return this.DEFAULTS[slot] || this.DEFAULTS.keyboard1;
    },

    save(slot, bindings) {
        this._cache[slot] = bindings;
        try {
            localStorage.setItem(this.KEY_PREFIX + slot, JSON.stringify(bindings));
        } catch (e) {}
    },

    reset(slot) {
        this._cache[slot] = null;
        try {
            localStorage.removeItem(this.KEY_PREFIX + slot);
        } catch (e) {}
    },

    // Check if a key code is pressed for an action
    isPressed(keys, slot, action) {
        const bindings = this.get(slot);
        const codes = bindings[action];
        if (!codes) return false;
        for (const code of codes) {
            if (keys[code]) return true;
        }
        return false;
    }
};
