// Synthesised sound (GDD §8) — Web Audio, no asset files (keeps the bundle
// light for GitHub Pages). The AudioContext is created lazily on the first
// real keypress, since browsers block audio before a user gesture.
//
// Palette: a short hit per killed zombie whose pitch rises with the combo
// (the "combo stinger"), plus a low ambient drone while a run is live.

export class AudioKit {
  constructor() {
    this.ctx = null;
    this.master = null; // mute gate
    this.musicGain = null; // music volume bus
    this.sfxGain = null; // sound-effects volume bus
    this.muted = false;
    this.music = null; // playing layers { calm, intense }
    this.musicBuffers = null; // decoded track buffers (cached across runs)
    this.musicLoading = false;
    this._intense = false; // which track is currently selected

    const vol = (k, d) => {
      const v = parseFloat(localStorage.getItem(k));
      return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d;
    };
    this.musicVol = vol("tod_music_vol", 0.6);
    this.sfxVol = vol("tod_sfx_vol", 0.85);
  }

  // Create the audio graph if needed (call from within a user gesture).
  // Returns false if Web Audio is unavailable.
  _ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false; // no Web Audio — run silently
      this.ctx = new AC();
      // master = mute gate; music + SFX have their own volume buses.
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVol;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVol;
      this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return true;
  }

  // Start the run's music (call from within a user gesture).
  start() {
    if (this._ensureCtx()) this._startMusic();
  }

  // UI feedback — a crisp click on activation, a soft tick on focus moves.
  // These also unlock the audio context on the menu's first interaction.
  uiClick() {
    if (!this._ensureCtx()) return;
    this._blip({ freq: 680, slideTo: 1020, dur: 0.045, type: "square", vol: 0.16 });
  }

  uiMove() {
    if (!this._ensureCtx()) return;
    this._blip({ freq: 500, dur: 0.022, type: "square", vol: 0.08 });
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 1;
  }

  setMusicVolume(v) {
    this.musicVol = Math.min(1, Math.max(0, v));
    localStorage.setItem("tod_music_vol", String(this.musicVol));
    if (this.musicGain) this.musicGain.gain.value = this.musicVol;
  }

  setSfxVolume(v) {
    this.sfxVol = Math.min(1, Math.max(0, v));
    localStorage.setItem("tod_sfx_vol", String(this.sfxVol));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVol;
  }

  // One short enveloped tone, optionally pitch-sliding.
  _blip({ freq, slideTo = null, dur = 0.1, type = "square", vol = 0.25 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, freq), t);
    if (slideTo) {
      o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    }
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // Adaptive music — two looping tracks (calm + intense). The game switches
  // between them via setMusicTrack() (calm on normal waves, intense on
  // bosses). The tracks are generated externally (Suno) and dropped into
  // assets/music/; if they are absent the game simply runs without music.
  async _startMusic() {
    if (!this.ctx || this.music || this.musicLoading) return;
    this.musicLoading = true;
    if (!this.musicBuffers) this.musicBuffers = await this._loadMusic();
    this.musicLoading = false;
    if (this.music) return; // a parallel start already won

    const b = this.musicBuffers;
    if (!b || (!b.calm && !b.intense)) return; // no tracks on disk

    // Both loops start at the same instant so they stay phase-aligned.
    const at = this.ctx.currentTime + 0.05;
    const layer = (buffer, gainValue) => {
      if (!buffer) return null;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = gainValue;
      src.connect(g);
      g.connect(this.musicGain);
      src.start(at);
      return { src, g };
    };
    this.music = {
      calm: layer(b.calm, 1),
      intense: layer(b.intense, 0),
    };
    this._intense = false; // every run opens on the calm track
    this.setMusicTrack(false);
  }

  async _loadMusic() {
    const out = {};
    for (const name of ["calm", "intense"]) {
      try {
        const res = await fetch(`assets/music/${name}.mp3`);
        if (!res.ok) continue;
        out[name] = await this.ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        /* track missing or undecodable — run without it */
      }
    }
    return out;
  }

  // Pick which track plays: false = calm (normal waves), true = intense
  // (boss waves). The two are independent loops that would clash if layered,
  // so only one is audible — this crossfades to the chosen one over ~1.2s.
  // The game calls it during the between-wave breather, so the switch lands
  // before the next wave begins.
  setMusicTrack(intense) {
    this._intense = !!intense;
    if (!this.music || !this.ctx) return;
    const t = this.ctx.currentTime;
    const fade = 2.5; // soft crossfade
    if (this.music.calm) {
      this.music.calm.g.gain.setTargetAtTime(this._intense ? 0 : 1, t, fade);
    }
    if (this.music.intense) {
      this.music.intense.g.gain.setTargetAtTime(this._intense ? 1 : 0, t, fade);
    }
  }

  // Stop the music (between runs / on game over). Kept named stopAmbient so
  // the rest of the game's calls are unchanged.
  stopAmbient() {
    if (!this.music) return;
    for (const lyr of [this.music.calm, this.music.intense]) {
      if (lyr) {
        try {
          lyr.src.stop();
        } catch {
          /* already stopped */
        }
      }
    }
    this.music = null;
  }

  // ---- event sounds -----------------------------------------------------

  tick() {
    this._blip({ freq: 1400, dur: 0.025, type: "square", vol: 0.06 });
  }

  // killed a zombie — pitch climbs with the combo (the combo stinger)
  kill(combo = 0) {
    const f = 200 + Math.min(combo, 40) * 28;
    this._blip({ freq: f, slideTo: f * 0.4, dur: 0.18, type: "sawtooth", vol: 0.22 });
    this._blip({ freq: f * 2, slideTo: f, dur: 0.12, type: "square", vol: 0.12 });
  }

  // completed one word of a boss phrase
  bossHit(combo = 0) {
    const f = 380 + Math.min(combo, 40) * 18;
    this._blip({ freq: f, slideTo: f * 1.5, dur: 0.12, type: "square", vol: 0.2 });
  }

  miss() {
    this._blip({ freq: 150, slideTo: 90, dur: 0.12, type: "square", vol: 0.2 });
  }

  hurt() {
    this._blip({ freq: 95, slideTo: 45, dur: 0.38, type: "sawtooth", vol: 0.4 });
  }

  wave() {
    this._blip({ freq: 440, slideTo: 880, dur: 0.32, type: "triangle", vol: 0.22 });
  }

  // One beep per second of the between-wave countdown — pitch rises as it
  // nears zero.
  countdown(n = 0) {
    const f = 360 + Math.max(0, 6 - n) * 60;
    this._blip({ freq: f, dur: 0.08, type: "square", vol: 0.2 });
  }

  // "Here they come" — a wave begins.
  newWave() {
    this._blip({ freq: 330, slideTo: 660, dur: 0.18, type: "sawtooth", vol: 0.3 });
    this._blip({ freq: 165, slideTo: 240, dur: 0.32, type: "square", vol: 0.22 });
  }

  boss() {
    this._blip({ freq: 70, slideTo: 38, dur: 0.8, type: "sawtooth", vol: 0.42 });
  }

  nuke() {
    this._blip({ freq: 120, slideTo: 1500, dur: 0.55, type: "sawtooth", vol: 0.32 });
  }

  slowmo() {
    this._blip({ freq: 700, slideTo: 180, dur: 0.6, type: "sine", vol: 0.3 });
  }

  gameover() {
    this._blip({ freq: 240, slideTo: 50, dur: 1.0, type: "sawtooth", vol: 0.4 });
  }
}
