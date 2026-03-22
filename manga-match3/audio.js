/* ── Audio Manager (Web Audio API) ── */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.35;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    } catch { /* no audio support */ }
  }

  ensure() {
    if (!this.ctx) this.init();
    if (this.ctx?.state === "suspended") this.ctx.resume();
    return this.ctx && !this.muted;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
    return this.muted;
  }

  tone(freq, type, duration, { attack = 0.01, decay = duration, vol = 0.3, delay = 0, detune = 0 } = {}) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }

  noise(duration, { vol = 0.15, delay = 0, attack = 0.005 } = {}) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime + delay;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 3000;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  swap() {
    this.tone(520, "sine", 0.1, { vol: 0.25 });
    this.tone(680, "sine", 0.1, { delay: 0.05, vol: 0.2 });
  }

  invalidSwap() {
    this.tone(200, "square", 0.12, { vol: 0.15 });
    this.tone(160, "square", 0.12, { delay: 0.08, vol: 0.12 });
  }

  match(chain = 1) {
    const base = 440 + chain * 80;
    this.tone(base, "sine", 0.15, { vol: 0.25 });
    this.tone(base * 1.25, "sine", 0.12, { delay: 0.06, vol: 0.2 });
    this.tone(base * 1.5, "sine", 0.1, { delay: 0.12, vol: 0.18 });
  }

  cascade(chain = 1) {
    const base = 500 + chain * 100;
    this.tone(base, "triangle", 0.12, { vol: 0.2 });
    this.tone(base * 1.33, "triangle", 0.1, { delay: 0.05, vol: 0.18 });
    this.tone(base * 1.67, "triangle", 0.08, { delay: 0.1, vol: 0.15 });
  }

  specialCreate() {
    this.tone(600, "sine", 0.2, { vol: 0.3 });
    this.tone(800, "sine", 0.18, { delay: 0.08, vol: 0.25 });
    this.tone(1050, "sine", 0.25, { delay: 0.16, vol: 0.2 });
    this.noise(0.15, { vol: 0.08, delay: 0.1 });
  }

  lineBlast() {
    this.noise(0.2, { vol: 0.12 });
    this.tone(300, "sawtooth", 0.2, { vol: 0.15 });
    this.tone(600, "sine", 0.15, { delay: 0.05, vol: 0.2 });
    this.tone(900, "sine", 0.1, { delay: 0.1, vol: 0.15 });
  }

  bombBlast() {
    this.tone(80, "sine", 0.35, { vol: 0.35, attack: 0.005 });
    this.tone(120, "square", 0.2, { vol: 0.15, delay: 0.02 });
    this.noise(0.25, { vol: 0.18 });
  }

  colorBlast() {
    for (let i = 0; i < 5; i++) {
      this.tone(400 + i * 150, "sine", 0.15, { delay: i * 0.06, vol: 0.2 - i * 0.02 });
    }
    this.noise(0.3, { vol: 0.1, delay: 0.05 });
  }

  feverActivate() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      this.tone(f, "sine", 0.2, { delay: i * 0.08, vol: 0.25 });
      this.tone(f, "triangle", 0.15, { delay: i * 0.08 + 0.02, vol: 0.1 });
    });
  }

  levelComplete() {
    const melody = [523, 659, 784, 880, 1047];
    melody.forEach((f, i) => {
      this.tone(f, "sine", 0.25, { delay: i * 0.12, vol: 0.25 });
      this.tone(f * 0.5, "triangle", 0.2, { delay: i * 0.12 + 0.03, vol: 0.1 });
    });
  }

  gameOver() {
    const notes = [440, 370, 311, 261];
    notes.forEach((f, i) => {
      this.tone(f, "sine", 0.3, { delay: i * 0.15, vol: 0.2 });
    });
  }

  spawn() { this.tone(800, "sine", 0.06, { vol: 0.1 }); this.tone(1000, "sine", 0.05, { delay: 0.03, vol: 0.08 }); }
  gravity() { this.tone(250, "sine", 0.08, { vol: 0.08 }); }
  select() { this.tone(660, "sine", 0.06, { vol: 0.15 }); }
  deselect() { this.tone(440, "sine", 0.05, { vol: 0.1 }); }
  hint() { this.tone(880, "sine", 0.1, { vol: 0.08 }); this.tone(1100, "sine", 0.08, { delay: 0.1, vol: 0.06 }); }
  uiClick() { this.tone(700, "sine", 0.04, { vol: 0.12 }); }
  purchase() { this.tone(523, "sine", 0.1, { vol: 0.2 }); this.tone(784, "sine", 0.15, { delay: 0.08, vol: 0.25 }); this.noise(0.08, { vol: 0.06, delay: 0.08 }); }
}

export const sfx = new AudioManager();
