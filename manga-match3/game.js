/* ── Manga Match 3 — Main Orchestrator ── */

import { sfx } from "./audio.js";
import { BOARD_SIZE, BASE_POINTS, TILE_TYPES, TILE_INDEX_BY_ID, SPECIAL, LEVELS, TIMING, FEVER, PROGRESS_STORAGE_KEY } from "./constants.js";
import { boardMixin } from "./board.js";
import { renderMixin } from "./render.js";
import { dailyMixin } from "./daily.js";
import { uiMixin } from "./ui.js";
import { gamevolt } from "./gamevolt.js";

class MangaMatch3 {
  constructor() {
    this.boardEl = document.getElementById("board");
    this.hudPanelEl = document.querySelector(".hud-panel");
    this.boardPanelEl = document.querySelector(".board-panel");
    this.sfxTagEl = document.querySelector(".sfx-tag");
    this.fxLayerEl = document.getElementById("fxLayer");
    this.scoreEl = document.getElementById("score");
    this.levelEl = document.getElementById("level");
    this.movesEl = document.getElementById("moves");
    this.comboEl = document.getElementById("combo");
    this.feverMeterEl = document.getElementById("feverMeter");
    this.feverFillEl = document.getElementById("feverFill");
    this.feverPercentEl = document.getElementById("feverPercent");
    this.feverStateEl = document.getElementById("feverState");
    this.feverTurnsEl = document.getElementById("feverTurns");
    this.dailyPanelEl = document.getElementById("dailyPanel");
    this.dailyTaskEl = document.getElementById("dailyTask");
    this.dailyProgressEl = document.getElementById("dailyProgress");
    this.dailyFillEl = document.getElementById("dailyFill");
    this.dailyCountEl = document.getElementById("dailyCount");
    this.dailyStreakEl = document.getElementById("dailyStreak");
    this.dailyRewardEl = document.getElementById("dailyReward");
    this.statusEl = document.getElementById("status");
    this.goalsListEl = document.getElementById("goalsList");
    this.comboBurstEl = document.getElementById("comboBurst");
    this.mScoreEl = document.getElementById("mScore");
    this.mMovesEl = document.getElementById("mMoves");
    this.mComboEl = document.getElementById("mCombo");
    this.mLevelEl = document.getElementById("mLevel");
    this.restartBtn = document.getElementById("restartBtn");
    this.nextBtn = document.getElementById("nextBtn");
    this.shuffleBtn = document.getElementById("shuffleBtn");
    this.resultOverlay = document.getElementById("resultOverlay");
    this.resultTitle = document.getElementById("resultTitle");
    this.resultBody = document.getElementById("resultBody");
    this.resultRetryBtn = document.getElementById("resultRetryBtn");
    this.resultNextBtn = document.getElementById("resultNextBtn");
    this.levelSelectEl = document.getElementById("levelSelect");
    this.levelMapEl = document.getElementById("levelMap");
    this.gameShellEl = document.querySelector(".game-shell");
    this.resultStarsEl = document.getElementById("resultStars");
    this.resultConfettiEl = document.getElementById("resultConfetti");

    this.levelIndex = 0;
    this.currentLevel = null;
    this.board = [];
    this.obstacles = [];
    this.spawnOffsets = new Map();
    this.cellNodes = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    this.cellParts = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    this.cellHashes = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(""));

    this.score = 0;
    this.moves = 0;
    this.combo = 1;
    this.selected = null;
    this.busy = false;
    this.levelComplete = false;
    this.feverCharge = 0;
    this.feverActive = false;
    this.feverTurnsLeft = 0;
    this.feverActivatedThisTurn = false;

    this.shopData = this.loadShopData();
    this.activePowerups = [];
    this.bomb3x3Pending = false;
    this.inkBlastPending = false;

    this.dailyState = null;
    this.pendingDailyReward = null;
    this.dailyRewardStatus = "";
    this.dailyProgressDirty = false;
    this.comboBurstToken = 0;
    this.comboBurstVisible = false;
    this.comboBurstQueue = [];
    this.comboBurstTimer = null;
    this.hintTimer = null;
    this.hintedCells = [];
    this.paused = false;

