import { ACHIEVEMENTS, loadBOData, saveBOData } from './Achievements.js';
import { LEADERBOARD_MODE } from './Scoring.js';
import {
  MAX_SELECTABLE_LEVEL,
  clampStartLevel,
  getHorizontalLevelTarget,
  getMaxUnlockedStartLevel,
  getVerticalLevelTarget,
  isRankedStartLevel
} from './LevelSelect.js';

function _escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

export default class UIManager {
  constructor(game) {
    this.game = game;
    this.boData = loadBOData();
    let savedStartLevel = 1;
    try {
      savedStartLevel = parseInt(localStorage.getItem('bo_start_level'), 10) || 1;
    } catch (e) {}
    this.selectedStartLevel = clampStartLevel(savedStartLevel, this.boData.bestLevel);
    // Per-game stats (reset each game)
    this.pg = {};
    this.levelsWithoutDeath = 0;
    this.laserBricksThisActivation = 0;

    this.setupDOM();
    this.setupListeners();
    this.updateSettingsUI();
    this.showMenu();
  }

  // --- DOM SETUP ---

  setupDOM() {
    this.overlay = document.getElementById('overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.pauseBtn = document.getElementById('pause-btn');
    this.startBtn = document.getElementById('start-btn');
    this.startLevelPicker = document.getElementById('start-level-picker');
    this.startLevelGrid = document.getElementById('start-level-grid');
    this.startLevelValue = document.getElementById('start-level-value');
    this.startLevelMode = document.getElementById('start-level-mode');
    this.continueBtn = document.getElementById('continue-btn');
    this.menuBtn = document.getElementById('menu-btn');
    this.gameTitle = document.getElementById('game-title');
    this.gameSubtitle = document.getElementById('game-subtitle');
    this.finalLevel = document.getElementById('final-level');
    this.finalScore = document.getElementById('final-score');
    this.bestScore = document.getElementById('best-score');
    this.menuHiscore = document.getElementById('menu-hiscore');
    this.trophyGrid = document.getElementById('trophy-grid');
    this.trophyCount = document.getElementById('trophy-count');
    this.scoresList = document.getElementById('scores-list');
    this.scoresEmpty = document.getElementById('scores-empty');
    this.musicBtn = document.getElementById('music-btn');
    this.sfxBtn = document.getElementById('sfx-btn');
    this.fxBtn = document.getElementById('fx-btn');
    this.shakeBtn = document.getElementById('shake-btn');
    this.pauseResume = document.getElementById('pause-resume');
    this.instructions = document.getElementById('instructions');
    this.studioCredit = document.getElementById('studio-credit');

    this.lbToggle = document.getElementById('lb-toggle');
    this.lbLocalBtn = document.getElementById('lb-local-btn');
    this.lbGlobalBtn = document.getElementById('lb-global-btn');
    this._lbCache = null;
    this._lbView = 'local';
  }

  setupListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.addEventListener('click', () => this.switchTab(b.dataset.tab));
    });
    this.overlay.addEventListener('pointerdown', () => this.clearMenuFocus(), { passive: true });

    // Buttons
    this.startBtn.addEventListener('click', () => this.onStartClick());
    this.continueBtn.addEventListener('click', () => this.onContinueClick());
    this.menuBtn.addEventListener('click', () => this.showMenu());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.pauseResume.addEventListener('click', () => this.togglePause());

    // Settings
    this.musicBtn.addEventListener('click', () => this.toggleMusic());
    this.sfxBtn.addEventListener('click', () => this.toggleSfx());
    this.fxBtn.addEventListener('click', () => this.cycleEffects());
    this.shakeBtn.addEventListener('click', () => this.toggleShake());

    // Leaderboard toggle
    this.lbLocalBtn.addEventListener('click', () => {
      this._lbView = 'local';
      this.lbLocalBtn.classList.add('active');
      this.lbGlobalBtn.classList.remove('active');
      this.renderScores();
    });
    this.lbGlobalBtn.addEventListener('click', () => {
      this._lbView = 'global';
      this.lbGlobalBtn.classList.add('active');
      this.lbLocalBtn.classList.remove('active');
      this.renderScores();
    });
  }

  // --- TAB SYSTEM ---

  switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === name)
    );
    document.querySelectorAll('.tab-content').forEach(c =>
      c.classList.toggle('active', c.id === 'tab-' + name)
    );
    if (name === 'scores') this.renderScores();
    if (name === 'trophies') this.renderTrophyGrid();
  }

  getActiveTabButton() {
    return document.querySelector('.tab-btn.active');
  }

  getActiveTabControls() {
    const activeContent = document.querySelector('.tab-content.active');
    if (!activeContent) return [];
    return Array.from(activeContent.querySelectorAll('button, [tabindex]:not([tabindex="-1"])'))
      .filter(element =>
        !element.disabled &&
        element.tabIndex >= 0 &&
        element.offsetParent !== null
      );
  }

  clearMenuFocus() {
    this.overlay.querySelectorAll('.menu-key-focus').forEach(element => {
      element.classList.remove('menu-key-focus');
    });
  }

  focusMenuElement(element) {
    if (!element) return false;
    this.clearMenuFocus();
    element.classList.add('menu-key-focus');
    try {
      element.focus({ preventScroll: true });
    } catch (e) {
      element.focus();
    }
    return true;
  }

  scrollActiveMenu(direction) {
    const activeContent = document.querySelector('.tab-content.active');
    if (!activeContent) return false;
    const candidates = [activeContent].concat(Array.from(activeContent.querySelectorAll('*')));
    const scrollTarget = candidates.find(element => element.scrollHeight > element.clientHeight + 2);
    if (!scrollTarget) return false;
    scrollTarget.scrollBy({
      top: direction * 90,
      behavior: this.game.effectsLevel === 'off' ? 'auto' : 'smooth'
    });
    return true;
  }

  handleMenuNavigation(key) {
    if (this.overlay.classList.contains('hidden')) return false;

    const tabs = Array.from(document.querySelectorAll('.tab-btn'));
    const activeTab = this.getActiveTabButton();
    const activeElement = document.activeElement;
    const activeTabIndex = Math.max(0, tabs.indexOf(activeTab));
    const controls = this.getActiveTabControls();
    const controlIndex = controls.indexOf(activeElement);
    const scoreToggleFocused = activeTab &&
      activeTab.dataset.tab === 'scores' &&
      (activeElement === this.lbLocalBtn || activeElement === this.lbGlobalBtn);
    const activeLevelCard = activeElement &&
      activeElement.classList &&
      activeElement.classList.contains('level-card')
      ? activeElement
      : null;
    const activeLevel = activeLevelCard
      ? parseInt(activeLevelCard.dataset.level, 10)
      : 0;

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const direction = key === 'ArrowRight' ? 1 : -1;

      if (activeLevelCard) {
        const targetLevel = getHorizontalLevelTarget(
          activeLevel,
          direction,
          this.boData.bestLevel
        );
        if (targetLevel !== activeLevel) {
          this.focusLevelCard(targetLevel);
        }
        return true;
      }

      // LOCAL / GLOBAL is a nested horizontal choice inside SCORES.
      if (scoreToggleFocused) {
        const scoreControls = [this.lbLocalBtn, this.lbGlobalBtn]
          .filter(element => element.offsetParent !== null);
        const scoreIndex = Math.max(0, scoreControls.indexOf(activeElement));
        const nextScoreIndex = (scoreIndex + direction + scoreControls.length) % scoreControls.length;
        this.focusMenuElement(scoreControls[nextScoreIndex]);
        return true;
      }

      const nextIndex = (activeTabIndex + direction + tabs.length) % tabs.length;
      this.switchTab(tabs[nextIndex].dataset.tab);
      this.focusMenuElement(tabs[nextIndex]);
      return true;
    }

    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const direction = key === 'ArrowDown' ? 1 : -1;

      // PLAY always has a predictable first step: Down moves from the tab
      // row (or an unfocused menu) directly to START / RETRY.
      if (
        direction > 0 &&
        activeTab &&
        activeTab.dataset.tab === 'play' &&
        (tabs.includes(activeElement) || !this.overlay.contains(activeElement))
      ) {
        const primaryAction = controls.find(control => control === this.startBtn);
        if (primaryAction) {
          this.focusMenuElement(primaryAction);
          return true;
        }
      }

      if (activeTab && activeTab.dataset.tab === 'play') {
        if (activeElement === this.startBtn && direction < 0) {
          this.focusLevelCard(this.selectedStartLevel);
          return true;
        }

        if (activeLevelCard) {
          const targetLevel = getVerticalLevelTarget(
            activeLevel,
            direction,
            this.boData.bestLevel
          );
          if (targetLevel > 0) {
            this.focusLevelCard(targetLevel);
          } else if (direction > 0) {
            this.focusMenuElement(this.startBtn);
          } else {
            this.focusMenuElement(activeTab);
          }
          return true;
        }
      }

      if (tabs.includes(activeElement)) {
        if (controls.length > 0) {
          this.focusMenuElement(controls[direction > 0 ? 0 : controls.length - 1]);
        } else {
          this.scrollActiveMenu(direction);
        }
        return true;
      }

      if (controlIndex >= 0) {
        const nextControlIndex = controlIndex + direction;
        if (nextControlIndex >= 0 && nextControlIndex < controls.length) {
          this.focusMenuElement(controls[nextControlIndex]);
        } else if (activeTab) {
          this.focusMenuElement(activeTab);
        }
        return true;
      }

      if (controls.length > 0) {
        this.focusMenuElement(controls[direction > 0 ? 0 : controls.length - 1]);
      } else if (!this.scrollActiveMenu(direction) && activeTab) {
        this.focusMenuElement(activeTab);
      }
      return true;
    }

    if (key === 'Enter' || key === ' ') {
      if (activeElement && activeElement.tagName === 'BUTTON' && this.overlay.contains(activeElement)) {
        activeElement.click();
      } else if (activeTab && activeTab.dataset.tab === 'play') {
        this.onStartClick();
      } else if (activeTab) {
        this.focusMenuElement(activeTab);
      }
      return true;
    }

    return false;
  }

  // --- OVERLAY STATES ---

  setStartLevel(level) {
    this.selectedStartLevel = clampStartLevel(level, this.boData.bestLevel);
    try {
      localStorage.setItem('bo_start_level', String(this.selectedStartLevel));
    } catch (e) {}
    this.renderStartLevelPicker();
  }

  focusLevelCard(level) {
    const safeLevel = clampStartLevel(level, this.boData.bestLevel);
    this.setStartLevel(safeLevel);
    const card = this.startLevelGrid.querySelector(`[data-level="${safeLevel}"]`);
    return this.focusMenuElement(card);
  }

  buildLevelCards() {
    if (this.startLevelGrid.children.length > 0) return;

    for (let level = 1; level <= MAX_SELECTABLE_LEVEL; level++) {
      const levelData = this.game.bricks.getLevelData(level);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'level-card';
      card.dataset.level = String(level);
      card.setAttribute('role', 'option');

      const preview = document.createElement('canvas');
      preview.width = 112;
      preview.height = 63;
      preview.setAttribute('aria-hidden', 'true');
      card.appendChild(preview);

      const number = document.createElement('span');
      number.className = 'level-card-number';
      number.textContent = String(level);
      card.appendChild(number);

      const lock = document.createElement('span');
      lock.className = 'level-lock';
      lock.setAttribute('aria-hidden', 'true');
      card.appendChild(lock);

      card.addEventListener('click', event => {
        if (card.disabled) return;
        this.setStartLevel(level);
        this.focusMenuElement(card);
        if (event.detail === 0) this.onStartClick();
      });

      this.startLevelGrid.appendChild(card);
      this.drawLevelThumbnail(preview, levelData.map, level);
    }
  }

  drawLevelThumbnail(canvas, map, level) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const paddingX = 5;
    const brickWidth = (width - paddingX * 2) / 10;
    const brickHeight = Math.min(8, (height - 14) / map.length);
    const formationHeight = brickHeight * map.length;
    const startY = (height - formationHeight) / 2;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#09051f');
    gradient.addColorStop(1, '#03000d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let row = 0; row < map.length; row++) {
      for (let col = 0; col < map[row].length; col++) {
        const hp = map[row][col];
        if (hp <= 0) continue;
        const x = paddingX + col * brickWidth;
        const y = startY + row * brickHeight;
        ctx.fillStyle = this.game.bricks.getColorForHP(hp);
        ctx.fillRect(x + 0.7, y + 0.7, brickWidth - 1.4, brickHeight - 1.4);
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.fillRect(x + 1, y + 1, brickWidth - 2, 1);
      }
    }

    if (level === 10) {
      const coreX = paddingX + brickWidth * 4;
      const coreY = startY + brickHeight * 2;
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(
        coreX + 1,
        coreY + 1,
        brickWidth * 2 - 2,
        brickHeight * 2 - 2
      );
      ctx.strokeStyle = '#00eaff';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        coreX + 1.5,
        coreY + 1.5,
        brickWidth * 2 - 3,
        brickHeight * 2 - 3
      );
    }
  }

  renderStartLevelPicker() {
    this.buildLevelCards();
    const maxLevel = getMaxUnlockedStartLevel(this.boData.bestLevel);
    this.selectedStartLevel = clampStartLevel(this.selectedStartLevel, this.boData.bestLevel);
    const levelData = this.game.bricks.getLevelData(this.selectedStartLevel);

    this.startLevelValue.textContent =
      `LVL ${this.selectedStartLevel} · ${levelData.name}`;

    this.startLevelGrid.querySelectorAll('.level-card').forEach(card => {
      const level = parseInt(card.dataset.level, 10);
      const cardData = this.game.bricks.getLevelData(level);
      const locked = level > maxLevel;
      card.disabled = locked;
      card.classList.toggle('selected', level === this.selectedStartLevel);
      card.setAttribute('aria-selected', level === this.selectedStartLevel ? 'true' : 'false');
      card.setAttribute(
        'aria-label',
        locked
          ? `Level ${level}, ${cardData.name}, locked. Clear level ${level - 1} to unlock.`
          : `Level ${level}, ${cardData.name}, unlocked. Press Enter to start.`
      );
    });

    const ranked = isRankedStartLevel(this.selectedStartLevel);
    this.startLevelMode.textContent = ranked
      ? 'FULL RUN · LEADERBOARD ON'
      : 'PRACTICE · NO LEADERBOARD';
    this.startLevelMode.classList.toggle('ranked', ranked);
    this.startLevelMode.classList.toggle('practice', !ranked);
  }

  showMenu() {
    this.overlay.classList.remove('victory');
    this.overlay.classList.remove('hidden');
    this.pauseBtn.classList.remove('show');
    this.gameTitle.textContent = 'BREAKOUT';
    this.gameSubtitle.textContent = 'NEON DRIFT';
    this.finalLevel.style.display = 'none';
    this.finalScore.style.display = 'none';
    this.bestScore.style.display = 'none';
    this.menuHiscore.style.display = '';
    this.menuHiscore.textContent = 'HI-SCORE: ' + this.boData.bestScore;
    this.startBtn.textContent = 'START';
    this.startLevelPicker.style.display = '';
    this.startLevelMode.style.display = '';
    this.continueBtn.style.display = 'none';
    this.menuBtn.style.display = 'none';
    this.instructions.style.display = '';
    this.studioCredit.style.display = '';
    this.renderStartLevelPicker();
    this.switchTab('play');
    this.game.state = 'menu';
    this.focusMenuElement(this.getActiveTabButton());
  }

  recordRunResult(outcome) {
    var g = this.game;
    var rankedRun = g.isRankedRun !== false;

    this.boData.totalGames++;
    this.boData.totalBricks += (this.pg.bricksThisGame || 0);
    if (rankedRun && g.score > this.boData.bestScore) this.boData.bestScore = g.score;
    if (g.level > this.boData.bestLevel) this.boData.bestLevel = g.level;
    if (rankedRun) {
      this.saveScore(g.score, g.level);
    } else {
      this._lastSavedScore = null;
    }
    saveBOData(this.boData);

    // Check endgame achievements
    this.checkEndgameAchievements();

    // postMessage
    var runMode = rankedRun ? LEADERBOARD_MODE : 'practice';
    gvPost('game_over', {
      score: g.score,
      level: g.level,
      mode: runMode,
      outcome: outcome
    });
    GameVoltTracker.end({score: g.score, level: g.level, outcome: outcome});
    if (rankedRun && g.score >= this.boData.bestScore) {
      gvPost('high_score', { score: g.score, mode: LEADERBOARD_MODE });
    }
    if (rankedRun && window.GameVolt) {
      GameVolt.leaderboard.submit(g.score, { mode: LEADERBOARD_MODE });
      this._lbCache = null;
    }

    return rankedRun;
  }

  showGameOver() {
    var g = this.game;
    var rankedRun = this.recordRunResult('lose');

    this.overlay.classList.remove('victory');
    this.overlay.classList.remove('hidden');
    this.pauseBtn.classList.remove('show');
    this.switchTab('play');
    this.gameTitle.textContent = 'SYSTEM FAILURE';
    this.gameSubtitle.textContent = '';
    this.finalLevel.style.display = 'block';
    this.finalLevel.textContent = 'LEVEL ' + g.level + ': ' + (g.currentLevelName || '');
    this.finalScore.style.display = 'block';
    this.finalScore.textContent = 'SCORE: ' + g.score;
    this.bestScore.style.display = 'block';
    this.bestScore.textContent = rankedRun
      ? 'BEST: ' + this.boData.bestScore
      : 'PRACTICE · NO LEADERBOARD';
    this.menuHiscore.style.display = 'none';
    this.startBtn.textContent = 'RETRY';
    this.startLevelPicker.style.display = '';
    this.startLevelMode.style.display = '';
    this.continueBtn.textContent = 'CONTINUE LEVEL';
    this.continueBtn.style.display = '';
    this.menuBtn.style.display = '';
    this.instructions.style.display = 'none';
    this.studioCredit.style.display = 'none';
    this.renderStartLevelPicker();
    this.focusMenuElement(this.getActiveTabButton());
  }

  showVictory() {
    var g = this.game;
    var rankedRun = this.recordRunResult('win');

    this.overlay.classList.add('victory');
    this.overlay.classList.remove('hidden');
    this.pauseBtn.classList.remove('show');
    this.switchTab('play');
    this.gameTitle.textContent = 'NEON GOD';
    this.gameSubtitle.textContent = 'DEFEATED // SYSTEM LIBERATED';
    this.finalLevel.style.display = 'block';
    this.finalLevel.textContent = 'FINAL CLEAR · LEVEL 10';
    this.finalScore.style.display = 'block';
    this.finalScore.textContent = 'SCORE: ' + g.score;
    this.bestScore.style.display = 'block';
    this.bestScore.textContent = rankedRun
      ? 'BEST: ' + this.boData.bestScore
      : 'PRACTICE CLEAR';
    this.menuHiscore.style.display = 'none';
    this.startLevelPicker.style.display = 'none';
    this.startLevelMode.style.display = 'none';
    this.startBtn.textContent = 'NEW RUN';
    this.continueBtn.textContent = 'ENDLESS MODE';
    this.continueBtn.style.display = '';
    this.menuBtn.style.display = '';
    this.instructions.style.display = 'none';
    this.studioCredit.style.display = 'none';
    this.renderStartLevelPicker();
    this.focusMenuElement(this.getActiveTabButton());
  }

  hideOverlay() {
    if (this.overlay.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    this.overlay.classList.add('hidden');
    window.scrollTo(0, 0);
    this.pauseBtn.classList.add('show');
  }

  // --- BUTTON HANDLERS ---

  onStartClick() {
    this.resetPGStats();
    const startLevel = this.game.state === 'victory'
      ? 1
      : this.selectedStartLevel;
    if (startLevel !== this.selectedStartLevel) {
      this.setStartLevel(startLevel);
    }
    this.game.start(startLevel);
    this.hideOverlay();
    gvPost('game_start', {
      mode: this.game.isRankedRun ? LEADERBOARD_MODE : 'practice',
      startLevel: startLevel
    });
    GameVoltTracker.start('Breakout');
  }

  onContinueClick() {
    this.resetPGStats();
    const endlessMode = this.game.state === 'victory';
    if (endlessMode) {
      this.game.continueEndless();
    } else {
      this.game.continueGame();
    }
    this.hideOverlay();
    gvPost('game_start', {
      mode: this.game.isRankedRun ? LEADERBOARD_MODE : 'practice',
      startLevel: this.game.startLevel
    });
    if (endlessMode) GameVoltTracker.start('Breakout Endless');
  }

  // --- PAUSE ---

  togglePause() {
    if (this.game.state !== 'running' && !this.game.paused) return;

    var self = this;
    var audio = this.game.audio;

    if (window.GameVolt) {
      // SDK pause menu handles its own open/close toggle
      this.game.paused = !this.game.paused;
      if (this.game.paused) {
        this.pauseBtn.textContent = '\u25B6';
        GameVolt.ui.pauseMenu({
          musicVolume: audio.musicMuted ? 0 : audio.musicVolume,
          sfxVolume: audio.sfxMuted ? 0 : audio.sfxVolume,
          onResume: function() {
            self.game.paused = false;
            self.pauseBtn.textContent = 'II';
          },
          onRestart: function() {
            self.game.paused = false;
            self.pauseBtn.textContent = 'II';
            self.resetPGStats();
            self.game.start(self.game.startLevel || 1);
            self.hideOverlay();
            gvPost('game_start', { mode: LEADERBOARD_MODE });
            GameVoltTracker.start('Breakout');
          },
          onQuit: function() {
            self.game.paused = false;
            self.pauseBtn.textContent = 'II';
            self.showMenu();
          },
          onMusicVolume: function(v) {
            audio.setMusicVolume(v);
          },
          onSfxVolume: function(v) {
            audio.setSfxVolume(v);
          }
        });
      } else {
        // Unpausing via togglePause (P key etc.) — close SDK menu
        this.pauseBtn.textContent = 'II';
        GameVolt.ui.pauseMenu(); // toggles closed
      }
    } else {
      // Fallback: original pause overlay
      this.game.paused = !this.game.paused;
      if (this.game.paused) {
        this.pauseOverlay.classList.add('show');
        this.pauseBtn.textContent = '\u25B6';
      } else {
        this.pauseOverlay.classList.remove('show');
        this.pauseBtn.textContent = 'II';
      }
    }
  }

  // --- SETTINGS ---

  toggleMusic() {
    var on = this.game.audio.toggleMusic();
    this.musicBtn.textContent = on ? 'ON' : 'OFF';
    this.musicBtn.classList.toggle('on', on);
  }

  toggleSfx() {
    var on = this.game.audio.toggleSFX();
    this.sfxBtn.textContent = on ? 'ON' : 'OFF';
    this.sfxBtn.classList.toggle('on', on);
  }

  cycleEffects() {
    const levels = ['high', 'low', 'off'];
    const currentIndex = Math.max(0, levels.indexOf(this.game.effectsLevel));
    const nextLevel = levels[(currentIndex + 1) % levels.length];
    this.game.setEffectsLevel(nextLevel);
    this.updateSettingsUI();
  }

  toggleShake() {
    this.game.setShakeEnabled(!this.game.shakeEnabled);
    this.updateSettingsUI();
  }

  updateSettingsUI() {
    var a = this.game.audio;
    this.musicBtn.textContent = a.musicMuted ? 'OFF' : 'ON';
    this.musicBtn.classList.toggle('on', !a.musicMuted);
    this.sfxBtn.textContent = a.sfxMuted ? 'OFF' : 'ON';
    this.sfxBtn.classList.toggle('on', !a.sfxMuted);
    this.fxBtn.textContent = this.game.effectsLevel.toUpperCase();
    this.fxBtn.classList.toggle('on', this.game.effectsLevel !== 'off');
    this.shakeBtn.textContent = this.game.shakeEnabled ? 'ON' : 'OFF';
    this.shakeBtn.classList.toggle('on', this.game.shakeEnabled);
  }

  // --- TROPHY GRID ---

  renderTrophyGrid() {
    var html = '';
    var tiers = ['bronze', 'silver', 'gold', 'platinum'];
    var tierNames = { bronze: 'BRONZE', silver: 'SILVER', gold: 'GOLD', platinum: 'PLATINUM' };
    var unlockCount = 0;

    for (var t = 0; t < tiers.length; t++) {
      var tier = tiers[t];
      var tierAchs = ACHIEVEMENTS.filter(function(a) { return a.tier === tier; });
      var boData = this.boData;
      var tierUnlocked = tierAchs.filter(function(a) { return boData.unlocked[a.id] > 0; }).length;
      html += '<div class="trophy-tier-header ' + tier + '">' + tierNames[tier] +
              ' <span class="trophy-tier-count">' + tierUnlocked + '/' + tierAchs.length + '</span></div>';

      for (var i = 0; i < tierAchs.length; i++) {
        var a = tierAchs[i];
        var isUnlocked = this.boData.unlocked[a.id] > 0;
        if (isUnlocked) unlockCount++;

        var cls = 'trophy-card ' + (isUnlocked ? 'unlocked ' + a.tier : 'locked');

        html += '<div class="' + cls + '">';
        html += '<div class="trophy-icon">' + (isUnlocked ? a.icon : '🔒') + '</div>';
        html += '<div class="trophy-name">' + a.name + '</div>';
        html += '<div class="trophy-desc">' + a.desc + '</div>';

        if (isUnlocked) {
          html += '<div class="trophy-check">✓</div>';
        } else if (a.target && a.stat) {
          // Show progress bar for cumulative achievements
          var current = this.boData[a.stat] || 0;
          var pct = Math.min(100, Math.round((current / a.target) * 100));
          html += '<div class="trophy-pbar-bg"><div class="trophy-pbar ' + a.tier + '" style="width:' + pct + '%"></div></div>';
        }

        html += '</div>';
      }
    }

    this.trophyGrid.innerHTML = html;
    this.trophyCount.textContent = unlockCount + ' / ' + ACHIEVEMENTS.length;
  }

  // --- SCORES ---

  saveScore(score, level) {
    var entry = { score: score, level: level, date: Date.now() };
    this.boData.scores.push(entry);
    this.boData.scores.sort(function(a, b) { return b.score - a.score; });
    if (this.boData.scores.length > 10) this.boData.scores.length = 10;
    this._lastSavedScore = entry;
    saveBOData(this.boData);
  }

  renderScores() {
    var hasSDK = !!window.GameVolt;
    this.lbToggle.style.display = hasSDK ? 'flex' : 'none';
    if (!hasSDK) this._lbView = 'local';
    if (this._lbView === 'global') this._renderGlobal();
    else this._renderLocal();
  }

  _renderLocal() {
    var scores = this.boData.scores;
    if (!scores || scores.length === 0) {
      this.scoresList.innerHTML = '';
      this.scoresEmpty.textContent = 'No scores yet. Play a game!';
      this.scoresEmpty.style.display = '';
      return;
    }
    this.scoresEmpty.style.display = 'none';
    var html = '';
    for (var i = 0; i < scores.length; i++) {
      var s = scores[i];
      var isNew = this._lastSavedScore && s.date === this._lastSavedScore.date && s.score === this._lastSavedScore.score;
      var d = new Date(s.date);
      var dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      html += '<div class="score-row' + (isNew ? ' new' : '') + '">';
      html += '<div class="score-rank">' + (i + 1) + '.</div>';
      html += '<div class="score-info">';
      html += '<div class="score-val">' + s.score.toLocaleString() + '</div>';
      html += '<div class="score-meta">LVL ' + s.level + '</div>';
      html += '</div>';
      html += '<div class="score-date">' + dateStr + '</div>';
      html += '</div>';
    }
    this.scoresList.innerHTML = html;
  }

  _renderGlobal() {
    if (this.scoresEmpty) this.scoresEmpty.style.display = 'none';
    // Standardized GameVolt leaderboard, mounted inline into the SCORES panel.
    if (window.GameVolt && GameVolt.ui && GameVolt.ui.leaderboard) {
      GameVolt.ui.leaderboard({ container: this.scoresList, mode: LEADERBOARD_MODE, accent: '#00eaff', scoreLabel: 'pts' });
    }
  }

  _renderGlobalRows(rows) {
    var user = window.GameVolt ? GameVolt.auth.getUser() : null;
    var myId = user ? user.id : null;
    if (!rows || rows.length === 0) {
      this.scoresList.innerHTML = '';
      this.scoresEmpty.textContent = 'No global scores yet. Be the first!';
      this.scoresEmpty.style.display = '';
      return;
    }
    this.scoresEmpty.style.display = 'none';
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var isMe = myId && r.user_id === myId;
      html += '<div class="score-row' + (isMe ? ' me' : '') + '">';
      html += '<div class="score-rank">' + r.rank + '.</div>';
      html += '<div class="score-info">';
      html += '<div class="score-username">' + _escHtml(r.username) + '</div>';
      html += '<div class="score-val">' + r.score.toLocaleString() + '</div>';
      html += '</div>';
      html += '</div>';
    }
    if (!myId && window.GameVolt) {
      html += '<div class="lb-login">Log in to appear on the leaderboard.<br><button onclick="GameVolt.auth.login()">LOG IN</button></div>';
    }
    this.scoresList.innerHTML = html;
  }

  // --- ACHIEVEMENT TOAST ---

  showAchToast(ach) {
    if (window.GameVolt) GameVolt.ui.achievementToast(ach);
  }

  // --- ACHIEVEMENT TRACKING ---

  resetPGStats() {
    this.pg = {
      bricksThisGame: 0,
      powerupsThisGame: 0,
      maxCombo: 0,
      maxActiveBalls: 1,
      usedWide: false,
      usedLaser: false,
      usedShield: false,
      usedMultiball: false,
      usedExtraLife: false,
      livesAtLevelStart: 3,
      levelStartTime: performance.now()
    };
    this.levelsWithoutDeath = 0;
    this.laserBricksThisActivation = 0;
  }

  tryUnlock(id) {
    if (this.boData.unlocked[id] > 0 || (window.GameVolt && GameVolt.achievements.isUnlocked && GameVolt.achievements.isUnlocked(id))) return false;
    this.boData.unlocked[id] = Date.now();
    saveBOData(this.boData);

    var ach = ACHIEVEMENTS.find(function(a) { return a.id === id; });
    if (ach) {
      this.showAchToast(ach);
      gvPost('achievement', { id: ach.id, name: ach.name, tier: ach.tier });
      if (window.GameVolt) GameVolt.achievements.unlock(ach.id);
    }

    // Check platinum
    if (id !== 'neon_master') {
      var count = 0;
      for (var key in this.boData.unlocked) {
        if (key !== 'neon_master' && this.boData.unlocked[key] > 0) count++;
      }
      if (count >= 30) this.tryUnlock('neon_master');
    }

    return true;
  }

  // Called from addScore() — checks score-based + instant achievements
  checkInstantAchievements() {
    var g = this.game;
    var score = g.score;
    var level = g.level;

    if (g.isRankedRun !== false) {
      if (score >= 5000) this.tryUnlock('score_5k');
      if (score >= 10000) this.tryUnlock('score_10k');
      if (score >= 25000) this.tryUnlock('score_25k');
      if (score >= 50000) this.tryUnlock('score_50k');
    }

    if (level >= 3) this.tryUnlock('level_3');
    if (level >= 5) this.tryUnlock('halfway');
    if (level >= 10) this.tryUnlock('level_10');
  }

  // Called at game over — checks accumulated stats
  checkEndgameAchievements() {
    var pg = this.pg;
    var d = this.boData;

    // Lifetime stats
    if (d.totalBricks >= 100) this.tryUnlock('brick_layer');
    if (d.totalBricks >= 500) this.tryUnlock('brick_master');
    if (d.totalBricks >= 1000) this.tryUnlock('brick_legend');
    if (d.totalGames >= 5) this.tryUnlock('neon_novice');
    if (d.totalGames >= 20) this.tryUnlock('marathon');

    // Per-game stats
    if (pg.usedWide) this.tryUnlock('wide_angle');
    if (pg.usedLaser) this.tryUnlock('trigger_happy');
    if (pg.usedShield) this.tryUnlock('safety_first');
    if (pg.usedMultiball) this.tryUnlock('ball_frenzy');
    if (pg.usedExtraLife) this.tryUnlock('extra_life');
    if (pg.powerupsThisGame >= 10) this.tryUnlock('power_hoarder');
    if (pg.powerupsThisGame >= 1) this.tryUnlock('power_player');
  }

  // --- GAME EVENT CALLBACKS ---

  onBrickDestroyed() {
    this.pg.bricksThisGame++;

    // First brick ever
    var total = this.boData.totalBricks + this.pg.bricksThisGame;
    if (total >= 1) this.tryUnlock('first_blood');
  }

  onLaserBrickDestroyed() {
    this.laserBricksThisActivation++;
    if (this.laserBricksThisActivation >= 10) this.tryUnlock('laser_show');
  }

  onPowerUpCollected(type) {
    this.pg.powerupsThisGame++;
    if (type === 'wide') this.pg.usedWide = true;
    if (type === 'laser') {
      this.pg.usedLaser = true;
      this.laserBricksThisActivation = 0; // Reset laser kill counter for this activation
    }
    if (type === 'floor') this.pg.usedShield = true;
    if (type === 'multi') this.pg.usedMultiball = true;
    if (type === 'life') this.pg.usedExtraLife = true;
  }

  onLevelCleared(level, elapsedSeconds) {
    // Reaching the next level unlocks it immediately, even if the player
    // closes the game before a later game-over screen.
    const nextLevel = level + 1;
    if (nextLevel > this.boData.bestLevel) {
      this.boData.bestLevel = nextLevel;
      saveBOData(this.boData);
    }

    // Level 1 clear
    if (level === 1) this.tryUnlock('level_1');

    // Neon God — beat level 10
    if (level === 10) this.tryUnlock('neon_god');

    // Quick clear
    if (elapsedSeconds < 45) this.tryUnlock('quick_clear');

    // Flawless (no lives lost this level)
    if (this.game.lives >= this.pg.livesAtLevelStart) {
      this.tryUnlock('flawless');
      this.levelsWithoutDeath++;
      if (this.levelsWithoutDeath >= 3) this.tryUnlock('survivor');
      if (this.levelsWithoutDeath >= 5) this.tryUnlock('untouchable');
    } else {
      this.levelsWithoutDeath = 0;
    }

    // Save lives count for next level check
    this.pg.livesAtLevelStart = this.game.lives;
    this.pg.levelStartTime = performance.now();
  }

  onLifeLost() {
    this.levelsWithoutDeath = 0;
  }

  onComboUpdate(combo) {
    if (combo > this.pg.maxCombo) this.pg.maxCombo = combo;
    if (combo >= 5) this.tryUnlock('combo_5');
    if (combo >= 10) this.tryUnlock('combo_10');
  }

  onBallCountChange(count) {
    if (count > this.pg.maxActiveBalls) this.pg.maxActiveBalls = count;
    if (count >= 3) this.tryUnlock('triple_threat');
  }
}

