console.log("INPUT SAFE 1.0 LOADED");

export class Input {
  constructor(game) {
    this.game = game;

    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.touchMoved = false;
    this.lastMoveX = 0;

    // DAS (Delayed Auto Shift) för tangentbord
    this.dasDelay = 170;  // ms innan repeat startar
    this.dasRate = 50;    // ms mellan repeats
    this.dasKey = null;
    this.dasTimer = null;
    this.dasRepeating = false;

    document.addEventListener("keydown", e => this.onKeyDown(e));
    document.addEventListener("keyup", e => this.onKeyUp(e));

    const canvas = document.getElementById("gameCanvas");

    canvas.addEventListener("touchstart", e => {
      e.preventDefault();
      const t = e.touches[0];
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      this.touchStartTime = Date.now();
      this.touchMoved = false;
      this.lastMoveX = t.clientX;
    }, { passive: false });

    canvas.addEventListener("touchmove", e => {
      e.preventDefault();
      this.handleTouchMove(e);
    }, { passive: false });

    canvas.addEventListener("touchend", e => {
      e.preventDefault();
      this.handleTouchEnd(e);
    }, { passive: false });
  }

  onKeyDown(e) {
    // Paus (fungerar alltid under spel)
    if (e.key === "Escape" || e.key === "p" || e.key === "P") {
      // Bara om spelet körs och inte game over
      if (this.game.running && !this.game.gameOver) {
        this.game.togglePause();
      }
      return;
    }
    
    // Ignorera input om pausat eller game over
    if (this.game.paused || this.game.gameOver) return;
    
    // Ignorera om inte spelet körs
    if (!this.game.running) return;
    
    // Ignorera om redan hanteras
    if (this.dasKey === e.key) return;

    switch (e.key) {
      case "ArrowLeft":
        this.game.moveLeft();
        this.startDAS("ArrowLeft", () => this.game.moveLeft());
        break;
      case "ArrowRight":
        this.game.moveRight();
        this.startDAS("ArrowRight", () => this.game.moveRight());
        break;
      case "ArrowDown":
        this.game.softDrop();
        this.startDAS("ArrowDown", () => this.game.softDrop());
        break;
      case "ArrowUp":
      case "x":
        this.game.rotateCW();
        break;
      case "z":
      case "Control":
        this.game.rotateCCW();
        break;
      case " ":
        this.game.hardDrop();
        break;
    }
  }

  onKeyUp(e) {
    if (this.dasKey === e.key) {
      this.stopDAS();
    }
  }

  startDAS(key, action) {
    this.stopDAS();
    this.dasKey = key;
    this.dasRepeating = false;

    this.dasTimer = setTimeout(() => {
      this.dasRepeating = true;
      this.dasTimer = setInterval(action, this.dasRate);
    }, this.dasDelay);
  }

  stopDAS() {
    if (this.dasTimer) {
      clearTimeout(this.dasTimer);
      clearInterval(this.dasTimer);
      this.dasTimer = null;
    }
    this.dasKey = null;
    this.dasRepeating = false;
  }

  handleTouchMove(e) {
    const t = e.touches[0];
    const dx = t.clientX - this.lastMoveX;
    const threshold = 30; // Pixlar per flytt

    // Horisontell swipe - kontinuerlig
    if (Math.abs(dx) >= threshold) {
      this.touchMoved = true;
      if (dx > 0) {
        this.game.moveRight();
      } else {
        this.game.moveLeft();
      }
      this.lastMoveX = t.clientX;
    }

    // Vertikal swipe ner - soft drop
    const dy = t.clientY - this.touchStartY;
    if (dy > 50 && !this.softDropTriggered) {
      this.touchMoved = true;
      this.softDropTriggered = true;
      // Flera soft drops vid drag ner
      const drops = Math.floor(dy / 30);
      for (let i = 0; i < Math.min(drops, 3); i++) {
        this.game.softDrop();
      }
    }
  }

  handleTouchEnd(e) {
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    const duration = Date.now() - this.touchStartTime;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    this.softDropTriggered = false;

    // Snabb tap = rotera
    if (!this.touchMoved && duration < 200 && absX < 10 && absY < 10) {
      this.game.rotateCW();
      return;
    }

    // Snabb swipe upp = hard drop
    if (absY > absX && dy < -50 && duration < 300) {
      this.game.hardDrop();
      return;
    }

    // Längre tryck utan rörelse = rotera CCW
    if (!this.touchMoved && duration > 300) {
      this.game.rotateCCW();
      return;
    }
  }
}