    this.collectCounts = Array(TILE_TYPES.length).fill(0);
    this.clearedObstacleCounts = { ink: 0, frame: 0 };
    this.unlockedCount = 0;

    this.initializeDailyLoop();
    this.setupBoardGrid();

    this.boardEl.addEventListener("click", (event) => { sfx.init(); this.clearHint(); this.onTileClick(event); });
    this.restartBtn.addEventListener("click", () => this.resetCurrentLevel());
    this.nextBtn.addEventListener("click", () => this.goToNextLevel());
    this.shuffleBtn.addEventListener("click", () => this.manualShuffle());
    this.resultRetryBtn.addEventListener("click", () => { this.hideResultOverlay(); this.resetCurrentLevel(); });
    this.resultNextBtn.addEventListener("click", () => { this.hideResultOverlay(); this.goToNextLevel(); });
    this.resultMapBtn = document.getElementById("resultMapBtn");
    this.resultMapBtn.addEventListener("click", () => { this.hideResultOverlay(); this.showLevelSelect(); });
    this.mapBtn = document.getElementById("mapBtn");
    this.mapBtn.addEventListener("click", () => this.showLevelSelect());

    this.pauseBtn = document.getElementById("pauseBtn");
    this.pauseOverlayEl = document.getElementById("pauseOverlay");
    this.pauseBtn.addEventListener("click", () => this.togglePause());
    document.getElementById("pauseResumeBtn").addEventListener("click", () => this.resumeGame());
    document.getElementById("pauseRestartBtn").addEventListener("click", () => { this.resumeGame(); this.resetCurrentLevel(); });
    document.getElementById("pauseMapBtn").addEventListener("click", () => { this.resumeGame(); this.showLevelSelect(); });
    document.getElementById("pauseMenuBtn").addEventListener("click", () => { this.resumeGame(); this.showMainMenu(); });

    this.swipeStart = null;
    this.swipeThreshold = 30;
    this.boardEl.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
    this.boardEl.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
    this.boardEl.addEventListener("touchend", (e) => this.onTouchEnd(e));