// Global postMessage helper
function gvPost(action, payload) {
  if (window.parent !== window) {
    try {
      window.parent.postMessage({
        type: 'gamevolt',
        action: action,
        gameId: 'breakout',
        payload: payload || {}
      }, '*');
    } catch (e) {}
  }
}
window.gvPost = gvPost;

// GA4 Game Event Tracker
var GameVoltTracker={gameName:null,startTime:null,hasTracked30s:false,hasTracked60s:false,timerInterval:null,
start:function(n){this.gameName=n;this.startTime=Date.now();this.hasTracked30s=false;this.hasTracked60s=false;this._send('game_start',{game_name:n});if(this.timerInterval)clearInterval(this.timerInterval);var self=this;this.timerInterval=setInterval(function(){self._checkMilestones();},5000);},
end:function(o){o=o||{};var t=this.startTime?Math.round((Date.now()-this.startTime)/1000):0;this._send('game_end',{game_name:this.gameName,play_time_seconds:t,score:o.score||null,level:o.level||null,outcome:o.outcome||'unknown'});if(this.timerInterval)clearInterval(this.timerInterval);},
_checkMilestones:function(){if(!this.startTime)return;var t=(Date.now()-this.startTime)/1000;if(t>=30&&!this.hasTracked30s){this.hasTracked30s=true;this._send('game_play_30s',{game_name:this.gameName});}if(t>=60&&!this.hasTracked60s){this.hasTracked60s=true;this._send('game_play_60s',{game_name:this.gameName});}},
_send:function(n,p){if(window.parent!==window){window.parent.postMessage({type:'gamevolt_ga4',event:n,params:p},'*');return;}if(typeof gtag==='function'){gtag('event',n,p);return;}}};
