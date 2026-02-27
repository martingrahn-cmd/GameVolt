// ============================================================
// AudioNokia.js — Retro Nokia-style "square wave" sound engine
// ============================================================

class AudioNokia {
    constructor() {
        this.actx = null;
        this.unlocked = false;
        this.enabled = true;
    }

    // ------------------------------------------------------------
    // Enable/disable sound effects
    // ------------------------------------------------------------
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    // ------------------------------------------------------------
    // Ensure AudioContext exists
    // ------------------------------------------------------------
    _ctx() {
        if (!this.actx) {
            this.actx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.actx;
    }

    // ------------------------------------------------------------
    // iOS unlock – must be triggered by user gesture
    // ------------------------------------------------------------
    unlock() {
        if (this.unlocked) return;
        const ctx = this._ctx();

        // create a silent buffer to unlock
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);

        this.unlocked = true;
        console.log("🔓 Audio unlocked");
    }

    // ------------------------------------------------------------
    // Generic beep
    // ------------------------------------------------------------
    beep(freq = 440, duration = 0.08, volume = 0.2) {
        if (!this.enabled) return;
        
        const ctx = this._ctx();
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + duration);
    }

    // ------------------------------------------------------------
    // PRESET SOUNDS
    // ------------------------------------------------------------
    blipMove() {
        this.beep(650, 0.045, 0.10);
    }

    eat() {
        this.beep(900, 0.06, 0.15);
        setTimeout(() => this.beep(1100, 0.05, 0.15), 50);
    }

    crash() {
        this.beep(400, 0.07, 0.18);
        setTimeout(() => this.beep(260, 0.10, 0.18), 70);
    }
    
    // Gran Vals ringtone (Nokia tune) - plays at game start
    playRingtone() {
        if (!this.enabled) return;
        
        // Gran Vals melody (simplified Nokia tune)
        // Notes: E5 D5 F#4 G#4 C#5 B4 D4 E4 B4 A4 C#4 E4 A4
        const melody = [
            { freq: 659, dur: 0.12 },  // E5
            { freq: 587, dur: 0.12 },  // D5
            { freq: 370, dur: 0.24 },  // F#4
            { freq: 415, dur: 0.24 },  // G#4
            { freq: 554, dur: 0.12 },  // C#5
            { freq: 494, dur: 0.12 },  // B4
            { freq: 294, dur: 0.24 },  // D4
            { freq: 330, dur: 0.24 },  // E4
            { freq: 494, dur: 0.12 },  // B4
            { freq: 440, dur: 0.12 },  // A4
            { freq: 277, dur: 0.24 },  // C#4
            { freq: 330, dur: 0.24 },  // E4
            { freq: 440, dur: 0.4 },   // A4 (hold)
        ];
        
        let time = 0;
        for (const note of melody) {
            setTimeout(() => {
                this.beep(note.freq, note.dur, 0.12);
            }, time * 1000);
            time += note.dur + 0.02; // Small gap between notes
        }
    }
}

// ------------------------------------------------------------
// SINGLETON INSTANCE (IMPORTANT!)
// ------------------------------------------------------------
export const audioNokia = new AudioNokia();