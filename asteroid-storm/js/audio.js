// Audio manager — sample-based SFX + procedural engine sounds
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.initialized = false;
        this.masterGain = null;
        this.enabled = true;
        this.buffers = {};
        this.thrustNode = null;
        this.thrustGain = null;
        this.droneNode = null;
        this.droneGain = null;
        this.currentMusic = null;
        this.musicGain = null;
        this.currentTrack = null;
    }

    init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);

            // Sub-buses for music and sfx so each can be adjusted independently.
            // Both feed into masterGain.
            this.musicBus = this.audioContext.createGain();
            this.musicBus.connect(this.masterGain);
            this.sfxBus = this.audioContext.createGain();
            this.sfxBus.connect(this.masterGain);

            // Pull persisted volumes + mute from Settings.
            const S = (typeof Settings !== 'undefined') ? Settings : null;
            this.masterVolume = S ? S.get('masterVolume') : 0.4;
            this.musicVolume = S ? S.get('musicVolume') : 1.0;
            this.sfxVolume = S ? S.get('sfxVolume') : 1.0;
            this.muted = S ? !!S.get('muted') : false;

            this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
            this.musicBus.gain.value = this.musicVolume;
            this.sfxBus.gain.value = this.sfxVolume;

            this.initialized = true;
            this.loadAllSamples();
            // Defer oscillator setup until first user gesture (autoplay policy)
            this.proceduralReady = false;
            const initProcedural = () => {
                if (this.proceduralReady) return;
                this.audioContext.resume().then(() => {
                    this.setupThrust();
                    this.setupDroneAmbient();
                    this.proceduralReady = true;
                });
                document.removeEventListener('click', initProcedural);
                document.removeEventListener('keydown', initProcedural);
                document.removeEventListener('gamepadconnected', initProcedural);
            };
            document.addEventListener('click', initProcedural);
            document.addEventListener('keydown', initProcedural);
        } catch (e) {
            console.log('Audio not supported');
            this.enabled = false;
        }
    }

    async loadSample(name, path) {
        try {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            this.buffers[name] = await this.audioContext.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.warn(`Failed to load sound: ${name}`, e);
        }
    }

    loadAllSamples() {
        const sfx = [
            ['shot', 'assets/sfx/shot.mp3'],
            ['shot_spread', 'assets/sfx/shot_spread.mp3'],
            ['shot_homing', 'assets/sfx/shot_homing.mp3'],
            ['asteroid_explosion', 'assets/sfx/astroid_explosion.mp3'],
            ['spread_explosion', 'assets/sfx/spread_explosion.mp3'],
            ['ufo_explosion', 'assets/sfx/ufo_explosion.mp3'],
            ['bomb_detonation', 'assets/sfx/bomb_detonation.mp3'],
            ['player_hit', 'assets/sfx/player_hit.mp3'],
            ['teleport_out', 'assets/sfx/teleport_out.mp3'],
            ['teleport_in', 'assets/sfx/teleport_in.mp3'],
            ['powerup_pickup', 'assets/sfx/powerup_pickup.mp3'],
            ['shield_activated', 'assets/sfx/shield_activated.mp3'],
            ['shield_break', 'assets/sfx/shield_break.mp3'],
            ['ufo_hostile_shot', 'assets/sfx/ufo_hostile_shot.mp3'],
            ['combo_5', 'assets/sfx/combo_5.mp3'],
            ['menu_select', 'assets/sfx/menu_select.mp3'],
            ['menu_navigate', 'assets/sfx/menu_navigate.mp3'],
            ['game_over', 'assets/sfx/game_over.mp3'],
            ['death_explosion', 'assets/sfx/death_explosion.mp3'],
        ];
        sfx.forEach(([name, path]) => this.loadSample(name, path));
    }

    play(name, volume = 1.0) {
        if (!this.enabled || !this.initialized || !this.buffers[name]) return;

        // Resume context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = this.buffers[name];

        const gain = this.audioContext.createGain();
        gain.gain.value = volume;

        source.connect(gain);
        gain.connect(this.sfxBus);
        source.start(0);
    }

    // ── Procedural thrust engine ──
    // Three layers feed a master gain so the engine sounds chunky:
    //   1. Mid bandpass on white noise — engine body / combustion roar
    //   2. High bandpass on white noise — air whoosh / exhaust hiss
    //   3. Sine sub-oscillator (40-80 Hz) — low-end rumble that cranks up
    //      with speed, giving the sensation of weight + power.
    setupThrust() {
        const bufferSize = this.audioContext.sampleRate * 2;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        // Two noise sources — one feeds the body filter, one the high filter.
        // Could share a single source via a gain split but separate buffers
        // are simpler and the cost is negligible.
        this.thrustNoise1 = this.audioContext.createBufferSource();
        this.thrustNoise1.buffer = noiseBuffer;
        this.thrustNoise1.loop = true;

        this.thrustNoise2 = this.audioContext.createBufferSource();
        this.thrustNoise2.buffer = noiseBuffer;
        this.thrustNoise2.loop = true;

        // Layer 1: engine body — mid-frequency bandpass
        const lowFilter = this.audioContext.createBiquadFilter();
        lowFilter.type = 'bandpass';
        lowFilter.frequency.value = 220;
        lowFilter.Q.value = 1.0;
        this.thrustLowFilter = lowFilter;

        const lowGain = this.audioContext.createGain();
        lowGain.gain.value = 0;
        this.thrustLowGain = lowGain;

        this.thrustNoise1.connect(lowFilter);
        lowFilter.connect(lowGain);

        // Layer 2: air whoosh — high-frequency bandpass
        const highFilter = this.audioContext.createBiquadFilter();
        highFilter.type = 'bandpass';
        highFilter.frequency.value = 1100;
        highFilter.Q.value = 0.7;
        this.thrustHighFilter = highFilter;

        const highGain = this.audioContext.createGain();
        highGain.gain.value = 0;
        this.thrustHighGain = highGain;

        this.thrustNoise2.connect(highFilter);
        highFilter.connect(highGain);

        // Layer 3: sub rumble — sine oscillator
        const subOsc = this.audioContext.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.value = 50;
        this.thrustSubOsc = subOsc;

        const subGain = this.audioContext.createGain();
        subGain.gain.value = 0;
        this.thrustSubGain = subGain;
        subOsc.connect(subGain);

        // Master mix bus for the whole thrust stack
        this.thrustGain = this.audioContext.createGain();
        this.thrustGain.gain.value = 1.0;

        lowGain.connect(this.thrustGain);
        highGain.connect(this.thrustGain);
        subGain.connect(this.thrustGain);
        this.thrustGain.connect(this.sfxBus);

        this.thrustNoise1.start(0);
        this.thrustNoise2.start(0);
        subOsc.start(0);
    }

    setThrust(active, speed = 0) {
        if (!this.thrustGain || !this.thrustLowGain) return;
        const now = this.audioContext.currentTime;
        const ramp = 0.06;

        if (active) {
            // Layer gains scale with speed — sub rumble ramps the most so
            // top speed feels heavy and powerful.
            const lowTarget  = 0.10 + speed * 0.06;
            const highTarget = 0.04 + speed * 0.10;
            const subTarget  = 0.05 + speed * 0.18;

            this.thrustLowGain.gain.linearRampToValueAtTime(lowTarget, now + ramp);
            this.thrustHighGain.gain.linearRampToValueAtTime(highTarget, now + ramp);
            this.thrustSubGain.gain.linearRampToValueAtTime(subTarget, now + ramp);

            // Filter sweeps + sub oscillator pitch shift give "throttle up" feel
            this.thrustLowFilter.frequency.linearRampToValueAtTime(
                190 + speed * 220, now + 0.12
            );
            this.thrustHighFilter.frequency.linearRampToValueAtTime(
                900 + speed * 800, now + 0.12
            );
            this.thrustSubOsc.frequency.linearRampToValueAtTime(
                42 + speed * 32, now + 0.18
            );
        } else {
            this.thrustLowGain.gain.linearRampToValueAtTime(0, now + ramp);
            this.thrustHighGain.gain.linearRampToValueAtTime(0, now + ramp);
            this.thrustSubGain.gain.linearRampToValueAtTime(0, now + ramp);
        }
    }

    // ── Procedural supply drone ambient hum ──
    setupDroneAmbient() {
        this.droneGain = this.audioContext.createGain();
        this.droneGain.gain.value = 0;
        this.droneGain.connect(this.sfxBus);

        // Two detuned oscillators for warble
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 120;
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 123; // slight detune = beating

        osc1.connect(this.droneGain);
        osc2.connect(this.droneGain);
        osc1.start(0);
        osc2.start(0);

        this.droneOsc1 = osc1;
        this.droneOsc2 = osc2;
    }

    setDroneAmbient(active) {
        if (!this.droneGain) return;
        const target = active ? 0.06 : 0;
        this.droneGain.gain.linearRampToValueAtTime(target, this.audioContext.currentTime + 0.3);
    }

    // ── SFX volumes (lowered to balance with music) ──
    playShoot()          { this.play('shot', 0.2); }
    playSpreadShoot()    { this.play('shot_spread', 0.25); }
    playHomingShoot()    { this.play('shot_homing', 0.25); }
    playExplosion()      { this.play('asteroid_explosion', 0.3); }
    playSpreadPop()      { this.play('spread_explosion', 0.25); }
    playUFOExplosion()   { this.play('ufo_explosion', 0.35); }
    playBombDetonation() { this.play('bomb_detonation', 0.4); }
    playHit()            { this.play('player_hit', 0.4); }
    playTeleportOut()    { this.play('teleport_out', 0.3); }
    playTeleportIn()     { this.play('teleport_in', 0.3); }
    playPickup()         { this.play('powerup_pickup', 0.3); }
    playShieldActivate() { this.play('shield_activated', 0.25); }
    playShieldBreak()    { this.play('shield_break', 0.35); }
    playUFOShot()        { this.play('ufo_hostile_shot', 0.2); }
    playCombo()          { this.play('combo_5', 0.3); }
    playMenuSelect()     { this.play('menu_select', 0.25); }
    playMenuNavigate()   { this.play('menu_navigate', 0.2); }
    playGameOver()       { this.play('game_over', 0.8); }

    playDeathExplosion() {
        this.play('death_explosion', 0.8);
        this.duckMusic(0.05, 0.15, 1.5);
    }

    // Procedural electric zap for railgun — no sample needed
    playRailgun() {
        if (!this.enabled || !this.initialized) return;
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const dur = 0.25;

        // White noise burst (electric crackle)
        const bufSize = ctx.sampleRate * dur;
        const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize); // fade out
        }
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuf;

        // Bandpass filter — gives it that electric "zzzt" tone
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + dur);
        filter.Q.value = 5;

        // High-pitch sine sweep (sci-fi zap)
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2000, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + dur);
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.15, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + dur);

        // Mix
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

        noiseNode.connect(filter);
        filter.connect(gain);
        osc.connect(oscGain);
        oscGain.connect(gain);
        gain.connect(this.masterGain);

        noiseNode.start(now);
        noiseNode.stop(now + dur);
        osc.start(now);
        osc.stop(now + dur);
    }

    // Keep old procedural playTone for anything that still uses it
    playTone(frequency, duration, type = 'sine', envelope = null) {
        if (!this.enabled || !this.initialized) return;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        osc.connect(gain);
        gain.connect(this.sfxBus);
        if (!envelope) {
            gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        } else {
            envelope(gain);
        }
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + duration);
    }

    // ── Music system ──
    async playMusic(track) {
        if (!this.enabled || !this.initialized) return;
        if (this.currentTrack === track) return; // already playing
        if (this._musicLoadingTrack === track) return; // already loading same track

        // Mark intent immediately so concurrent calls coalesce
        this._musicLoadingTrack = track;

        // Stop whatever is currently playing right away
        this.stopMusic();

        if (this.audioContext.state === 'suspended') {
            try { await this.audioContext.resume(); } catch (e) {}
        }

        try {
            const path = `assets/music/${track}.mp3`;
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // If a different track was requested while we were loading, abort
            if (this._musicLoadingTrack !== track) return;

            // Stop again in case something started in between
            this.stopMusic();

            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.loop = true;

            const gain = this.audioContext.createGain();
            gain.gain.value = 0;
            source.connect(gain);
            gain.connect(this.musicBus);

            source.start(0);
            this.currentMusic = source;
            this.musicGain = gain;
            this.currentTrack = track;
            this._musicLoadingTrack = null;

            // Fade in
            const now = this.audioContext.currentTime;
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 2);
        } catch (e) {
            console.warn('Failed to load music:', track, e);
            this._musicLoadingTrack = null;
        }
    }

    stopMusic() {
        if (this.currentMusic) {
            const oldSource = this.currentMusic;
            const oldGain = this.musicGain;
            const now = this.audioContext.currentTime;

            if (oldGain) {
                // Cancel any pending ramps and fade out cleanly
                oldGain.gain.cancelScheduledValues(now);
                oldGain.gain.setValueAtTime(oldGain.gain.value, now);
                oldGain.gain.linearRampToValueAtTime(0, now + 0.4);
            }

            setTimeout(() => {
                try { oldSource.stop(); } catch (e) {}
                try { if (oldGain) oldGain.disconnect(); } catch (e) {}
            }, 500);

            this.currentMusic = null;
            this.musicGain = null;
            this.currentTrack = null;
        }
    }

    fadeMusic(volume, duration = 1) {
        if (this.musicGain) {
            this.musicGain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + duration);
        }
    }

    // Briefly drop the music volume so a big SFX moment punches through,
    // then ramp back up to the steady-state level (0.5).
    duckMusic(target = 0.12, duckTime = 0.3, recoverTime = 0.6) {
        if (!this.musicGain) return;
        const now = this.audioContext.currentTime;
        const current = this.musicGain.gain.value;
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setValueAtTime(current, now);
        this.musicGain.gain.linearRampToValueAtTime(target, now + duckTime);
        this.musicGain.gain.linearRampToValueAtTime(0.5, now + duckTime + recoverTime);
    }

    toggle() {
        this.enabled = !this.enabled;
    }

    // ── Mute / volume (persisted via Settings) ──
    setMuted(muted) {
        this.muted = !!muted;
        if (this.masterGain && this.audioContext) {
            const now = this.audioContext.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
            this.masterGain.gain.linearRampToValueAtTime(
                this.muted ? 0 : this.masterVolume,
                now + 0.15
            );
        }
        if (typeof Settings !== 'undefined') Settings.set('muted', this.muted);
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    setMasterVolume(vol) {
        this.masterVolume = Math.max(0, Math.min(1, vol));
        if (!this.muted && this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
        if (typeof Settings !== 'undefined') Settings.set('masterVolume', this.masterVolume);
    }

    setMusicVolume(vol) {
        this.musicVolume = Math.max(0, Math.min(1, vol));
        if (this.musicBus) {
            this.musicBus.gain.value = this.musicVolume;
        }
        if (typeof Settings !== 'undefined') Settings.set('musicVolume', this.musicVolume);
    }

    setSfxVolume(vol) {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
        if (this.sfxBus) {
            this.sfxBus.gain.value = this.sfxVolume;
        }
        if (typeof Settings !== 'undefined') Settings.set('sfxVolume', this.sfxVolume);
    }
}
