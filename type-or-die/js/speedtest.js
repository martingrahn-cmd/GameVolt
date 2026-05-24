// Speed Test mode (GDD §3.2). A running word stream, no action — the clean
// WPM surface and the SEO landing area. Wraps the shared TypingEngine with a
// time-boxed loop, rendering, a live HUD, and the local leaderboard.

import { TypingEngine } from "./engine.js";
import { generateWords } from "./words.js";
import { addScore, topScores } from "./leaderboard.js";
import { dailySeed, todayKey } from "./daily.js";
import { recordRun } from "./trophies.js";
import { remoteEnabled, startRun, submitRun, board } from "./api.js";

const MODE = "speedtest";
const WORD_BUFFER = 500; // enough words for a 60s run at superhuman WPM
const NAME_KEY = "tod_name";
const DURATION_KEY = "tod_duration";

const escapeMap = { "<": "&lt;", ">": "&gt;", "&": "&amp;" };
const escapeChar = (c) => escapeMap[c] ?? c;

export class SpeedTest {
  constructor() {
    this.duration = Number(localStorage.getItem(DURATION_KEY)) || 30;
    this.engine = null;
    this.wordEls = [];
    this.lineHeight = 0;
    this.timer = null;
    this.startMs = 0;
    this.state = "idle"; // idle | running | finished
    this.lastResult = null;
    this.enabled = false; // set by the mode switcher in main.js
    this.daily = false; // Daily Challenge — date-seeded run (GDD §3.3)
    this.onRunEnd = null; // versus hook — set by the shell for hot-seat 2P
    this.fixedSeed = null; // explicit seed (versus match); overrides daily
    this.runId = null; // server run id when playing a validated run
    this.ready = true; // false while a remote challenge is being fetched

    this.dom = {
      view: document.getElementById("view-speedtest"),
      trophies: document.getElementById("r-trophies"),
      trophyOverlay: document.getElementById("trophy-overlay"),
      words: document.getElementById("words"),
      viewport: document.getElementById("words-viewport"),
      hint: document.getElementById("hint"),
      liveTimer: document.getElementById("live-timer"),
      liveWpm: document.getElementById("live-wpm"),
      durationSeg: document.getElementById("duration-seg"),
      overlay: document.getElementById("overlay"),
      overlayRestart: document.getElementById("overlay-restart"),
      saveForm: document.getElementById("save-form"),
      nameInput: document.getElementById("name-input"),
      saveBtn: document.getElementById("save-btn"),
      resultSaved: document.getElementById("result-saved"),
      lbList: document.getElementById("lb-list"),
      lbEmpty: document.getElementById("lb-empty"),
      lbSub: document.getElementById("lb-sub"),
      r: {
        wpm: document.getElementById("r-wpm"),
        acc: document.getElementById("r-acc"),
        raw: document.getElementById("r-raw"),
        chars: document.getElementById("r-chars"),
        time: document.getElementById("r-time"),
        words: document.getElementById("r-words"),
      },
    };
  }

