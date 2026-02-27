// ============================================================
// AudioNeo.js — Synthwave sound effects for Neo mode
// ============================================================

class AudioNeoSFX {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.5;
        
        // Preload all sounds
        this._preload();
    }

    _preload() {
        const soundFiles = {
            eat: "./assets/sfx/eat.mp3",
            fanfare: "./assets/sfx/fanfare.mp3",
            gameOver: "./assets/sfx/game_over.mp3",
            impact: "./assets/sfx/impact.mp3",
            newHighscore: "./assets/sfx/new_highscore.mp3",
            menuClick: "./assets/sfx/menu_click.mp3",
            whoosh: "./assets/sfx/Whoosh.mp3",
            combo: "./assets/sfx/combo.mp3",
            click: "./assets/sfx/click.mp3"
        };

        for (const [name, path] of Object.entries(soundFiles)) {
            const audio = new Audio(path);
            audio.preload = "auto";
            audio.volume = this.volume;
            this.sounds[name] = audio;
        }
    }

    // Play a sound (with optional pitch variation)
    _play(name, volumeMultiplier = 1) {
        if (!this.enabled) return;
        
        const sound = this.sounds[name];
        if (!sound) return;

        // Clone for overlapping sounds
        const clone = sound.cloneNode();
        clone.volume = this.volume * volumeMultiplier;
        clone.play().catch(() => {
            // Ignore autoplay errors
        });
    }

    // --------------------------------------------------------
    // PUBLIC API
    // --------------------------------------------------------

    // Äta frukt
    eat() {
        this._play("eat");
    }

    // Combo (higher pitch for higher combos could be done with Web Audio API)
    combo(comboLevel = 1) {
        this._play("combo", Math.min(1, 0.7 + comboLevel * 0.1));
    }

    // Level complete
    levelComplete() {
        this._play("fanfare");
    }

    // Game over
    gameOver() {
        this._play("gameOver");
    }

    // Wall/self collision
    crash() {
        this._play("impact");
    }

    // Impact (alias for crash)
    impact() {
        this._play("impact");
    }

    // New highscore
    newHighscore() {
        this._play("newHighscore");
    }

    // Menu navigation
    menuClick() {
        this._play("menuClick", 0.7);
    }

    // Generic button click
    click() {
        this._play("click", 0.8);
    }

    // Pause on/off
    pause() {
        this._play("whoosh");
    }

    // --------------------------------------------------------
    // SETTINGS
    // --------------------------------------------------------

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        // Update all preloaded sounds
        for (const sound of Object.values(this.sounds)) {
            sound.volume = this.volume;
        }
    }
}

// Singleton instance
export const audioNeoSFX = new AudioNeoSFX();