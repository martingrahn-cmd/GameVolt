// Gamepad action bindings, persisted per controller id in localStorage.
//
// Actions are abstract names like 'thrust', 'shoot' etc. Each action maps
// to a list of inputs. An input is one of:
//   { type: 'button', index: 7 }
//   { type: 'axis',   index: 3, dir: 1, threshold: 0.5 }   // R2 as axis
//   { type: 'axis',   index: 1, dir: -1, threshold: 0.5 }  // stick up
//
// player.js / menu.js call GamepadBindings.isPressed(gp, 'thrust') instead
// of polling raw button indices, so the player can rebind any action to any
// button without code changes elsewhere.

const GamepadBindings = {
    KEY_PREFIX: 'astroidStorm.bindings.',
    _cache: {},   // gp.id -> binding map

    // Default bindings for the standard gamepad layout (Xbox / 8BitDo / DS4
    // in standard mode all use this).
    DEFAULTS: {
        // Gameplay
        rotateLeft:  [{ type: 'button', index: 14 }, { type: 'axis', index: 0, dir: -1, threshold: 0.15 }],
        rotateRight: [{ type: 'button', index: 15 }, { type: 'axis', index: 0, dir:  1, threshold: 0.15 }],
        thrust:      [{ type: 'button', index: 7 },  { type: 'axis', index: 3, dir: 1, threshold: 0.5 }],
        brake:       [{ type: 'button', index: 6 },  { type: 'axis', index: 4, dir: 1, threshold: 0.5 }],
        shoot:       [{ type: 'button', index: 0 },  { type: 'button', index: 1 }],
        teleport:    [{ type: 'button', index: 2 },  { type: 'button', index: 3 }],
        pause:       [{ type: 'button', index: 9 }],

        // Menu
        menuUp:      [{ type: 'button', index: 12 }, { type: 'axis', index: 1, dir: -1, threshold: 0.5 }],
        menuDown:    [{ type: 'button', index: 13 }, { type: 'axis', index: 1, dir:  1, threshold: 0.5 }],
        menuLeft:    [{ type: 'button', index: 14 }, { type: 'axis', index: 0, dir: -1, threshold: 0.5 }],
        menuRight:   [{ type: 'button', index: 15 }, { type: 'axis', index: 0, dir:  1, threshold: 0.5 }],
        menuConfirm: [{ type: 'button', index: 0 },  { type: 'button', index: 1 }],
        menuBack:    [{ type: 'button', index: 2 },  { type: 'button', index: 3 }]
    },

    // Human-readable label for each action — used in the remapping UI.
    LABELS: {
        rotateLeft:  'Rotate Left',
        rotateRight: 'Rotate Right',
        thrust:      'Thrust',
        brake:       'Brake',
        shoot:       'Shoot',
        teleport:    'Teleport',
        pause:       'Pause'
    },

    // Actions that show up in the remapping UI (skip menu nav for now —
    // those stay tied to D-pad/sticks/face buttons by convention).
    REMAPPABLE: ['rotateLeft', 'rotateRight', 'thrust', 'brake', 'shoot', 'teleport', 'pause'],

    // Get the full binding map for a given gamepad id, falling back to defaults.
    getBindings(gpId) {
        if (this._cache[gpId]) return this._cache[gpId];

        let saved = null;
        try {
            const raw = localStorage.getItem(this.KEY_PREFIX + gpId);
            if (raw) saved = JSON.parse(raw);
        } catch (e) {}

        // Deep clone defaults so per-controller edits don't mutate them
        const merged = {};
        for (const action in this.DEFAULTS) {
            merged[action] = (saved && saved[action])
                ? JSON.parse(JSON.stringify(saved[action]))
                : JSON.parse(JSON.stringify(this.DEFAULTS[action]));
        }
        this._cache[gpId] = merged;
        return merged;
    },

    saveBindings(gpId, bindings) {
        this._cache[gpId] = bindings;
        try {
            localStorage.setItem(this.KEY_PREFIX + gpId, JSON.stringify(bindings));
        } catch (e) {}
    },

    resetBindings(gpId) {
        delete this._cache[gpId];
        try {
            localStorage.removeItem(this.KEY_PREFIX + gpId);
        } catch (e) {}
    },

    // Set a single action's bindings (replaces any existing binding for it)
    setBinding(gpId, action, inputs) {
        const b = this.getBindings(gpId);
        b[action] = inputs;
        this.saveBindings(gpId, b);
    },

    // Check if an action is currently active on a given gamepad.
    isPressed(gp, action) {
        if (!gp) return false;
        const bindings = this.getBindings(gp.id);
        const inputs = bindings[action];
        if (!inputs) return false;

        for (const input of inputs) {
            if (input.type === 'button') {
                const b = gp.buttons[input.index];
                if (b && (b.pressed || b.value > 0.1)) return true;
            } else if (input.type === 'axis') {
                const v = gp.axes[input.index];
                if (v === undefined) continue;
                if (input.dir > 0 && v > (input.threshold || 0.5)) return true;
                if (input.dir < 0 && v < -(input.threshold || 0.5)) return true;
            }
        }
        return false;
    },

    // Get a normalized analog value for an action (0..1).
    // For button actions returns 0 or 1; for axis returns the magnitude in
    // the bound direction.
    getValue(gp, action) {
        if (!gp) return 0;
        const bindings = this.getBindings(gp.id);
        const inputs = bindings[action];
        if (!inputs) return 0;

        let max = 0;
        for (const input of inputs) {
            if (input.type === 'button') {
                const b = gp.buttons[input.index];
                if (b) {
                    const v = b.pressed ? 1 : b.value;
                    if (v > max) max = v;
                }
            } else if (input.type === 'axis') {
                const v = gp.axes[input.index];
                if (v === undefined) continue;
                const signed = input.dir * v;
                if (signed > max) max = Math.min(1, signed);
            }
        }
        return max;
    },

    // Capture the next pressed input on the gamepad — used by the remap UI.
    // Returns an input descriptor or null if nothing is pressed this frame.
    // Ignores inputs in the `ignore` set (held buttons that the user hasn't
    // released yet).
    captureInput(gp, ignoreButtons = new Set(), ignoreAxes = new Set()) {
        if (!gp) return null;

        for (let i = 0; i < gp.buttons.length; i++) {
            if (ignoreButtons.has(i)) continue;
            const b = gp.buttons[i];
            if (b && (b.pressed || b.value > 0.5)) {
                return { type: 'button', index: i };
            }
        }
        for (let i = 0; i < gp.axes.length; i++) {
            if (ignoreAxes.has(i)) continue;
            const v = gp.axes[i];
            if (v === undefined) continue;
            if (v > 0.7) return { type: 'axis', index: i, dir: 1, threshold: 0.5 };
            if (v < -0.7) return { type: 'axis', index: i, dir: -1, threshold: 0.5 };
        }
        return null;
    },

    // Pretty label for an input descriptor — used to display the binding
    inputLabel(input) {
        if (!input) return '—';
        if (input.type === 'button') {
            const names = {
                0: 'A',  1: 'B',  2: 'X',  3: 'Y',
                4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
                8: 'Back', 9: 'Start',
                10: 'L3', 11: 'R3',
                12: 'D-Up', 13: 'D-Down', 14: 'D-Left', 15: 'D-Right',
                16: 'Home'
            };
            return names[input.index] || `Btn ${input.index}`;
        }
        if (input.type === 'axis') {
            const axisNames = {
                0: 'L-Stick X', 1: 'L-Stick Y',
                2: 'R-Stick X', 3: 'R-Stick Y',
                4: 'L-Trig',    5: 'R-Trig'
            };
            const base = axisNames[input.index] || `Axis ${input.index}`;
            return input.dir > 0 ? `${base} +` : `${base} -`;
        }
        return '?';
    }
};