  init() {
    // Duration selector — picking a time restarts the run.
    this.dom.durationSeg.addEventListener("click", (e) => {
      const btn = e.target.closest(".seg-btn");
      if (!btn || this.daily) return; // Daily Challenge fixes the duration
      this.duration = Number(btn.dataset.duration);
      localStorage.setItem(DURATION_KEY, String(this.duration));
      this._syncDurationUI();
      this.newRun();
    });

    this.dom.overlayRestart.addEventListener("click", () => this.newRun());

    this.dom.saveForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this._saveScore();
    });

    document.addEventListener("keydown", (e) => this._onKeydown(e));
    window.addEventListener("resize", () => this._scrollToActive());

    this.dom.nameInput.value = localStorage.getItem(NAME_KEY) || "";
  }

  // Called by the mode switcher when this mode becomes visible.
  activate() {
    this.enabled = true;
    this.dom.view.hidden = false;
    this._syncDurationUI();
    this.newRun();
    this._renderLeaderboard();
  }

  deactivate() {
    this.enabled = false;
    clearInterval(this.timer);
    this.timer = null;
    this.dom.overlay.hidden = true;
    this.dom.view.hidden = true;
  }

  // Frame "restart" control (shared button, routed by the shell).
  restart() {
    this.newRun();
  }

  // Toggle the Daily Challenge (GDD §3.3). The daily run is fixed at 30s so
  // every player's challenge is directly comparable.
  setDaily(on) {
    this.daily = on;
    if (on) {
      this.duration = 30;
      localStorage.setItem(DURATION_KEY, "30");
    }
    if (this.enabled) {
      this._syncDurationUI();
      this.newRun();
      this._renderLeaderboard();
    }
  }

  // The leaderboard bucket — a fresh per-day bucket for daily runs.
  _bucket() {
    return this.daily
      ? `daily-${todayKey()}-${this.duration}`
      : String(this.duration);
  }

  // ---- run lifecycle ----------------------------------------------------

  newRun() {
    clearInterval(this.timer);
    this.timer = null;
    this.state = "idle";
    this.lastResult = null;
    this.runId = null;
    this.dom.overlay.hidden = true;
    this.dom.hint.classList.remove("is-hidden");
    this.dom.liveTimer.textContent = this.duration;
    this.dom.liveWpm.textContent = "0";

    // Validated run: the server owns the seed (GDD §6.3). Fetch a challenge,
    // then build. Versus matches stay local (no submission). On any hiccup,
    // fall back to a local seed (the run just isn't submitted).
    if (remoteEnabled() && this.fixedSeed == null) {
      this.ready = false;
      this.dom.words.replaceChildren();
      startRun(`speedtest-${this.duration}`, this.daily).then((ch) => {
        if (ch) {
          this.runId = ch.run_id;
          this._build(ch.seed >>> 0);
        } else {
          this._build(this._localSeed());
        }
      });
    } else {
      this._build(
        this.fixedSeed != null
          ? this.fixedSeed
          : this.daily
            ? dailySeed("speedtest")
            : this._localSeed(),
      );
    }
  }

  _localSeed() {
    return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  }

  _build(seed) {
    this.seed = seed;
    this.engine = new TypingEngine(generateWords(seed, WORD_BUFFER));
    this._buildWords();
    this._renderActiveWord();
    this._scrollToActive();
    this.ready = true;
  }

  _startTimer() {
    this.state = "running";
    this.startMs = performance.now();
    this.dom.hint.classList.add("is-hidden");
    this.timer = setInterval(() => this._tick(), 100);
  }

  _tick() {
    const elapsed = performance.now() - this.startMs;
    const remaining = Math.max(0, this.duration - elapsed / 1000);
    this.dom.liveTimer.textContent = Math.ceil(remaining);
    this.dom.liveWpm.textContent = this.engine.liveStats(elapsed).wpm;
    if (remaining <= 0) this._finishRun();
  }

  _finishRun() {
    clearInterval(this.timer);
    this.timer = null;
    this.state = "finished";
    this.engine.finish();

    const elapsedMs = this.duration * 1000;
    const s = this.engine.stats(elapsedMs);
    this.lastResult = s;

    // Hot-seat versus: hand the result to the shell, skip the solo overlay.
    if (this.onRunEnd) {
      recordRun({
        mode: MODE, wpm: s.wpm, accuracy: s.accuracy,
        words: s.cleanWords, daily: false, versus: true,
      });
      const cb = this.onRunEnd;
      this.onRunEnd = null;
      cb({ versusScore: s.wpm, summary: `${s.wpm} WPM · ${s.accuracy}% acc` });
      return;
    }

    this.dom.r.wpm.textContent = s.wpm;
    this.dom.r.acc.textContent = s.accuracy + "%";
    this.dom.r.raw.textContent = s.raw;
    this.dom.r.chars.textContent = `${s.correctChars}/${s.incorrectChars}`;
    this.dom.r.time.textContent = this.duration + "s";
    this.dom.r.words.textContent = s.cleanWords;

    this.dom.overlay.hidden = false;

    // Fold the run into the trophy profile (GDD §5) and surface unlocks.
    const unlocked = recordRun({
      mode: MODE,
      wpm: s.wpm,
      accuracy: s.accuracy,
      words: s.cleanWords,
      daily: this.daily,
      versus: false,
    });
    this._showTrophies(unlocked);

    if (this.runId) {
      // Validated run — the server scores it under the GameVolt profile, so
      // there's no local name entry. The keystroke log is the proof (§6.3).
      this.dom.saveForm.hidden = true;
      this.dom.resultSaved.hidden = false;
      submitRun({
        run_id: this.runId,
        keystroke_log: this.engine.keylog.export(),
      }).then(() => this._renderLeaderboard());
    } else {
      this.dom.resultSaved.hidden = true;
      this.dom.saveForm.hidden = false;
      this.dom.saveBtn.disabled = false;
      this.dom.nameInput.focus();
    }
  }

  _showTrophies(unlocked) {
    if (!unlocked.length) {
      this.dom.trophies.hidden = true;
      return;
    }
    this.dom.trophies.hidden = false;
    this.dom.trophies.textContent =
      "🏆 Unlocked: " + unlocked.map((t) => t.name).join(", ");
  }

  // ---- input ------------------------------------------------------------

  _onKeydown(e) {
    if (!this.enabled) return;
    if (!this.dom.trophyOverlay.hidden) return; // trophy modal is open
    if (e.key === "Tab") {
      e.preventDefault();
      this.newRun();
      return;
    }
    if (this.state === "finished") return; // overlay owns the keyboard
    if (e.target instanceof HTMLInputElement) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!this.ready || !this.engine) return; // remote challenge still loading

    if (e.key === "Backspace") {
      e.preventDefault();
      if (this.engine.backspace()) this._renderActiveWord();
      return;
    }
    if (e.key.length !== 1) return; // ignore Shift, arrows, F-keys, ...

    e.preventDefault();
    const wasIdle = this.state === "idle";
    const prevIndex = this.engine.wordIndex;
    if (!this.engine.pushChar(e.key)) return;

    if (wasIdle) this._startTimer();

    if (this.engine.wordIndex !== prevIndex) {
      this._renderWord(prevIndex); // finalise the committed word
      this._renderActiveWord();
      this._scrollToActive();
      if (this.engine.wordIndex >= this.engine.words.length) this._finishRun();
    } else {
      this._renderActiveWord();
    }
  }

  // ---- rendering --------------------------------------------------------

  _buildWords() {
    const frag = document.createDocumentFragment();
    this.wordEls = this.engine.words.map((_, i) => {
      const el = document.createElement("span");
      el.className = "word";
      this._renderWord(i, el);
      frag.appendChild(el);
      return el;
    });
    this.dom.words.replaceChildren(frag);
    this.lineHeight = this.wordEls[0]?.offsetHeight || 0;
  }

  // Render word `i`. Committed words use their typed result; the active word
  // uses live input + caret; future words render as plain pending text.
  _renderWord(i, el = this.wordEls[i]) {
    if (!el) return;
    const target = this.engine.words[i];
    const isActive = i === this.engine.wordIndex && this.state !== "finished";
    const committed = i < this.engine.wordIndex;
    const typed = committed ? this.engine.history[i].typed : this.engine.input;

    el.classList.toggle("word--active", isActive);

    if (!committed && !isActive) {
      el.textContent = target;
      el.classList.remove("word--bad");
      return;
    }

    const span = Math.max(target.length, typed.length);
    let html = "";
    let bad = false;
    for (let j = 0; j < span; j++) {
      if (isActive && j === typed.length) html += '<span class="caret"></span>';
      const tch = target[j];
      const ych = typed[j];
      if (ych === undefined) {
        html += `<span class="char pending">${tch}</span>`;
        bad = true;
      } else if (tch === undefined) {
        html += `<span class="char extra">${escapeChar(ych)}</span>`;
        bad = true;
      } else if (tch === ych) {
        html += `<span class="char correct">${tch}</span>`;
      } else {
        html += `<span class="char incorrect">${tch}</span>`;
        bad = true;
      }
    }
    if (isActive && typed.length >= span) html += '<span class="caret"></span>';
    el.innerHTML = html;
    el.classList.toggle("word--bad", committed && bad);
  }

  _renderActiveWord() {
    this._renderWord(this.engine.wordIndex);
  }

  // Keep the active word on the middle line of the viewport.
  _scrollToActive() {
    const el = this.wordEls[this.engine.wordIndex];
    if (!el || !this.lineHeight) return;
    const line = Math.round(el.offsetTop / this.lineHeight);
    const shift = Math.max(0, line - 1) * this.lineHeight;
    this.dom.words.style.transform = `translateY(${-shift}px)`;
  }

  // ---- leaderboard ------------------------------------------------------

  _saveScore() {
    if (!this.lastResult) return;
    const name = this.dom.nameInput.value.trim() || "Anonymous";
    localStorage.setItem(NAME_KEY, name);
    addScore({
      name,
      mode: MODE,
      bucket: this._bucket(),
      wpm: this.lastResult.wpm,
      accuracy: this.lastResult.accuracy,
    });
    this.dom.saveForm.hidden = true;
    this.dom.resultSaved.hidden = false;
    this._renderLeaderboard();
  }

  async _renderLeaderboard() {
    // Prefer the server-validated board when signed in; else the local one.
    if (remoteEnabled()) {
      const bucket = this.daily ? todayKey() : "all";
      const rows = await board(`speedtest-${this.duration}`, bucket, 10);
      if (rows) {
        this._paintBoard(
          rows.map((r) => ({ name: r.username, wpm: r.wpm, accuracy: r.accuracy })),
          this.daily ? `daily · ${todayKey()}` : `${this.duration}s · global`,
        );
        return;
      }
    }
    this._paintBoard(
      topScores(MODE, this._bucket(), ["wpm", "accuracy"]),
      this.daily ? `daily · ${todayKey()}` : this.duration + "s",
    );
  }

  _paintBoard(rows, sub) {
    this.dom.lbSub.textContent = sub;
    this.dom.lbEmpty.hidden = rows.length > 0;
    this.dom.lbList.replaceChildren(
      ...rows.map((r, i) => {
        const li = document.createElement("li");
        li.className = "lb-row" + (i === 0 ? " lb-row--top" : "");
        li.innerHTML =
          `<span class="lb-rank">${i + 1}</span>` +
          `<span class="lb-name"></span>` +
          `<span class="lb-wpm">${r.wpm} wpm</span>` +
          `<span class="lb-acc">${r.accuracy}%</span>`;
        li.querySelector(".lb-name").textContent = r.name;
        return li;
      }),
    );
  }

  _syncDurationUI() {
    this.dom.durationSeg.classList.toggle("is-locked", this.daily);
    for (const btn of this.dom.durationSeg.querySelectorAll(".seg-btn")) {
      btn.classList.toggle(
        "is-active",
        Number(btn.dataset.duration) === this.duration,
      );
    }
  }
}
