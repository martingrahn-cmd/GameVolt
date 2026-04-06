console.log("AUDIO SAFE 1.0 LOADED");

// ============================================================
// AudioSystem – WAV Edition (iOS SAFE) + Music
// ============================================================

export class AudioSystem {
  constructor() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    this.urls = {
      ui:      "assets/audio/ui.wav",
      rotate:  "assets/audio/rotate.wav",
      soft:    "assets/audio/soft.wav",
      hard:    "assets/audio/hard.wav",
      clear:   "assets/audio/clear.wav",
      tetris:  "assets/audio/tetris.wav",
      levelup: "assets/audio/levelup.wav",
      gameover:"assets/audio/gameover.wav"
    };

    this.buffers = {};
    this.unlocked = false;
    
    // Musik
    this.musicUrl = "assets/audio/music.mp3";
    this.musicElement = null;
    this.musicGain = null;
    this.musicVolume = 0.4; // 40% volym
    this.sfxVolume = 1.0;  // SFX master volume multiplier (0-1)
    this.musicEnabled = localStorage.getItem("tetris_music") !== "false";
  }

  async initMusic() {
    if (this.musicElement) return;
    
    try {
      this.musicElement = new Audio(this.musicUrl);
      this.musicElement.loop = true;
      this.musicElement.volume = this.musicEnabled ? this.musicVolume : 0;
      
      // Preload
      this.musicElement.load();
    } catch (e) {
      console.warn("Could not init music:", e);
    }
  }

  playMusic() {
    if (!this.musicElement) return;
    if (!this.musicEnabled) return;
    
    this.musicElement.volume = this.musicVolume;
    this.musicElement.play().catch(e => console.warn("Music play failed:", e));
  }

  pauseMusic() {
    if (!this.musicElement) return;
    this.musicElement.pause();
  }

  stopMusic() {
    if (!this.musicElement) return;
    this.musicElement.pause();
    this.musicElement.currentTime = 0;
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    localStorage.setItem("tetris_music", enabled);
    
    if (this.musicElement) {
      if (enabled) {
        this.musicElement.volume = this.musicVolume;
        this.musicElement.play().catch(() => {});
      } else {
        this.musicElement.volume = 0;
      }
    }
  }

  isMusicEnabled() {
    return this.musicEnabled;
  }

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicElement) {
      this.musicElement.volume = this.musicEnabled ? this.musicVolume : 0;
    }
    // Treat volume 0 as disabled, >0 as enabled
    const shouldEnable = v > 0;
    if (shouldEnable !== this.musicEnabled) {
      this.musicEnabled = shouldEnable;
      localStorage.setItem("tetris_music", shouldEnable);
      if (shouldEnable && this.musicElement) {
        this.musicElement.play().catch(() => {});
      }
    }
  }

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    // Sync with the sound enabled option
    const enabled = v > 0;
    localStorage.setItem("tetris_sound", enabled);
  }

  play(name) {
    if (!this.unlocked) return;
    if (!this.buffers[name]) return;
    if (this.ctx.state === "suspended") return;
    
    // Kolla om ljud är avstängt
    const soundEnabled = localStorage.getItem("tetris_sound") !== "false";
    if (!soundEnabled) return;

    // Individuell volym per ljud
    const volumes = {
      rotate: 0.12,  // Mycket lågt - spelas ofta
      soft: 0.5,     // Lite sänkt
      hard: 0.7,
      clear: 0.35,   // Sänkt mer
      tetris: 0.9,
      levelup: 0.8,
      gameover: 0.7,
      ui: 0.6
    };
    
    const volume = (volumes[name] || 1.0) * this.sfxVolume;

    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers[name];

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = volume;
    
    src.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    src.start(0);
  }
}