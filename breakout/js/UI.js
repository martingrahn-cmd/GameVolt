import { ACHIEVEMENTS, loadBOData, saveBOData } from './Achievements.js';

export default class UIManager {
  constructor(game) {
    this.game = game;
    this.boData = loadBOData();
    this.achToastQueue = [];
    this.achToastActive = false;

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
    this.pauseResume = document.getElementById('pause-resume');
    this.instructions = document.getElementById('instructions');
    this.studioCredit = document.getElementById('studio-credit');

    this.achToastEl = document.getElementById('achievement-toast');
    this.achToastIcon = document.getElementById('ach-toast-icon');
    this.achToastTier = document.getElementById('ach-toast-tier');
    this.achToastName = document.getElementById('ach-toast-name');
  }

  setupListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.addEventListener('click', () => this.switchTab(b.dataset.tab));
    });

    // Buttons
    this.startBtn.addEventListener('click', () => this.onStartClick());
    this.continueBtn.addEventListener('click', () => this.onContinueClick());
    this.menuBtn.addEventListener('click', () => this.showMenu());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.pauseResume.addEventListener('click', () => this.togglePause());

    // Settings
    this.musicBtn.addEventListener('click', () => this.toggleMusic());
    this.sfxBtn.addEventListener('click', () => this.toggleSfx());
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

  // --- OVERLAY STATES ---

  showMenu() {
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
    this.continueBtn.style.display = 'none';
    this.menuBtn.style.display = 'none';
    this.instructions.style.display = '';
    this.studioCredit.style.display = '';
    this.switchTab('play');
    this.game.state = 'menu';
  }

  showGameOver() {
    var g = this.game;

    // Update persistent data
    this.boData.totalGames++;
    this.boData.totalBricks += (this.pg.bricksThisGame || 0);
    if (g.score > this.boData.bestScore) this.boData.bestScore = g.score;
    if (g.level > this.boData.bestLevel) this.boData.bestLevel = g.level;
    this.saveScore(g.score, g.level);
    saveBOData(this.boData);

    // Check endgame achievements
    this.checkEndgameAchievements();

    // postMessage
    gvPost('game_over', { score: g.score, level: g.level, mode: 'default' });
    if (g.score >= this.boData.bestScore) {
      gvPost('high_score', { score: g.score, mode: 'default' });
    }

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
    this.bestScore.textContent = 'BEST: ' + this.boData.bestScore;
    this.menuHiscore.style.display = 'none';
    this.startBtn.textContent = 'RETRY';
    this.continueBtn.style.display = '';
    this.menuBtn.style.display = '';
    this.instructions.style.display = 'none';
    this.studioCredit.style.display = 'none';
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
    this.pauseBtn.classList.add('show');
  }

  // --- BUTTON HANDLERS ---

  onStartClick() {
    this.resetPGStats();
    this.game.start();
    this.hideOverlay();
    gvPost('game_start', { mode: 'default' });
  }

  onContinueClick() {
    this.resetPGStats();
    this.game.continueGame();
    this.hideOverlay();
    gvPost('game_start', { mode: 'default' });
  }

  // --- PAUSE ---

  togglePause() {
    if (this.game.state !== 'running' && !this.game.paused) return;
    this.game.paused = !this.game.paused;
    if (this.game.paused) {
      this.pauseOverlay.classList.add('show');
      this.pauseBtn.textContent = '\u25B6';
    } else {
      this.pauseOverlay.classList.remove('show');
      this.pauseBtn.textContent = 'II';
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

  updateSettingsUI() {
    var a = this.game.audio;
    this.musicBtn.textContent = a.musicMuted ? 'OFF' : 'ON';
    this.musicBtn.classList.toggle('on', !a.musicMuted);
    this.sfxBtn.textContent = a.sfxMuted ? 'OFF' : 'ON';
    this.sfxBtn.classList.toggle('on', !a.sfxMuted);
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
      html += '<div class="trophy-tier-header ' + tier + '">' + tierNames[tier] + '</div>';

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
    var scores = this.boData.scores;
    if (!scores || scores.length === 0) {
      this.scoresList.innerHTML = '';
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

  // --- ACHIEVEMENT TOAST ---

  showAchToast(ach) {
    this.achToastQueue.push(ach);
    if (!this.achToastActive) this.popAchToast();
  }

  popAchToast() {
    if (!this.achToastQueue.length) { this.achToastActive = false; return; }
    this.achToastActive = true;
    var ach = this.achToastQueue.shift();

    this.achToastIcon.textContent = ach.icon;
    this.achToastName.textContent = ach.name;
    this.achToastTier.textContent = ach.tier.toUpperCase();
    this.achToastTier.className = 'ach-tier-label ' + ach.tier;
    this.achToastEl.classList.add('show');

    var self = this;
    setTimeout(function() {
      self.achToastEl.classList.remove('show');
      setTimeout(function() { self.popAchToast(); }, 400);
    }, 2800);
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
    if (this.boData.unlocked[id] > 0) return false;
    this.boData.unlocked[id] = Date.now();
    saveBOData(this.boData);

    var ach = ACHIEVEMENTS.find(function(a) { return a.id === id; });
    if (ach) {
      this.showAchToast(ach);
      gvPost('achievement', { id: ach.id, name: ach.name, tier: ach.tier });
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

    if (score >= 5000) this.tryUnlock('score_5k');
    if (score >= 10000) this.tryUnlock('score_10k');
    if (score >= 25000) this.tryUnlock('score_25k');
    if (score >= 50000) this.tryUnlock('score_50k');

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
