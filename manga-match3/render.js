/* ── Rendering & Animation Mixin ── */

import { BOARD_SIZE, TILE_TYPES, TILE_INDEX_BY_ID, FEVER, LEVELS, TIMING } from "./constants.js";
import { sfx } from "./audio.js";

export const renderMixin = {
  setupBoardGrid() {
    this.boardEl.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    this.boardEl.style.gridTemplateRows = `repeat(${BOARD_SIZE}, 1fr)`;
    const nodes = [];
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tile";
        button.dataset.row = String(r);
        button.dataset.col = String(c);
        button.setAttribute("aria-label", "Empty cell");
        button.disabled = true;
        const parts = this.createCellParts();
        this.cellParts[r][c] = parts;
        button.append(parts.moodAura, parts.sprite, parts.moodMark, parts.specialChip, parts.lockMark, parts.inkLayer, parts.frameIcon, parts.frameLayer);
        this.cellNodes[r][c] = button;
        nodes.push(button);
      }
    }
    this.boardEl.replaceChildren(...nodes);
  },

  getCellNode(row, col) { return this.cellNodes[row]?.[col] ?? null; },
  getCellParts(row, col) { return this.cellParts[row]?.[col] ?? null; },

  createCellParts() {
    const moodAura = document.createElement("span"); moodAura.className = "mood-aura mood-aura-0"; moodAura.hidden = true;
    const sprite = document.createElement("span"); sprite.className = "sprite sprite--tile sprite-sakura mood-0"; sprite.style.setProperty("--mood", "0"); sprite.hidden = true;
    const moodMark = document.createElement("span"); moodMark.hidden = true; moodMark.setAttribute("aria-hidden", "true");
    const specialChip = document.createElement("span"); specialChip.hidden = true;
    const lockMark = document.createElement("span"); lockMark.className = "lock-mark"; const lockSprite = document.createElement("span"); lockSprite.className = "sprite sprite--badge sprite-lock"; lockMark.append(lockSprite); lockMark.hidden = true;
    const inkLayer = document.createElement("span"); inkLayer.className = "ink-layer"; const inkSprite = document.createElement("span"); inkSprite.className = "sprite sprite--badge sprite-ink-badge"; const inkCount = document.createElement("span"); inkCount.className = "layer-count"; inkCount.textContent = "0"; inkLayer.append(inkSprite, inkCount); inkLayer.hidden = true;
    const frameIcon = document.createElement("span"); frameIcon.className = "frame-icon sprite sprite--badge sprite-frame-badge"; frameIcon.hidden = true;
    const frameLayer = document.createElement("span"); frameLayer.className = "frame-layer"; frameLayer.textContent = "0"; frameLayer.hidden = true;
    return { moodAura, sprite, moodMark, specialChip, lockMark, inkLayer, inkCount, frameIcon, frameLayer };
  },

  cellHash(row, col) {
    const obstacle = this.obstacles[row]?.[col] ?? null;
    const tile = this.board[row]?.[col] ?? null;
    const sel = this.selected && this.selected.row === row && this.selected.col === col ? 1 : 0;
    if (obstacle?.kind === "frame") return `F${obstacle.layers}`;
    if (!tile) return "E";
    const spawnCells = this.spawnOffsets.get(this.key(row, col)) ?? 0;
    return `${tile.type}|${tile.mood ?? 0}|${tile.special ?? ""}|${tile.locked ? 1 : 0}|${obstacle?.kind === "ink" ? obstacle.layers : 0}|${sel}|${spawnCells}`;
  },

  renderCell(row, col, force) {
    const hash = this.cellHash(row, col);
    if (!force && hash === this.cellHashes[row][col]) return;
    this.cellHashes[row][col] = hash;
    const obstacle = this.obstacles[row]?.[col] ?? null;
    const tile = this.board[row]?.[col] ?? null;
    const button = this.getCellNode(row, col);
    const parts = this.getCellParts(row, col);
    if (!button || !parts) return;

    let cls = "tile";
    let disabled = false;
    let label = "Empty cell";
    parts.moodAura.hidden = true; parts.sprite.hidden = true; parts.moodMark.hidden = true; parts.specialChip.hidden = true; parts.lockMark.hidden = true; parts.inkLayer.hidden = true; parts.frameIcon.hidden = true; parts.frameLayer.hidden = true;

    if (obstacle?.kind === "frame") {
      cls += " frame-block"; disabled = true;
      parts.frameIcon.hidden = false; parts.frameLayer.hidden = false; parts.frameLayer.textContent = `${obstacle.layers}`;
      label = `Panel Frame ${obstacle.layers} layers`;
      if (button.className !== cls) button.className = cls; button.disabled = disabled; button.setAttribute("aria-label", label); return;
    }
    if (!tile) { disabled = true; if (button.className !== cls) button.className = cls; button.disabled = disabled; button.setAttribute("aria-label", label); return; }

    const meta = TILE_TYPES[tile.type];
    const mood = tile.mood ?? 0;
    cls += ` ${meta.id} mood-${mood}`;
    label = `${meta.id} at ${row + 1},${col + 1}`;

    const tileKey = this.key(row, col);
    const spawnCells = this.spawnOffsets.get(tileKey);
    if (spawnCells) {
      const spawnDepth = Math.min(4, spawnCells);
      button.style.setProperty("--spawn-cells", `${spawnDepth}`);
      button.style.setProperty("--spawn-delay", `${Math.min(60, (spawnDepth - 1) * 14)}ms`);
      button.style.setProperty("--spawn-ms", `${Math.min(440, 310 + spawnDepth * 28)}ms`);
    } else {
      button.style.setProperty("--spawn-cells", "1"); button.style.setProperty("--spawn-delay", "0ms"); button.style.setProperty("--spawn-ms", "300ms");
    }
    button.style.setProperty("--fall-ms", "220ms"); button.style.setProperty("--fx-delay", "0ms");

    parts.moodAura.hidden = false;
    const auraClass = `mood-aura mood-aura-${mood}`; if (parts.moodAura.className !== auraClass) parts.moodAura.className = auraClass;
    parts.sprite.hidden = false;
    const spriteClass = `sprite sprite--tile sprite-${meta.id} mood-${mood}`; if (parts.sprite.className !== spriteClass) parts.sprite.className = spriteClass;
    parts.sprite.style.setProperty("--mood", `${mood}`);
    if (mood > 0) { parts.moodMark.hidden = false; const markClass = `mood-mark mood-mark-${mood}`; if (parts.moodMark.className !== markClass) parts.moodMark.className = markClass; parts.moodMark.textContent = mood === 1 ? "♥" : "!"; }
    if (tile.special) { cls += ` special special-${tile.special}`; parts.specialChip.hidden = false; const chipClass = `special-chip sprite sprite--badge sprite-special-${tile.special}`; if (parts.specialChip.className !== chipClass) parts.specialChip.className = chipClass; }
    if (tile.locked) { cls += " locked"; parts.lockMark.hidden = false; }
    if (obstacle?.kind === "ink") { cls += " inked"; parts.inkLayer.hidden = false; parts.inkCount.textContent = `${obstacle.layers}`; }
    if (this.selected && this.selected.row === row && this.selected.col === col) cls += " selected";
    if (button.className !== cls) button.className = cls; button.disabled = disabled; button.setAttribute("aria-label", label);
  },

  renderKeySet(keys) { const keyList = Array.isArray(keys) ? keys : [...keys]; for (const key of keyList) { const [row, col] = this.fromKey(key); if (!this.inBounds(row, col)) continue; this.renderCell(row, col); } },

  invalidateAllCells() { for (let r = 0; r < BOARD_SIZE; r += 1) { for (let c = 0; c < BOARD_SIZE; c += 1) { this.cellHashes[r][c] = ""; } } },

  render() { this.syncBoardInteractivity(); for (let r = 0; r < BOARD_SIZE; r += 1) { for (let c = 0; c < BOARD_SIZE; c += 1) { this.renderCell(r, c); } } },

  syncBoardInteractivity() {
    const blocked = this.busy || this.levelComplete;
    this.boardEl.classList.toggle("blocked", blocked);
    this.nextBtn.disabled = !this.levelComplete || this.levelIndex >= LEVELS.length - 1;
    this.shuffleBtn.disabled = this.busy || this.levelComplete;
  },

  updateHUD() {
    this.scoreEl.textContent = `${this.score}`;
    this.levelEl.textContent = `${this.levelIndex + 1} / ${LEVELS.length}`;
    this.movesEl.textContent = `${this.moves}`;
    this.comboEl.textContent = `x${this.combo.toFixed(1)}`;
    if (this.mScoreEl) this.mScoreEl.textContent = `${this.score}`;
    if (this.mMovesEl) this.mMovesEl.textContent = `${this.moves}`;
    if (this.mComboEl) this.mComboEl.textContent = `x${this.combo.toFixed(1)}`;
    if (this.mLevelEl) this.mLevelEl.textContent = `${this.levelIndex + 1}`;
    const feverPercent = Math.round((this.feverCharge / FEVER.MAX_CHARGE) * 100);
    if (this.feverFillEl) this.feverFillEl.style.width = `${feverPercent}%`;
    if (this.feverMeterEl) this.feverMeterEl.setAttribute("aria-valuenow", `${feverPercent}`);
    if (this.feverPercentEl) this.feverPercentEl.textContent = `${feverPercent}%`;
    if (this.feverStateEl) this.feverStateEl.textContent = this.feverActive ? "FEVER ON" : feverPercent >= 82 ? "Almost!" : "Charging";
    if (this.feverTurnsEl) this.feverTurnsEl.textContent = this.feverActive ? `${this.feverTurnsLeft} moves boost` : "Build chains";
    this.hudPanelEl?.classList.toggle("fever-on", this.feverActive);
    this.boardPanelEl?.classList.toggle("fever-on", this.feverActive);
    if (this.sfxTagEl && !this.sfxTagTimer) this.sfxTagEl.textContent = this.feverActive ? "FEVER!" : "KIRA!";
    this.nextBtn.disabled = !this.levelComplete || this.levelIndex >= LEVELS.length - 1;
    this.shuffleBtn.disabled = this.busy || this.levelComplete;
  },

  renderGoals() {
    const items = this.currentLevel.goals.map((goal) => {
      const li = document.createElement("li");
      const done = this.isGoalComplete(goal);
      if (done) li.classList.add("done");
      li.textContent = `${done ? "Done: " : ""}${this.goalText(goal)}`;
      return li;
    });
    this.goalsListEl.replaceChildren(...items);
  },

  goalText(goal) {
    const progress = Math.min(this.getGoalProgress(goal), goal.amount);
    if (goal.type === "score") return `Score ${progress}/${goal.amount}`;
    if (goal.type === "collect") { const tileIndex = TILE_INDEX_BY_ID[goal.tile]; const tile = TILE_TYPES[tileIndex]; return `${tile?.icon ?? "◆"} Collect ${tile?.name ?? "tiles"}: ${progress}/${goal.amount}`; }
    if (goal.type === "clear") return `Clear ${goal.obstacle === "ink" ? "ink blocks" : "panel frames"}: ${progress}/${goal.amount}`;
    if (goal.type === "unlock") return `Break locks ${progress}/${goal.amount}`;
    return "";
  },

  setStatus(text) { this.statusEl.textContent = text; this.retriggerElementClass(this.statusEl, "flash", "__statusFlashToken"); },

  flashSfxTag(text, duration = 1200) {
    if (!this.sfxTagEl) return;
    if (this.sfxTagTimer) window.clearTimeout(this.sfxTagTimer);
    this.sfxTagEl.textContent = text;
    this.sfxTagEl.classList.remove("sfx-pop"); void this.sfxTagEl.offsetWidth; this.sfxTagEl.classList.add("sfx-pop");
    this.sfxTagTimer = window.setTimeout(() => { this.sfxTagTimer = null; this.sfxTagEl.textContent = this.feverActive ? "FEVER!" : "KIRA!"; this.sfxTagEl.classList.remove("sfx-pop"); }, duration);
  },

  charQuote(event) {
    const chars = ["Sakura", "Neko", "Sol", "Ink", "Star", "Blade"];
    const pick = chars[Math.floor(Math.random() * chars.length)];
    const quotes = {
      miss: [`${pick}: "Nope, that won't work..."`, `${pick}: "Try again!"`, `${pick}: "Not quite, nya~"`, `${pick}: "Hmm, think again!"`],
      hit: [`${pick}: "Nice move!"`, `${pick}: "Sugoi~!"`, `${pick}: "Keep going!"`, `${pick}: "Naisu~!"`],
      chain: [`${pick}: "Chain attack!!"`, `${pick}: "We're unstoppable!"`, `${pick}: "IKUZO!"`],
      combo: [`${pick}: "What a combo!!"`, `${pick}: "Sugoi~!!"`, `${pick}: "We're on fire!"`],
      mega: [`${pick}: "MEGA COMBO!!!"`, `${pick}: "Incredible!!!"`, `${pick}: "MASAKA?!"`],
      color: [`${pick}: "Color explosion!"`, `${pick}: "All at once!"`, `${pick}: "Zenbu kieta!"`],
      shuffle: [`${pick}: "Board shuffled!"`, `${pick}: "New layout, new chances!"`, `${pick}: "Fresh start!"`],
    };
    const list = quotes[event] ?? quotes.hit;
    return list[Math.floor(Math.random() * list.length)];
  },

  retriggerElementClass(node, className, tokenKey) {
    if (!node) return;
    const nextToken = (node[tokenKey] ?? 0) + 1; node[tokenKey] = nextToken;
    node.classList.remove(className);
    window.requestAnimationFrame(() => { if (node[tokenKey] !== nextToken) return; node.classList.add(className); });
  },

  showComboBurst(text, animate = true) {
    if (!this.comboBurstEl) return;
    if (!animate) { this.comboBurstQueue.length = 0; this.comboBurstVisible = false; if (this.comboBurstTimer) { window.clearTimeout(this.comboBurstTimer); this.comboBurstTimer = null; } this.comboBurstEl.classList.remove("show"); this.comboBurstEl.textContent = text; return; }
    this.comboBurstQueue.push(String(text));
    if (this.comboBurstQueue.length > 2) this.comboBurstQueue.splice(1, this.comboBurstQueue.length - 2);
    if (this.comboBurstVisible) return;
    this.playNextComboBurst();
  },

  playNextComboBurst() {
    if (!this.comboBurstEl) return;
    const text = this.comboBurstQueue.shift();
    if (!text) { this.comboBurstVisible = false; return; }
    this.comboBurstVisible = true; this.comboBurstEl.textContent = text;
    const duration = this.getComboBurstDuration(text);
    this.comboBurstEl.style.setProperty("--combo-ms", `${duration}ms`); this.comboBurstEl.classList.remove("show"); this.triggerPanelBoost(2);
    const token = ++this.comboBurstToken;
    window.requestAnimationFrame(() => { if (token !== this.comboBurstToken) return; this.comboBurstEl.classList.add("show"); });
    if (this.comboBurstTimer) window.clearTimeout(this.comboBurstTimer);
    this.comboBurstTimer = window.setTimeout(() => { if (token !== this.comboBurstToken) return; this.comboBurstVisible = false; this.comboBurstTimer = null; this.playNextComboBurst(); }, duration + 40);
  },

  getComboBurstDuration(text) {
    const compact = String(text ?? "").trim();
    const charCount = compact.replace(/\s+/g, "").length;
    let duration = 1100 + Math.min(520, charCount * 45);
    if (compact.includes("CHAIN")) duration += 180;
    if (compact === "VICTORY!" || compact === "STAGE CLEAR") duration += 240;
    return Math.min(duration, 1900);
  },

  pulseBoard(level = 1) { if (!this.boardEl) return; this.boardEl.style.setProperty("--shake-power", `${1 + level * 0.35}`); this.retriggerElementClass(this.boardEl, "juice-shake", "__shakeToken"); },
  flashBoard(level = 1) { if (!this.boardEl) return; this.boardEl.style.setProperty("--flash-power", `${0.28 + level * 0.14}`); this.retriggerElementClass(this.boardEl, "hit-flash", "__flashToken"); },
  triggerSpeedLines() { if (!this.boardPanelEl) return; this.retriggerElementClass(this.boardPanelEl, "speed-lines", "__speedToken"); },
  triggerPanelBoost(level = 1) { if (!this.boardPanelEl) return; this.boardPanelEl.style.setProperty("--boost-power", `${1 + level * 0.15}`); this.retriggerElementClass(this.boardPanelEl, "boost", "__boostToken"); },

  triggerImpactChain(level = 1) {
    if (!this.boardEl) return;
    this.pulseBoard(level);
    this.boardEl.style.setProperty("--impact-level", `${1 + level * 0.22}`);
    this.retriggerElementClass(this.boardEl, "impact-chain", "__impactToken");
    window.setTimeout(() => { this.boardEl.style.setProperty("--shake-power", `${1.2 + level * 0.42}`); this.retriggerElementClass(this.boardEl, "juice-shake", "__shakeToken"); }, 44);
  },

  getBoardRects() {
    if (!this.boardEl || !this.boardPanelEl) return null;
    const boardRect = this.boardEl.getBoundingClientRect(); const panelRect = this.boardPanelEl.getBoundingClientRect();
    if (boardRect.width <= 0 || boardRect.height <= 0) return null;
    return { boardRect, panelRect };
  },

  cellCenter(row, col, rects) {
    return { x: rects.boardRect.left - rects.panelRect.left + ((col + 0.5) * rects.boardRect.width) / BOARD_SIZE, y: rects.boardRect.top - rects.panelRect.top + ((row + 0.5) * rects.boardRect.height) / BOARD_SIZE };
  },

  spawnScorePopup(keys, points, chain = 1) {
    if (!this.fxLayerEl || !points || points <= 0) return;
    const rects = this.getBoardRects(); if (!rects) return;
    const keyList = Array.isArray(keys) ? keys : [...keys]; if (keyList.length === 0) return;
    let rowSum = 0; let colSum = 0;
    for (const key of keyList) { const [row, col] = this.fromKey(key); rowSum += row; colSum += col; }
    const row = rowSum / keyList.length; const col = colSum / keyList.length;
    const center = this.cellCenter(row, col, rects);
    const label = document.createElement("div"); label.className = "fx-score";
    if (chain >= 2) label.classList.add("chain"); if (points >= 1200) label.classList.add("mega"); if (this.feverActive) label.classList.add("fever");
    label.textContent = `+${points}${chain >= 2 ? ` x${chain}` : ""}`;
    label.style.left = `${center.x}px`; label.style.top = `${center.y}px`;
    this.fxLayerEl.append(label);
    window.setTimeout(() => label.remove(), TIMING.SCORE_POP_MS);
  },

  spawnSweepFX(row, col, orientation, level = 1) {
    if (!this.fxLayerEl) return;
    const rects = this.getBoardRects(); if (!rects) return;
    const center = this.cellCenter(row, col, rects);
    const sweep = document.createElement("div"); sweep.className = `fx-sweep fx-sweep-${orientation}`;
    sweep.style.left = `${center.x}px`; sweep.style.top = `${center.y}px`; sweep.style.setProperty("--sweep-power", `${1 + level * 0.24}`);
    this.fxLayerEl.append(sweep);
    window.setTimeout(() => sweep.remove(), TIMING.SWEEP_MS);
  },

  spawnDualSweepFX(a, b, level = 2) { this.spawnSweepFX(a.row, a.col, "h", level); this.spawnSweepFX(a.row, a.col, "v", level); this.spawnSweepFX(b.row, b.col, "h", level); this.spawnSweepFX(b.row, b.col, "v", level); },

  spawnRunSweeps(runs, level = 1) {
    const candidates = runs.filter((run) => run.length >= 4); if (candidates.length === 0) return;
    const sorted = [...candidates].sort((a, b) => b.length - a.length);
    for (const run of sorted.slice(0, 2)) { const anchor = run.cells[Math.floor(run.cells.length / 2)]; this.spawnSweepFX(anchor.row, anchor.col, run.orientation, level + Number(run.length >= 5)); }
  },

  async animatePositions(positions, className, duration = 140) {
    const nodes = [];
    for (const pos of positions) { const node = this.getCellNode(pos.row, pos.col); if (node) nodes.push(node); }
    if (nodes.length === 0) return;
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      if (className === "swap-pop") { const dir = i % 2 === 0 ? 1 : -1; node.style.setProperty("--motion-tilt", `${(0.8 * dir).toFixed(2)}deg`); node.style.setProperty("--motion-shift", `${(1.6 * dir).toFixed(2)}px`); }
      else if (className === "swap-deny") { const dir = i % 2 === 0 ? 1 : -1; node.style.setProperty("--deny-dir", `${dir}`); }
    }
    await this.retriggerClass(nodes, className); await this.sleep(duration);
  },

  async animateKeySet(keys, className, duration = 150) {
    const entries = []; const keyList = Array.isArray(keys) ? keys : [...keys];
    for (const key of keyList) { const [row, col] = this.fromKey(key); const node = this.getCellNode(row, col); if (node) entries.push({ row, col, node }); }
    if (entries.length === 0) return;
    if (className === "spawn-enter") entries.sort((a, b) => a.row - b.row || a.col - b.col);
    else if (className === "clear-pop") entries.sort((a, b) => a.col - b.col || a.row - b.row);
    else entries.sort((a, b) => a.row - b.row || a.col - b.col);
    for (let i = 0; i < entries.length; i += 1) {
      const { node } = entries[i];
      if (className === "clear-pop") { const dir = i % 2 === 0 ? 1 : -1; node.style.setProperty("--clear-tilt", `${(1.6 * dir).toFixed(2)}deg`); node.style.setProperty("--fx-delay", `${Math.min(16, i * 4)}ms`); }
      else if (className === "spawn-enter") { const dir = i % 2 === 0 ? 1 : -1; node.style.setProperty("--spawn-jitter", `${(0.34 * dir).toFixed(2)}deg`); node.style.setProperty("--fx-delay", `${Math.min(10, i * 2)}ms`); }
      else if (className === "fall-step") { const dir = i % 2 === 0 ? 1 : -1; node.style.setProperty("--fall-tilt", `${(0.5 * dir).toFixed(2)}deg`); node.style.setProperty("--fall-shift", `${(0.8 * dir).toFixed(2)}px`); node.style.setProperty("--fx-delay", "0ms"); }
      else node.style.setProperty("--fx-delay", "0ms");
    }
    await this.retriggerClass(entries.map((entry) => entry.node), className); await this.sleep(duration);
    for (const { row, col } of entries) this.cellHashes[row][col] = "";
  },

  triggerKeySet(keys, className) {
    const entries = []; const keyList = Array.isArray(keys) ? keys : [...keys];
    for (const key of keyList) { const [row, col] = this.fromKey(key); const node = this.getCellNode(row, col); if (node) { entries.push(node); this.cellHashes[row][col] = ""; } }
    if (entries.length === 0) return;
    for (let i = 0; i < entries.length; i += 1) entries[i].style.setProperty("--fx-delay", `${Math.min(10, i * 2)}ms`);
    void this.retriggerClass(entries, className);
  },

  async retriggerClass(nodes, className) { for (const node of nodes) node.classList.remove(className); await this.nextFrame(); for (const node of nodes) node.classList.add(className); },
  nextFrame() { return new Promise((resolve) => { window.requestAnimationFrame(() => resolve()); }); },

  consumeSpawnOffsets(keys) { if (!this.spawnOffsets || this.spawnOffsets.size === 0) return; const keyList = Array.isArray(keys) ? keys : [...keys]; for (const key of keyList) this.spawnOffsets.delete(key); },

  sampleKeys(keys, maxCount = 10) {
    const list = Array.isArray(keys) ? [...keys] : [...keys]; if (list.length <= maxCount) return list;
    for (let i = list.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return list.slice(0, maxCount);
  },

  spawnImpactFX(keys, type = "clear") {
    if (!this.fxLayerEl || !this.boardPanelEl) return;
    const keyList = this.sampleKeys(keys, type === "mega" ? 10 : type === "spawn" ? 4 : 6); if (keyList.length === 0) return;
    const rects = this.getBoardRects(); if (!rects) return;
    for (const key of keyList) {
      const [row, col] = this.fromKey(key);
      const burst = document.createElement("div"); burst.className = `fx-burst fx-burst-${type}`;
      const center = this.cellCenter(row, col, rects); burst.style.left = `${center.x}px`; burst.style.top = `${center.y}px`;
      const particles = type === "mega" ? 6 : type === "spawn" ? 3 : 4;
      for (let i = 0; i < particles; i += 1) { const p = document.createElement("span"); p.className = "fx-p"; p.style.setProperty("--a", `${(360 / particles) * i + (Math.random() * 18 - 9)}deg`); p.style.setProperty("--d", `${14 + Math.random() * (type === "spawn" ? 10 : 20)}px`); burst.append(p); }
      this.fxLayerEl.append(burst);
      window.setTimeout(() => burst.remove(), type === "spawn" ? 320 : 440);
    }
  },

  renderStars(count, animated) {
    this.resultStarsEl.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const star = document.createElement("span"); star.className = `result-star ${i < count ? "earned" : "empty"}`; star.textContent = "★";
      if (animated && i < count) star.style.animationDelay = `${300 + i * 250}ms`;
      this.resultStarsEl.append(star);
    }
  },

  spawnConfetti() {
    this.resultConfettiEl.innerHTML = "";
    const colors = ["#ff4f9e", "#25d7ee", "#ffd25f", "#9cf7d8", "#c579ff", "#ff7a3a"];
    for (let i = 0; i < 40; i++) {
      const piece = document.createElement("span"); piece.className = "confetti-piece";
      piece.style.setProperty("--x", `${Math.random() * 100}%`); piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 200}px`);
      piece.style.setProperty("--delay", `${Math.random() * 600}ms`); piece.style.setProperty("--duration", `${1200 + Math.random() * 800}ms`);
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      this.resultConfettiEl.append(piece);
    }
  },

  showResultOverlay(type) {
    const isVictory = type === "victory";
    this.resultOverlay.hidden = false; this.resultOverlay.className = `result-overlay ${isVictory ? "victory" : "game-over"}`;
    this.resultTitle.textContent = isVictory ? "Stage Clear!" : "Game Over";
    const movesUsed = this.currentLevel.moves - this.moves;
    const stars = isVictory ? this.calculateStars() : 0;
    const lines = [];
    if (isVictory) {
      lines.push(`Stage ${this.currentLevel.id}: ${this.currentLevel.name}`);
      this.saveProgress(this.currentLevel.id, this.score, stars);
      const coinsEarned = this.awardLevelCoins(stars);
      const prev = this.getLevelProgress(this.currentLevel.id);
      if (prev && prev.bestScore > this.score) lines.push(`<span class="result-detail">Best: ${prev.bestScore.toLocaleString("en")} pts</span>`);
      if (coinsEarned > 0) lines.push(`<span class="result-coins">+${coinsEarned} コイン</span>`);
    }
    lines.push(`<span class="result-score">${this.score.toLocaleString("en")} pts</span>`);
    lines.push(`<span class="result-detail">${movesUsed} moves used of ${this.currentLevel.moves}</span>`);
    if (!isVictory) { const missing = this.currentLevel.goals.find((g) => !this.isGoalComplete(g)); if (missing) lines.push(`<span class="result-detail">Remaining: ${this.goalText(missing)}</span>`); }
    this.renderStars(stars, isVictory);
    this.resultBody.innerHTML = lines.join("");
    this.resultNextBtn.hidden = !isVictory || this.levelIndex >= LEVELS.length - 1;
    this.resultRetryBtn.textContent = isVictory ? "Play Again" : "Try Again";
    if (isVictory) this.spawnConfetti(); else this.resultConfettiEl.innerHTML = "";
  },

  hideResultOverlay() { this.resultOverlay.hidden = true; this.resultConfettiEl.innerHTML = ""; },

  async applyGravityAnimated() {
    const moved = this.applyGravityStep();
    if (moved.length === 0) return false;
    sfx.gravity();
    this.boardEl?.classList.add("gravity-phase"); this.syncBoardInteractivity();
    const dirtyKeys = new Set();
    for (const move of moved) { dirtyKeys.add(this.key(move.row, move.col)); dirtyKeys.add(this.key(move.fromRow, move.col)); }
    this.renderKeySet(dirtyKeys);
    const entries = []; let maxTotalMs = 0;
    for (const move of moved) { const node = this.getCellNode(move.row, move.col); if (node) entries.push({ node, row: move.row, col: move.col, distance: move.distance }); }
    if (entries.length === 0) { this.boardEl?.classList.remove("gravity-phase"); return true; }
    let maxDistance = 1;
    entries.sort((a, b) => a.row - b.row || a.col - b.col);
    for (let i = 0; i < entries.length; i += 1) {
      const { node, distance } = entries[i];
      const cappedDistance = Math.min(6, Math.max(1, distance));
      const fallMs = Math.min(420, 180 + cappedDistance * 40); const delayMs = Math.min(10, i * 0.6);
      node.style.setProperty("--fall-distance", `${cappedDistance}`); node.style.setProperty("--fall-ms", `${fallMs}ms`); node.style.setProperty("--fx-delay", `${Math.round(delayMs)}ms`);
      maxDistance = Math.max(maxDistance, cappedDistance); maxTotalMs = Math.max(maxTotalMs, fallMs + delayMs);
    }
    if (maxTotalMs <= 0) maxTotalMs = Math.min(360, 150 + maxDistance * 34);
    try {
      await this.retriggerClass(entries.map((entry) => entry.node), "fall-drop");
      await this.sleep(Math.ceil(maxTotalMs + 8));
      return true;
    } finally { this.boardEl?.classList.remove("gravity-phase"); }
  },
};
