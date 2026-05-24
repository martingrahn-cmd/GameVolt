// Keystroke log (GDD §4, §6.3). The compact [{t, k}, ...] proof a run
// submits to the server. t = ms since the first keypress (relative,
// monotonic), k = the character, or "Backspace" for a correction.
//
// Frontend-only milestone: nothing is submitted yet, but every run already
// produces a valid log so the validator can be wired in without touching
// the engine.

export class KeystrokeLog {
  constructor() {
    this.events = [];
    this.t0 = null;
  }

  // Record one keypress. `k` is the character or "Backspace".
  record(k) {
    const now = performance.now();
    if (this.t0 === null) this.t0 = now;
    this.events.push({ t: Math.round(now - this.t0), k });
  }

  reset() {
    this.events = [];
    this.t0 = null;
  }

  // Elapsed time derived from the log itself (last t − first t).
  // This is what the server trusts, never the client clock (GDD §6.3).
  elapsedMs() {
    if (this.events.length < 2) return 0;
    return this.events[this.events.length - 1].t;
  }

  // The payload a future submission would POST as {run_id, keystroke_log}.
  export() {
    return this.events.slice();
  }
}