    this.initLevelPicker();
    this.initShop();
    this.initPrepScreen();
    this.updateCoinHUD();
    this.initTutorial();
    this.initMainMenu();
    gamevolt.init();
  }

  /* ── Level Management ── */

  loadLevel(index) {
    this.levelIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
    this.currentLevel = LEVELS[this.levelIndex];
    this.score = 0;
    this.moves = this.currentLevel.moves;
    this.combo = 1;
    this.resetFever();
    this.selected = null;
    this.busy = false;
    this.levelComplete = false;
    this.bomb3x3Pending = false;
    this.inkBlastPending = false;
    this.collectCounts = Array(TILE_TYPES.length).fill(0);
    this.clearedObstacleCounts = { ink: 0, frame: 0 };
    this.unlockedCount = 0;
    this.buildObstacleGrid(this.currentLevel.obstacleMap);
    this.initBoard();
    this.applyLockMap(this.currentLevel.lockMap);
    this.applyPendingDailyReward();
    this.updateHUD();
    this.renderDailyPanel();
    this.renderGoals();
    const stageStatus = `Stage ${this.currentLevel.id}: ${this.currentLevel.name}`;
    if (this.dailyRewardStatus) { this.setStatus(`${stageStatus} | ${this.dailyRewardStatus}`); this.showComboBurst("DAILY BONUS"); this.dailyRewardStatus = ""; } else { this.setStatus(stageStatus); }
    this.showComboBurst(`STAGE ${this.currentLevel.id}`);
    this.spawnOffsets.clear();
    this.invalidateAllCells();
    this.fxLayerEl?.replaceChildren();
    this.paused = false;
    if (this.pauseOverlayEl) this.pauseOverlayEl.hidden = true;
    this.hideResultOverlay();
    this.hideLevelSelect();
    this.render();
    this.scheduleHint();
    this.maybeTutorial();
  }

  resetCurrentLevel() { this.activePowerups = []; this.loadLevel(this.levelIndex); this.renderActivePowerupBar(); }

  goToNextLevel() {
    if (!this.levelComplete) return;
    if (this.levelIndex >= LEVELS.length - 1) { this.showLevelSelect(); return; }
    this.loadLevel(this.levelIndex + 1);
  }

  showLevelSelect() { this.clearHint(); this.mainMenuEl.hidden = true; this.gameShellEl.hidden = true; this.levelSelectEl.hidden = true; this.openLevelPicker(); }
  hideLevelSelect() { this.levelSelectEl.hidden = true; this.closeLevelPicker(); this.gameShellEl.hidden = false; }
  isLevelUnlocked(index) { if (index === 0) return true; const prev = this.getLevelProgress(LEVELS[index - 1].id); return prev !== null && prev.bestStars > 0; }

  /* ── Input ── */

  onTileClick(event) {
    const tileButton = event.target.closest(".tile");
    if (!tileButton || this.busy || this.levelComplete || this.tutActive || this.paused) return;
    const row = Number(tileButton.dataset.row);
    const col = Number(tileButton.dataset.col);
    if (!this.inBounds(row, col)) return;
    if ((this.bomb3x3Pending || this.inkBlastPending) && this.handlePowerupClick(row, col)) return;
    if (this.isFrameCell(row, col) || !this.board[row][col]) return;
    const pos = { row, col };
    if (!this.selected) { if (!this.canSelectCell(pos)) { this.setStatus("Locked tiles can't be moved."); return; } this.selected = pos; sfx.select(); this.render(); return; }
    if (this.selected.row === row && this.selected.col === col) { this.selected = null; sfx.deselect(); this.render(); return; }
    if (!this.isAdjacent(this.selected, pos)) { if (this.canSelectCell(pos)) this.selected = pos; else this.setStatus("Select an unlocked tile."); this.render(); return; }
    if (!this.canSwap(this.selected, pos)) { this.selected = null; this.setStatus("That move is locked."); this.render(); return; }
    this.swapAttempt(this.selected, pos);
  }

  getTilePosFromTouch(touch) {
    const el = document.elementFromPoint(touch.clientX, touch.clientY); if (!el) return null;
    const tileButton = el.closest(".tile"); if (!tileButton) return null;
    const row = Number(tileButton.dataset.row); const col = Number(tileButton.dataset.col);
    if (!this.inBounds(row, col) || this.isFrameCell(row, col) || !this.board[row][col]) return null;
    return { row, col };
  }

  onTouchStart(event) {
    sfx.init(); if (this.busy || this.levelComplete || this.tutActive || this.paused) return;
    const touch = event.touches[0]; const pos = this.getTilePosFromTouch(touch); if (!pos) return;
    event.preventDefault(); this.clearHint();
    this.swipeStart = { x: touch.clientX, y: touch.clientY, row: pos.row, col: pos.col };
  }

  onTouchMove(event) { if (!this.swipeStart) return; event.preventDefault(); }

  onTouchEnd(event) {
    if (!this.swipeStart) return; this.clearHint();
    const touch = event.changedTouches[0];
    const dx = touch.clientX - this.swipeStart.x; const dy = touch.clientY - this.swipeStart.y;
    const absDx = Math.abs(dx); const absDy = Math.abs(dy);
    const startPos = { row: this.swipeStart.row, col: this.swipeStart.col }; this.swipeStart = null;
    if (absDx < this.swipeThreshold && absDy < this.swipeThreshold) { this.onTileClick({ target: this.cellNodes[startPos.row][startPos.col] }); return; }
    let targetRow = startPos.row; let targetCol = startPos.col;
    if (absDx > absDy) targetCol += dx > 0 ? 1 : -1; else targetRow += dy > 0 ? 1 : -1;
    if (!this.inBounds(targetRow, targetCol) || this.isFrameCell(targetRow, targetCol) || !this.board[targetRow][targetCol]) return;
    const target = { row: targetRow, col: targetCol };
    if (!this.canSelectCell(startPos)) { this.setStatus("Locked tiles can't be moved."); return; }
    if (!this.canSwap(startPos, target)) { this.setStatus("That move is locked."); return; }
    this.selected = null; this.swapAttempt(startPos, target);
  }

  canSelectCell(pos) { return Boolean(this.board[pos.row][pos.col] && !this.board[pos.row][pos.col].locked); }
  canSwap(a, b) { return this.canSelectCell(a) && this.canSelectCell(b); }
  isAdjacent(a, b) { return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1; }
  swapTiles(a, b) { const temp = this.board[a.row][a.col]; this.board[a.row][a.col] = this.board[b.row][b.col]; this.board[b.row][b.col] = temp; }

  /* ── Turn Resolution ── */

  async swapAttempt(a, b) {
    if (this.busy || this.levelComplete) return;
    this.busy = true; this.selected = null;
    this.swapTiles(a, b); this.render(); sfx.swap();
    await this.animatePositions([a, b], "swap-pop", TIMING.SWAP_MS);
    const tileA = this.board[a.row][a.col]; const tileB = this.board[b.row][b.col];
    const includesSpecial = Boolean(tileA.special || tileB.special);
    const found = this.findMatches();
    if (!includesSpecial && found.matchSet.size === 0) {
      sfx.invalidSwap(); await this.animatePositions([a, b], "swap-deny", TIMING.INVALID_MS);
      this.swapTiles(a, b); this.busy = false; this.setStatus(this.charQuote("miss")); this.render(); this.scheduleHint(); return;
    }
    this.moves -= 1;
    if (includesSpecial) await this.resolveSpecialSwap(a, b); else await this.resolveCascade({ lastSwap: [a, b] });
    this.consumeFeverTurn(); this.combo = 1; this.postTurnChecks(); this.busy = false; this.render(); this.scheduleHint();
  }

  async resolveSpecialSwap(a, b) {
    const tileA = this.board[a.row][a.col]; const tileB = this.board[b.row][b.col];
    const clearSet = new Set(); let impactLevel = 2;
    const isColorA = tileA.special === SPECIAL.COLOR; const isColorB = tileB.special === SPECIAL.COLOR;
    if (isColorA && isColorB) {
      for (let r = 0; r < BOARD_SIZE; r += 1) { for (let c = 0; c < BOARD_SIZE; c += 1) { if (!this.isFrameCell(r, c)) clearSet.add(this.key(r, c)); } }
      this.setStatus(this.charQuote("mega")); this.showComboBurst("MEGA!"); this.flashSfxTag("ドカーン!"); sfx.colorBlast(); impactLevel = 3;
    } else if (isColorA) { this.collectTilesByType(tileB.type, clearSet); clearSet.add(this.key(a.row, a.col)); this.setStatus(this.charQuote("color")); this.showComboBurst("COLOR!"); this.flashSfxTag("ズバッ!"); sfx.colorBlast();
    } else if (isColorB) { this.collectTilesByType(tileA.type, clearSet); clearSet.add(this.key(b.row, b.col)); this.setStatus(this.charQuote("color")); this.showComboBurst("COLOR!"); this.flashSfxTag("ズバッ!"); sfx.colorBlast();
    } else {
      this.addSpecialArea(a.row, a.col, tileA.special, clearSet); this.addSpecialArea(b.row, b.col, tileB.special, clearSet);
      clearSet.add(this.key(a.row, a.col)); clearSet.add(this.key(b.row, b.col));
      this.setStatus(this.charQuote("chain")); this.showComboBurst("CHAIN!");
      const hasBomb = tileA.special === SPECIAL.BOMB || tileB.special === SPECIAL.BOMB;
      const hasLine = [tileA.special, tileB.special].some(s => s === SPECIAL.LINE_H || s === SPECIAL.LINE_V);
      if (hasBomb) { sfx.bombBlast(); this.flashSfxTag("ボカン!"); } else if (hasLine) { sfx.lineBlast(); this.flashSfxTag("シュッ!"); } else sfx.match(2);
      impactLevel = 2 + Number(hasBomb);
    }
    const reactionSet = this.collectNeighborReactionSet(clearSet); this.triggerKeySet(reactionSet, "neighbor-nudge");
    await this.animateKeySet(clearSet, "clear-pop", TIMING.CLEAR_MS);
    this.spawnDualSweepFX(a, b, impactLevel); this.spawnImpactFX(clearSet, "mega");
    this.flashBoard(impactLevel); this.triggerPanelBoost(impactLevel); this.triggerImpactChain(impactLevel);
    const gained = this.clearTiles(clearSet, new Map(), clearSet);
    this.spawnScorePopup(clearSet, gained, 2);
    await this.applyGravityAnimated(); const spawned = this.fillEmptyTiles(); this.render();
    await this.animateKeySet(spawned, "spawn-enter", TIMING.SPAWN_MS);
    this.consumeSpawnOffsets(spawned); this.spawnImpactFX(spawned, "spawn");
    await this.sleep(TIMING.CASCADE_MS); await this.resolveCascade();
  }

  async resolveCascade({ lastSwap = null } = {}) {
    let chain = 0; let localLastSwap = lastSwap;
    while (true) {
      const found = this.findMatches(); if (found.matchSet.size === 0) break;
      chain += 1; this.combo = 1 + Math.min(2, chain * 0.25);
      if (chain === 1) { sfx.match(chain); this.flashSfxTag("パキッ!"); }
      else { sfx.cascade(chain); const chainTags = ["すごい!", "やった!", "最高!", "鬼!", "神!"]; this.flashSfxTag(chainTags[Math.min(chain - 2, chainTags.length - 1)]); }
      const specialMap = this.determineSpecials(found.runs, localLastSwap);
      if (specialMap.size > 0) { sfx.specialCreate(); this.flashSfxTag("キラッ!"); }
      const clearSet = this.expandClearBySpecial(found.matchSet);
      const filteredSpecialMap = this.applySpecialMapToClearSet(specialMap, clearSet);
      const impactSet = new Set([...clearSet, ...filteredSpecialMap.keys()]);
      const fxType = impactSet.size >= 8 ? "mega" : "clear";
      const impactLevel = Math.min(3, Math.max(1, Math.floor(impactSet.size / 5)));
      const reactionSet = this.collectNeighborReactionSet(impactSet); this.triggerKeySet(reactionSet, "neighbor-nudge");
      await this.animateKeySet(impactSet, "clear-pop", TIMING.CLEAR_MS);
      this.spawnRunSweeps(found.runs, impactLevel); this.spawnImpactFX(impactSet, fxType);
      const heavyImpact = impactSet.size >= 6 || chain >= 2;
      if (chain >= 2) this.triggerSpeedLines();
      if (heavyImpact) { this.flashBoard(impactLevel); this.triggerPanelBoost(Math.min(3, Math.max(1, Math.floor(impactSet.size / 6)))); this.triggerImpactChain(impactLevel); } else { this.pulseBoard(1); }
      const gained = this.clearTiles(clearSet, filteredSpecialMap, impactSet);
      this.spawnScorePopup(impactSet, gained, chain);
      await this.applyGravityAnimated(); const spawned = this.fillEmptyTiles(); this.render();
      if (spawned.length > 0) sfx.spawn();
      await this.animateKeySet(spawned, "spawn-enter", TIMING.SPAWN_MS);
      this.consumeSpawnOffsets(spawned); this.spawnImpactFX(spawned, "spawn");
      await this.sleep(TIMING.CASCADE_MS); localLastSwap = null;
    }
    if (chain > 1) { this.recordDailyProgress("chain", 1); this.syncDailyProgress(); this.setStatus(this.charQuote("combo")); this.showComboBurst(`${chain} CHAIN`); gamevolt.setStat("maxChain", chain); }
    else if (chain === 1) { this.setStatus(this.charQuote("hit")); }
  }

  clearTiles(clearSet, specialMap = new Map(), impactSet = clearSet) {
    let cleared = 0; const clearedByType = Array(TILE_TYPES.length).fill(0);
    for (const key of clearSet) {
      const [row, col] = this.fromKey(key); const tile = this.board[row][col]; if (!tile) continue;
      this.collectCounts[tile.type] += 1; clearedByType[tile.type] += 1;
      if (tile.locked) this.unlockedCount += 1;
      this.board[row][col] = null; cleared += 1;
    }
    for (const [key, value] of specialMap.entries()) {
      const [row, col] = this.fromKey(key); if (this.isFrameCell(row, col)) continue;
      if (!this.board[row][col]) this.board[row][col] = this.createRandomTile(value.type);
      this.board[row][col].type = value.type; this.board[row][col].special = value.special;
      this.board[row][col].locked = false; this.board[row][col].mood = value.mood ?? this.randomMood();
    }
    this.applyImpactEffects(impactSet);
    const feverMultiplier = this.feverActive ? FEVER.SCORE_MULTIPLIER : 1;
    const basePoints = Math.floor(cleared * BASE_POINTS * this.combo * feverMultiplier);
    let bonusPoints = 0;
    if (specialMap.size > 0) bonusPoints += Math.floor(specialMap.size * 220 * feverMultiplier);
    const gained = basePoints + bonusPoints; this.score += gained;
    this.addFeverCharge(this.computeFeverGain(cleared, specialMap.size));
    this.recordDailyProgress("clear", cleared); this.recordDailyProgress("special", specialMap.size); this.recordDailyProgress("score", gained);
    for (let i = 0; i < clearedByType.length; i += 1) { if (clearedByType[i] > 0) this.recordDailyProgress("collect", clearedByType[i], TILE_TYPES[i].id); }
    this.syncDailyProgress(); this.updateHUD(); this.renderGoals();
    gamevolt.addStat("totalMatches", 1);
    gamevolt.addStat("totalCleared", cleared);
    gamevolt.setStat("maxStageClear", cleared);
    if (specialMap.size > 0) gamevolt.addStat("totalSpecials", specialMap.size);
    for (const [, value] of specialMap.entries()) {
      if (value.special === SPECIAL.LINE_H || value.special === SPECIAL.LINE_V) gamevolt.addStat("totalLines", 1);
      else if (value.special === SPECIAL.BOMB) gamevolt.addStat("totalBombs", 1);
      else if (value.special === SPECIAL.COLOR) gamevolt.addStat("totalColors", 1);
    }
    return gained;
  }

  /* ── Post-turn ── */

  postTurnChecks() {
    if (this.isLevelComplete()) {
      this.levelComplete = true; this.updateHUD(); this.renderGoals(); sfx.levelComplete();
      this.flashSfxTag("クリア!", 2000);
      if (this.levelIndex >= LEVELS.length - 1) { this.setStatus("You cleared all stages! The Final Panel is secured."); this.showComboBurst("VICTORY!"); }
      else { this.setStatus(`Stage ${this.currentLevel.id} clear!`); this.showComboBurst("STAGE CLEAR"); }
      gamevolt.addStat("stagesCleared", 1);
      gamevolt.setStat("maxStageCleared", this.currentLevel.id);
      gamevolt.setStat("maxStageScore", this.score);
      const stars = this.calculateStars();
      gamevolt.addStat("totalStars", stars);
      if (stars >= 3) gamevolt.setStat("has3Star", 1);
      gamevolt.addStat("totalInkCleared", this.clearedObstacleCounts.ink);
      gamevolt.addStat("totalLocksBreaked", this.unlockedCount);
      gamevolt.submitScore(this.score);
      const newTrophies = gamevolt.checkAchievements();
      if (newTrophies.length > 0) this.showTrophyUnlocks(newTrophies);
      window.setTimeout(() => this.showResultOverlay("victory"), 1200); return;
    }
    if (this.moves <= 0) {
      this.levelComplete = true; this.updateHUD(); sfx.gameOver();
      this.flashSfxTag("ざんねん…", 2000); this.showComboBurst("TRY AGAIN");
      gamevolt.setStat("maxStageScore", this.score);
      gamevolt.addStat("totalInkCleared", this.clearedObstacleCounts.ink);
      gamevolt.addStat("totalLocksBreaked", this.unlockedCount);
      const goTrophies = gamevolt.checkAchievements();
      if (goTrophies.length > 0) this.showTrophyUnlocks(goTrophies);
      window.setTimeout(() => this.showResultOverlay("game-over"), 1200); return;
    }
    if (!this.hasAnyPossibleMove()) { this.shuffleBoard(false); this.setStatus("Board shuffled — no moves available."); }
    this.updateHUD(); this.renderGoals();
  }

  calculateStars() { const ratio = this.moves / this.currentLevel.moves; if (ratio >= 0.4) return 3; if (ratio >= 0.15) return 2; return 1; }
  getGoalProgress(goal) {
    if (goal.type === "score") return this.score;
    if (goal.type === "collect") return this.collectCounts[TILE_INDEX_BY_ID[goal.tile]] ?? 0;
    if (goal.type === "clear") return this.clearedObstacleCounts[goal.obstacle] ?? 0;
    if (goal.type === "unlock") return this.unlockedCount;
    return 0;
  }
  isGoalComplete(goal) { return this.getGoalProgress(goal) >= goal.amount; }
  isLevelComplete() { return this.currentLevel.goals.every((goal) => this.isGoalComplete(goal)); }
  manualShuffle() { if (this.busy || this.levelComplete) return; this.shuffleBoard(false); this.setStatus("Board shuffled manually."); }

  /* ── Persistence ── */

  loadProgress() { try { const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; } }
  saveProgress(levelId, score, stars) {
    const progress = this.loadProgress(); const key = `level-${levelId}`; const prev = progress[key];
    progress[key] = { bestScore: Math.max(score, prev?.bestScore ?? 0), bestStars: Math.max(stars, prev?.bestStars ?? 0) };
    try { window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress)); } catch {}
  }
  getLevelProgress(levelId) { return this.loadProgress()[`level-${levelId}`] ?? null; }

  /* ── Fever ── */

  resetFever() { this.feverCharge = 0; this.feverActive = false; this.feverTurnsLeft = 0; this.feverActivatedThisTurn = false; }
  computeFeverGain(cleared, specialCreated = 0) { if (cleared <= 0) return 0; return Math.min(38, Math.max(6, Math.round(cleared * 3.4 + specialCreated * 10 + Math.max(0, this.combo - 1) * 8))); }
  addFeverCharge(amount) { if (amount <= 0 || this.feverActive) return; this.feverCharge = Math.min(FEVER.MAX_CHARGE, this.feverCharge + amount); if (this.feverCharge >= FEVER.MAX_CHARGE) this.activateFever(); }

  activateFever() {
    if (this.feverActive) return;
    sfx.feverActivate(); this.flashSfxTag("燃えろ!", 1800);
    this.feverActive = true; this.feverTurnsLeft = FEVER.TURNS; this.feverCharge = FEVER.MAX_CHARGE;
    this.feverActivatedThisTurn = true; this.showComboBurst("FEVER!"); this.triggerPanelBoost(3); this.flashBoard(2);
    gamevolt.addStat("totalFevers", 1);
  }

  consumeFeverTurn() {
    if (!this.feverActive) return;
    if (this.feverActivatedThisTurn) { this.feverActivatedThisTurn = false; return; }
    this.feverTurnsLeft = Math.max(0, this.feverTurnsLeft - 1);
    this.feverCharge = Math.round((this.feverTurnsLeft / FEVER.TURNS) * FEVER.MAX_CHARGE);
    if (this.feverTurnsLeft === 0) { this.feverActive = false; this.feverCharge = 0; }
  }

  /* ── Pause ── */

  togglePause() { if (this.paused) this.resumeGame(); else this.pauseGame(); }

  pauseGame() {
    if (this.paused || this.levelComplete) return;
    this.paused = true;
    this.clearHint();
    sfx.uiClick();
    this.pauseOverlayEl.hidden = false;
  }

  resumeGame() {
    if (!this.paused) return;
    this.paused = false;
    sfx.uiClick();
    this.pauseOverlayEl.hidden = true;
    this.scheduleHint();
  }

  /* ── Trophy Notifications ── */

  showTrophyUnlocks(trophies) {
    for (let i = 0; i < trophies.length; i++) {
      const trophy = trophies[i];
      window.setTimeout(() => {
        this.showComboBurst(`${trophy.icon} ${trophy.name}`);
      }, 600 + i * 1200);
    }
  }

  /* ── Utility ── */

  sleep(ms) { return new Promise((resolve) => { window.setTimeout(resolve, ms); }); }
}

/* ── Apply Mixins ── */
Object.assign(MangaMatch3.prototype, boardMixin, renderMixin, dailyMixin, uiMixin);

/* ── Bootstrap ── */
window.addEventListener("DOMContentLoaded", () => { new MangaMatch3(); });
