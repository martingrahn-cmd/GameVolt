// ============================================================
// Audio.js — Neo Mode Music & Visualizer
// ============================================================
// Web Audio API for music playback and real-time frequency analysis

export class AudioNeo {
    constructor() {
        this.ctx = null;
        this.analyser = null;
        this.source = null;
        this.audio = null;
        this.isPlaying = false;
        this.isUnlocked = false;
        
        // Frequency data for visualizer
        this.frequencyData = null;
        this.timeDomainData = null;
        
        // Smoothed values for effects
        this.bass = 0;
        this.mid = 0;
        this.high = 0;
        this.overall = 0;
        
        // Beat detection
        this.lastBass = 0;
        this.beatThreshold = 1.3;
        this.beatDecay = 0.98;
        this.isBeat = false;
    }

    // Initialize audio context (must be called after user interaction)
    async init() {
        if (this.ctx) return;
        
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create analyser node
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.frequencyData = new Uint8Array(bufferLength);
            this.timeDomainData = new Uint8Array(bufferLength);
            
            console.log("🎵 Audio context initialized");
            this.isUnlocked = true;
        } catch (e) {
            console.error("❌ Audio init failed:", e);
        }
    }

    // Unlock audio on iOS (call from user gesture)
    async unlock() {
        if (this.isUnlocked) return;
        
        await this.init();
        
        if (this.ctx && this.ctx.state === "suspended") {
            await this.ctx.resume();
        }
    }

    // Load and play music
    async playMusic(url) {
        // Prevent race condition - don't start if already starting
        if (this._isStarting) return;
        this._isStarting = true;
        
        await this.init();
        
        if (!this.ctx) {
            this._isStarting = false;
            return;
        }
        
        try {
            // Stop current music if playing
            this.stopMusic();
            
            // Create audio element
            this.audio = new Audio(url);
            this.audio.loop = true;
            this.audio.volume = 0.7;
            
            // Connect to Web Audio API for analysis
            this.source = this.ctx.createMediaElementSource(this.audio);
            this.source.connect(this.analyser);
            this.analyser.connect(this.ctx.destination);
            
            // Start playback
            await this.audio.play();
            this.isPlaying = true;
            
            console.log("🎵 Music started");
        } catch (e) {
            console.error("❌ Music playback failed:", e);
        }
        
        this._isStarting = false;
    }

    stopMusic() {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.audio = null;
        }
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        this.isPlaying = false;
    }

    // Toggle music on/off
    toggleMusic() {
        if (!this.audio) return;
        
        if (this.audio.paused) {
            this.audio.play();
            this.isPlaying = true;
        } else {
            this.audio.pause();
            this.isPlaying = false;
        }
    }

    // Resume music if it was playing (for restart/continue)
    resumeMusic() {
        if (this.audio && this.audio.paused) {
            this.audio.play().catch(() => {});
            this.isPlaying = true;
        }
    }

    // Ensure music is playing (start if not)
    async ensurePlaying(url) {
        if (this.isPlaying && this.audio && !this.audio.paused) return;
        
        if (this.audio) {
            // Just resume if we have audio loaded
            try {
                await this.audio.play();
                this.isPlaying = true;
            } catch (e) {
                // Need to reload
                await this.playMusic(url);
            }
        } else {
            await this.playMusic(url);
        }
    }

    setVolume(vol) {
        if (this.audio) {
            this.audio.volume = Math.max(0, Math.min(1, vol));
        }
    }

    // Update frequency analysis (call every frame)
    update() {
        if (!this.analyser || !this.frequencyData) return;
        
        this.analyser.getByteFrequencyData(this.frequencyData);
        this.analyser.getByteTimeDomainData(this.timeDomainData);
        
        const len = this.frequencyData.length;
        
        // Calculate frequency bands
        // Bass: 0-10 (roughly 0-300Hz)
        // Mid: 10-50 (roughly 300-1500Hz)  
        // High: 50+ (1500Hz+)
        
        let bassSum = 0, midSum = 0, highSum = 0;
        
        for (let i = 0; i < len; i++) {
            const val = this.frequencyData[i] / 255;
            
            if (i < 10) bassSum += val;
            else if (i < 50) midSum += val;
            else highSum += val;
        }
        
        // Normalize and smooth
        const smoothing = 0.3;
        this.bass = this.bass * (1 - smoothing) + (bassSum / 10) * smoothing;
        this.mid = this.mid * (1 - smoothing) + (midSum / 40) * smoothing;
        this.high = this.high * (1 - smoothing) + (highSum / (len - 50)) * smoothing;
        this.overall = (this.bass + this.mid + this.high) / 3;
        
        // Beat detection (bass spike)
        this.isBeat = false;
        if (this.bass > this.lastBass * this.beatThreshold && this.bass > 0.3) {
            this.isBeat = true;
        }
        this.lastBass = this.lastBass * this.beatDecay + this.bass * (1 - this.beatDecay);
    }

    // Get values for visualizer
    getBass() { return this.bass; }
    getMid() { return this.mid; }
    getHigh() { return this.high; }
    getOverall() { return this.overall; }
    hasBeat() { return this.isBeat; }
    
    // Get raw frequency data for spectrum visualizer
    getFrequencyData() {
        return this.frequencyData;
    }
    
    // Get specific frequency range (0-1 normalized)
    getFrequencyRange(start, end) {
        if (!this.frequencyData) return 0;
        
        let sum = 0;
        const len = this.frequencyData.length;
        const startIdx = Math.floor(start * len);
        const endIdx = Math.floor(end * len);
        
        for (let i = startIdx; i < endIdx && i < len; i++) {
            sum += this.frequencyData[i] / 255;
        }
        
        return sum / (endIdx - startIdx);
    }
}

// Singleton instance
export const audioNeo = new AudioNeo();