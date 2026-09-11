(function (root) {
  "use strict";

  const BUTTONS = {
    accept: 0,
    back: 1,
    alt: 2,
    aux: 3,
    lb: 4,
    rb: 5,
    menu: 9,
    up: 12,
    down: 13,
    left: 14,
    right: 15,
  };

  class BlockStormGamepad {
    constructor(options) {
      options = options || {};
      this.navigator = options.navigator || root.navigator;
      this.requestFrame = options.requestFrame || root.requestAnimationFrame.bind(root);
      this.onAction = options.onAction || function () {};
      this.onStatus = options.onStatus || function () {};
      this.isHidden = options.isHidden || function () { return false; };
      this.preferredIndex = null;
      this.previous = {};
      this.heldDirections = {};
      this.running = false;
      this.connected = false;
      this.deadzone = 0.55;
      this.repeatDelay = 170;
      this.repeatRate = 55;
      this.softDropDelay = 90;
      this.softDropRate = 45;
      this.tick = this.tick.bind(this);
    }

    readPads() {
      if (!this.navigator || typeof this.navigator.getGamepads !== "function") return [];
      try { return Array.from(this.navigator.getGamepads() || []); }
      catch (error) { return []; }
    }

    isController(pad) {
      if (!pad || pad.connected === false) return false;
      const id = String(pad.id || "").toLowerCase();
      if (["audio", "headset", "headphone", "speaker", "microphone"].some(word => id.includes(word))) return false;
      return pad.mapping === "standard" || (pad.buttons && pad.buttons.length >= 10 && pad.axes && pad.axes.length >= 2);
    }

    hasActivity(pad) {
      if (!pad) return false;
      return Array.from(pad.buttons || []).some(button => button && button.pressed) ||
        Array.from(pad.axes || []).some(axis => Math.abs(axis || 0) > this.deadzone);
    }

    findPad(pads) {
      if (this.preferredIndex !== null && this.isController(pads[this.preferredIndex])) return pads[this.preferredIndex];
      const active = pads.find(pad => this.isController(pad) && this.hasActivity(pad));
      const selected = active || pads.find(pad => this.isController(pad)) || null;
      if (selected && active) this.preferredIndex = pads.indexOf(selected);
      return selected;
    }

    button(pad, name) {
      const button = pad.buttons && pad.buttons[BUTTONS[name]];
      return !!(button && button.pressed);
    }

    readState(pad) {
      const x = Number(pad.axes && pad.axes[0]) || 0;
      const y = Number(pad.axes && pad.axes[1]) || 0;
      return {
        left: this.button(pad, "left") || x < -this.deadzone,
        right: this.button(pad, "right") || x > this.deadzone,
        up: this.button(pad, "up") || y < -this.deadzone,
        down: this.button(pad, "down") || y > this.deadzone,
        accept: this.button(pad, "accept"),
        back: this.button(pad, "back"),
        alt: this.button(pad, "alt"),
        aux: this.button(pad, "aux"),
        lb: this.button(pad, "lb"),
        rb: this.button(pad, "rb"),
        menu: this.button(pad, "menu"),
      };
    }

    reset() {
      this.previous = {};
      this.heldDirections = {};
    }

    emitDirections(state, now) {
      ["left", "right", "down"].forEach(name => {
        if (!state[name]) {
          delete this.heldDirections[name];
          return;
        }
        const delay = name === "down" ? this.softDropDelay : this.repeatDelay;
        const rate = name === "down" ? this.softDropRate : this.repeatRate;
        const held = this.heldDirections[name];
        if (!held) {
          this.heldDirections[name] = { next: now + delay };
          this.onAction(name, false);
        } else if (now >= held.next) {
          held.next = now + rate;
          this.onAction(name, true);
        }
      });
      // Up is an edge-only hard drop; it must never repeat into the next piece.
      if (state.up && !this.previous.up) this.onAction("up", false);
    }

    update(now, suppliedPads) {
      if (this.isHidden()) {
        this.reset();
        return;
      }
      const pads = suppliedPads || this.readPads();
      const pad = this.findPad(pads);
      const isConnected = !!pad;
      if (isConnected !== this.connected) {
        this.connected = isConnected;
        this.onStatus(isConnected, pad ? String(pad.id || "Controller") : "");
      }
      if (!pad) {
        this.reset();
        return;
      }
      const state = this.readState(pad);
      this.emitDirections(state, now);
      ["accept", "back", "alt", "aux", "lb", "rb", "menu"].forEach(name => {
        if (state[name] && !this.previous[name]) this.onAction(name, false);
      });
      this.previous = state;
    }

    tick(now) {
      if (!this.running) return;
      this.update(now);
      this.requestFrame(this.tick);
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.requestFrame(this.tick);
    }

    stop() {
      this.running = false;
      this.reset();
    }
  }

  root.BlockStormGamepad = BlockStormGamepad;
})(typeof window !== "undefined" ? window : globalThis);
