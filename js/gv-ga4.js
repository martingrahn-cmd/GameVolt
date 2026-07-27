// GameVolt — GA4 gameplay tracking (shared by every game).
//
// Replaces the inline copy that had been pasted into 13 games and drifted.
//
// WHAT CHANGED, AND WHY IT MATTERED
// The old tracker sent `game_start` from start(), which games call while the
// page is initialising. So `game_start` counted *page loads*, and the 30s/60s
// milestones counted *how long a tab stayed open* — an idle background tab
// scored the same as someone playing. In the 29 Jun–26 Jul export that read as
// 253 users "starting a game" and 121 "playing 30s", while `level_start` — the
// only event requiring a real click — showed 11. Decisions were being made on
// a number roughly 23x too high.
//
// Now:
//   start(name)  arms the tracker. Sends nothing.
//   play()       the game actually began — sends `game_start`, once. Called
//                explicitly by the game, or automatically on the player's first
//                real input (pointer/key/touch) as a fallback.
//   30s/60s      measured from the real start, and paused while the tab is
//                hidden, so they mean "played that long", not "left open".
//   end()        only reports if play() ever happened; a bounce is not a game.
(function () {
    'use strict';

    // Games arm the tracker at different moments: some at page load (before the
    // player has touched anything), others only once play has actually begun —
    // by which point the player HAS interacted. Track that globally so start()
    // can tell the two apart, instead of making the second kind wait for a
    // further input that may never come.
    var interacted = false;
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
        document.addEventListener(evt, function () { interacted = true; }, { passive: true, capture: true });
    });

    var T = {
        gameName: null,
        startTime: null,      // when play actually began
        armed: false,
        started: false,
        ended: false,
        activeMs: 0,          // foreground time since play began
        _lastTick: null,
        hasTracked30s: false,
        hasTracked60s: false,
        timerInterval: null,

        // Called at load. Prepares tracking without claiming a session.
        start: function (name) {
            if (this.started && !this.ended) return;   // already playing
            this.gameName = name;
            this.armed = true;
            this.started = false;
            this.ended = false;
            this.activeMs = 0;
            this.hasTracked30s = false;
            this.hasTracked60s = false;
            // Armed only once play has begun (the player already clicked to get
            // here) — count it now. Armed at page load — wait for real input.
            if (interacted) this.play();
            else this._listenForFirstInput();
        },

        // The player actually started playing. Safe to call repeatedly.
        play: function () {
            if (!this.armed || this.started) return;
            this.started = true;
            this.startTime = Date.now();
            this._lastTick = this.startTime;
            this._removeFirstInput();
            this._send('game_start', { game_name: this.gameName });
            if (this.timerInterval) clearInterval(this.timerInterval);
            var self = this;
            this.timerInterval = setInterval(function () { self._tick(); }, 2000);
        },

        track: function (name, params) {
            params = params || {};
            params.game_name = this.gameName;
            // A custom gameplay event proves play even if the game never called
            // play() — don't let a game report levels it never "started".
            if (name === 'level_start') this.play();
            this._send(name, params);
        },

        end: function (opts) {
            if (this.ended) return;
            // Never played: nothing to report. Prevents bounces landing in GA4
            // as zero-second games and diluting every average.
            if (!this.started) { this.ended = true; this._stopTimer(); return; }
            this.ended = true;
            this._accumulate();
            opts = opts || {};
            this._send('game_end', {
                game_name: this.gameName,
                play_time_seconds: Math.round(this.activeMs / 1000),
                score: opts.score || null,
                level: opts.level || null,
                outcome: opts.outcome || 'page_exit'
            });
            this._stopTimer();
        },

        // ---- internals ----

        _stopTimer: function () {
            if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
        },

        // Only count time while the tab is actually in front.
        _accumulate: function () {
            if (!this.started || this._lastTick == null) return;
            var now = Date.now();
            if (!document.hidden) this.activeMs += now - this._lastTick;
            this._lastTick = now;
        },

        _tick: function () {
            this._accumulate();
            var s = this.activeMs / 1000;
            if (s >= 30 && !this.hasTracked30s) {
                this.hasTracked30s = true;
                this._send('game_play_30s', { game_name: this.gameName });
            }
            if (s >= 60 && !this.hasTracked60s) {
                this.hasTracked60s = true;
                this._send('game_play_60s', { game_name: this.gameName });
                this._stopTimer();   // nothing left to watch for
            }
        },

        // Fallback for games that never call play() themselves: the first real
        // input on the page counts as starting. Scroll and mousemove are
        // deliberately excluded — they happen while reading, not playing.
        _listenForFirstInput: function () {
            if (this._firstInput) return;
            var self = this;
            this._firstInput = function () { self.play(); };
            ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
                document.addEventListener(evt, self._firstInput, { passive: true });
            });
        },

        _removeFirstInput: function () {
            if (!this._firstInput) return;
            var self = this;
            ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
                document.removeEventListener(evt, self._firstInput);
            });
            this._firstInput = null;
        },

        _send: function (name, params) {
            // Inside the portal iframe, hand off to the parent page's GA4.
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'gamevolt_ga4', event: name, params: params }, '*');
                return;
            }
            if (typeof gtag === 'function') { gtag('event', name, params); return; }
        }
    };

    document.addEventListener('visibilitychange', function () { T._accumulate(); });
    window.addEventListener('pagehide', function () { T.end({ outcome: 'page_exit' }); });

    window.GameVoltTracker = T;
})();
