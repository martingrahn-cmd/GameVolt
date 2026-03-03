export default class InputHandler {
  constructor(game, canvas) {
    this.game = game;
    this.hasUnlockedAudio = false;

    // Touch (listen on window for full-screen touch support)
    window.addEventListener('touchstart', (e) => this.handleUnlock(e), {passive: false});
    window.addEventListener('touchmove', (e) => this.onMove(e), {passive: false});
    window.addEventListener('touchend', (e) => {
      if (e.target.closest('#overlay, #pause-overlay, #pause-btn')) return;
      if (e.cancelable) e.preventDefault();
    }, {passive: false});

    // Mouse
    window.addEventListener('mousedown', (e) => this.handleUnlock(e));
    window.addEventListener('mousemove', (e) => this.onMove(e));

    // Keyboard
    this.keys = {};
    this.keyboardActive = false;
    window.addEventListener('keydown', (e) => {
      const ui = this.game.ui;
      const state = this.game.state;

      // Menu / Game Over: Enter or Space → START / RETRY
      if (e.key === 'Enter' || (e.key === ' ' && (state === 'menu' || state === 'gameover'))) {
        if (state === 'menu' || state === 'gameover') {
          e.preventDefault();
          if (ui) ui.onStartClick();
          return;
        }
      }

      // Game Over: C → CONTINUE LEVEL, Escape → MENU
      if (state === 'gameover') {
        if (e.key === 'c' || e.key === 'C') { if (ui) ui.onContinueClick(); return; }
        if (e.key === 'Escape') { e.preventDefault(); if (ui) ui.showMenu(); return; }
      }

      // Tab switching (menu, gameover, or paused): 1-5
      if (state === 'menu' || state === 'gameover' || this.game.paused) {
        var tabKeys = { '1': 'play', '2': 'scores', '3': 'trophies', '4': 'guide', '5': 'settings' };
        if (tabKeys[e.key]) { if (ui) ui.switchTab(tabKeys[e.key]); return; }
      }

      // Music toggle: M (any non-gameplay state)
      if ((e.key === 'm' || e.key === 'M') && state !== 'running') {
        if (ui) ui.toggleMusic();
        return;
      }

      // SFX toggle: F (any non-gameplay state)
      if ((e.key === 'f' || e.key === 'F') && state !== 'running') {
        if (ui) ui.toggleSfx();
        return;
      }

      // Gameplay keys
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        this.keys[e.key] = true;
        this.keyboardActive = true;
        if (e.key === ' ') this.onPress(e);
      }

      // Pause
      if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && state === 'running') {
        e.preventDefault();
        if (ui) ui.togglePause();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
        this.keys[e.key] = false;
      }
    });
  }

  updateKeyboard(dt) {
    if (!this.keyboardActive || this.game.state !== 'running' || this.game.paused) return;
    const speed = this.game.width * 0.8;
    if (this.keys['ArrowLeft']) {
      this.game.paddle.moveTo(this.game.paddle.x + this.game.paddle.width / 2 - speed * dt);
    }
    if (this.keys['ArrowRight']) {
      this.game.paddle.moveTo(this.game.paddle.x + this.game.paddle.width / 2 + speed * dt);
    }
  }

  handleUnlock(e) {
    // Don't prevent default on UI button clicks
    if (e.cancelable && !e.target.closest('#overlay, #pause-overlay, #pause-btn, .gv-btn, .tab-btn, .setting-toggle')) {
      e.preventDefault();
    }

    if (!this.hasUnlockedAudio) {
        this.game.audio.unlockIOS();
        this.game.audio.startMusicFlow();
        this.hasUnlockedAudio = true;
    }

    // Skip game actions if user clicked a UI element
    if (e.target.closest('#overlay, #pause-overlay, #pause-btn')) return;

    this.onPress(e);
  }

  onPress(e) {
    // Only handle gameplay actions (launch ball, shoot laser)
    if (this.game.state !== 'running' || this.game.paused) return;

    this.game.shootLaser();
    if (!this.game.ball.isLaunched) {
        this.game.ball.launch();
    }
  }

  onMove(e) {
    // Let overlay handle its own touch events (scroll etc.)
    if (e.target.closest('#overlay, #pause-overlay')) return;
    if (e.cancelable) e.preventDefault();
    if (this.game.state !== 'running' || this.game.paused) return;

    let clientX;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
    } else {
        clientX = e.clientX;
    }

    const canvasRect = this.game.canvas.getBoundingClientRect();
    const relativeX = clientX - canvasRect.left;
    const scaleX = this.game.width / canvasRect.width;
    const finalX = relativeX * scaleX;

    if (this.game.paddle && this.game.paddle.moveTo) {
        this.game.paddle.moveTo(finalX);
    }
  }
}
