// Shared typing engine (GDD §4). One engine, two skins.
//
// Responsibilities kept here so the zombie mode can reuse them verbatim:
//   - input capture & normalisation (char / backspace)
//   - word matching against a target stream
//   - keystroke logging (the submission proof)
//   - WPM / accuracy via stats.js
//
// What lives in the *mode* (speedtest.js), not here: rendering, the timer,
// the leaderboard. The engine is an input sensor with a scoreboard.

import { KeystrokeLog } from "./keylog.js";
import { scoreHistory } from "./stats.js";

export class TypingEngine {
  // words: ordered array of target strings the player must type.
  constructor(words) {
    this.words = words;
    this.reset(words);
  }

  reset(words = this.words) {
    this.words = words;
    this.wordIndex = 0;
    this.input = ""; // typed chars for the current word
    this.history = []; // [{ target, typed }] for committed words
    this.keylog = new KeystrokeLog();
    this.started = false;
    this.finished = false;
  }

  get currentWord() {
    return this.words[this.wordIndex] ?? "";
  }

  // Feed one character. Space commits the current word. Returns true if the
  // event changed engine state (so the mode knows to re-render).
  pushChar(ch) {
    if (this.finished) return false;
    this.started = true;
    this.keylog.record(ch);

    if (ch === " ") {
      if (this.input.length === 0) return false; // ignore leading spaces
      this._commitWord();
      return true;
    }
    this.input += ch;
    return true;
  }

  // Backspace — corrections stay within the current word for this milestone.
  backspace() {
    if (this.finished || !this.started) return false;
    this.keylog.record("Backspace");
    if (this.input.length === 0) return false;
    this.input = this.input.slice(0, -1);
    return true;
  }

  _commitWord() {
    this.history.push({ target: this.currentWord, typed: this.input });
    this.wordIndex++;
    this.input = "";
  }

  // Freeze the run: commit any half-typed word so it counts, then lock input.
  finish() {
    if (this.finished) return;
    if (this.input.length > 0) this._commitWord();
    this.finished = true;
  }

  // Score the run. `elapsedMs` is supplied by the mode (the test duration),
  // since the Speed Test is time-boxed rather than log-bounded.
  stats(elapsedMs) {
    return scoreHistory(this.history, elapsedMs);
  }

  // Live stats mid-run — includes the word currently being typed.
  liveStats(elapsedMs) {
    const live = this.history.slice();
    if (this.input.length > 0) {
      live.push({ target: this.currentWord, typed: this.input });
    }
    return scoreHistory(live, elapsedMs);
  }
}
