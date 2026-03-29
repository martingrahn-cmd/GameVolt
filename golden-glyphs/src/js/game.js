// src/js/game.js
import { Layout } from "./layout.js";
import { Grid } from "./grid.js";
import { Piece } from "./piece.js";
import { HUD } from "./hud.js";
import { Input } from "./input.js";
import { BitField } from "./bitfield.js";
import { Tray } from "./tray.js";
import { AudioManager } from "./audio.js";
import { UI } from "./ui.js";
import { Effects } from "./effects.js";
import { CONFIG, SHAPES, WORLDS, SYSTEM_IMAGES, SKINS, TRAILS, ACHIEVEMENTS } from "./config.js";
import { AchievementSystem } from "./achievements.js";
import { WorldMap } from "./worldmap.js";
import { Shop } from "./shop.js";
import { Tutorial } from "./tutorial.js"; 
import { DailySystem } from "./daily.js"; 
import { DynamicBackground } from "./dynamic_background.js";

import { LEVELS_EASY } from "./levels_easy.js";
import { LEVELS_MEDIUM } from "./levels_medium.js"; 
import { LEVELS_HARD } from "./levels_hard.js";
import { LEVELS_ARCANE } from "./levels_arcane.js";
import { LEVELS_DAILY } from "./levels_daily.js"; 
import { TimeAttack } from "./timeattack.js";
import { ads } from "./ads.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

let layout, grid, bitfield, tray, pieces = [], effects, audio, hud, input, ui, worldMap, shop, tutorial, dailySystem, timeAttack, dynamicBg, achievements;
let lastTime = 0; let timeElapsed = 0; let gameState = "MENU"; let currentLevelIndex = 0; let currentLevelSet = []; let currentLevelSetName = 'LEVELS_EASY'; let hasSeenTutorial = false; let totalGold = 0;

let ownedHints = 3; 
let ownedItems = ["trail_default", "skin_default", "glow_none", "default"]; 
let activeItems = { trail: "trail_default", skin: "skin_default", glow: "glow_none", world: "default" };
let menuBtnLayout = { x: 0, startY: 0, w: 0, h: 0, gap: 0 };
let activeHint = null;
let loopRunning = false;
let hintTimeoutId = null;
let transitionAlpha = 0; // 0 = genomskinlig, 1 = svart
let transitionDir = 0;   // 0 = ingen, 1 = fading out, -1 = fading in
let transitionCallback = null;

function clearActiveHint() {
    activeHint = null;
    if (hintTimeoutId) {
        clearTimeout(hintTimeoutId);
        hintTimeoutId = null;
    }
}

// Fade-to-black transition: fadar ut, kör callback (ladda nivå), fadar in
function transitionToLevel(callback) {
    transitionDir = 1; // fade out
    transitionAlpha = 0;
    transitionCallback = callback;
} 
let shopReturnState = "MAP"; // Variabel för att hålla koll på var man ska gå tillbaka från shop 

const bgImage = new Image(); 
const menuBgImage = new Image();
let menuBgLoaded = false; 
let bgLoaded = false; 
const defaultBgSrc = SYSTEM_IMAGES["bg_temple"] ? SYSTEM_IMAGES["bg_temple"].src : "assets/gfx/bg_temple.webp";

// Säker bildladdning med felhantering
function setBgImage(src) {
    if (!src) {
        // Om src är null/undefined, använd default
        src = defaultBgSrc;
    }
    bgLoaded = false;
    bgImage.src = src;
}

bgImage.onload = () => { bgLoaded = true; };
bgImage.onerror = () => { 
    console.warn("Failed to load background:", bgImage.src);
    bgLoaded = false;
    // Fallback till default
    if (bgImage.src !== defaultBgSrc) {
        bgImage.src = defaultBgSrc;
    }
};

setBgImage(defaultBgSrc);
menuBgImage.src = 'assets/gfx/bg_menu.webp';
menuBgImage.onload = () => { menuBgLoaded = true; };

const ALL_LEVEL_SETS = { 'LEVELS_EASY': LEVELS_EASY, 'LEVELS_MEDIUM': LEVELS_MEDIUM, 'LEVELS_HARD': LEVELS_HARD, 'LEVELS_ARCANE': LEVELS_ARCANE, 'LEVELS_DAILY': LEVELS_DAILY };
const STAR_TIMES = { 3: 20, 2: 40 };

const MENU_BUTTONS = [
    { text: "CAMPAIGN", name: 'LEVELS_EASY', color: "#4CAF50", icon: "🏛️" },
    { text: "DAILY CHALLENGE", name: 'DAILY', color: "#E91E63", icon: "📅" },
    { text: "TIME ATTACK", name: 'MODE_TIME', color: "#FF5722", icon: "⏱️" },
    { text: "ZEN MODE", name: 'MODE_ZEN', color: "#00BCD4", icon: "🧘" },
    { text: "SHOP", name: 'SHOP', color: "#9C27B0", icon: "🛒" },
    { text: "ACHIEVEMENTS", name: 'ACHIEVEMENTS', color: "#FFD700", icon: "🏆" }
];

function getEventPos(e) { const rect = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; const scaleX = (canvas.width / dpr) / rect.width; const scaleY = (canvas.height / dpr) / rect.height; let clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX; let clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY; return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }; }

// Hjälpfunktion för att justera färgljushet
function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return `rgb(${r},${g},${b})`;
}
function getStars(time) { if (time < STAR_TIMES[3]) return 3; if (time < STAR_TIMES[2]) return 2; return 1; }
function getStarsForLevel(levelSetName, levelIndex) { const key = `${levelSetName}_${levelIndex}`; return parseInt(localStorage.getItem(key) || 0); }
export function getStarsForGlobalIndex(globalIndex) { let setName = 'LEVELS_EASY'; let localIndex = 0; if (globalIndex < 25) { setName = 'LEVELS_EASY'; localIndex = globalIndex; } else if (globalIndex < 50) { setName = 'LEVELS_MEDIUM'; localIndex = globalIndex - 25; } else if (globalIndex < 75) { setName = 'LEVELS_HARD'; localIndex = globalIndex - 50; } else { setName = 'LEVELS_ARCANE'; localIndex = globalIndex - 75; } if (ALL_LEVEL_SETS[setName] && ALL_LEVEL_SETS[setName][localIndex]) { return getStarsForLevel(setName, localIndex); } return 0; }
function calculateTotalStars() { let total = 0; for (const setName in ALL_LEVEL_SETS) { if (ALL_LEVEL_SETS[setName] && Array.isArray(ALL_LEVEL_SETS[setName])) { const setLength = ALL_LEVEL_SETS[setName].length; for (let i = 0; i < setLength; i++) { total += getStarsForLevel(setName, i); } } } return total; }

function saveProgress(stars = 0) { try { const progress = { set: currentLevelSetName, index: currentLevelIndex }; localStorage.setItem('goldenGlyphsProgress', JSON.stringify(progress)); localStorage.setItem('goldenGlyphsGold', totalGold.toString()); localStorage.setItem('goldenGlyphsHints', ownedHints.toString()); localStorage.setItem('goldenGlyphsInventory', JSON.stringify(ownedItems)); localStorage.setItem('goldenGlyphsActive', JSON.stringify(activeItems)); localStorage.setItem('goldenGlyphsTutorial', hasSeenTutorial ? 'true' : 'false'); if (stars > 0 && currentLevelSetName !== 'LEVELS_DAILY') { const levelKey = `${currentLevelSetName}_${currentLevelIndex}`; const existingStars = parseInt(localStorage.getItem(levelKey) || 0); if (stars > existingStars) localStorage.setItem(levelKey, stars.toString()); } } catch (e) {} }
function loadProgress() { try { const savedGold = localStorage.getItem('goldenGlyphsGold'); if (savedGold) totalGold = parseInt(savedGold); const savedHints = localStorage.getItem('goldenGlyphsHints'); if (savedHints) ownedHints = parseInt(savedHints); const savedInv = localStorage.getItem('goldenGlyphsInventory'); if (savedInv) ownedItems = JSON.parse(savedInv); const savedActive = localStorage.getItem('goldenGlyphsActive'); if (savedActive) { activeItems = JSON.parse(savedActive); /* Migrera gamla saves: bg_temple → default */ if (!activeItems.world || activeItems.world === 'bg_temple') activeItems.world = "default"; /* Migrera trail_none → trail_default */ if (!activeItems.trail || activeItems.trail === 'trail_none') activeItems.trail = "trail_default"; } if (!activeItems.glow) activeItems.glow = "glow_none"; /* Migrera ownedItems: trail_none → trail_default */ if (ownedItems.includes('trail_none')) { ownedItems = ownedItems.filter(id => id !== 'trail_none'); if (!ownedItems.includes('trail_default')) ownedItems.push('trail_default'); } hasSeenTutorial = localStorage.getItem('goldenGlyphsTutorial') === 'true'; const saved = localStorage.getItem('goldenGlyphsProgress'); if (saved) { const progress = JSON.parse(saved); if (progress.set !== 'LEVELS_DAILY' && ALL_LEVEL_SETS[progress.set]) { currentLevelSetName = progress.set; currentLevelIndex = progress.index; return true; } } } catch (e) {} return false; }

function playSound(name) { if (window.audio) { if (typeof window.audio.playSfx === 'function') window.audio.playSfx(name); else if (typeof window.audio.play === 'function') window.audio.play(name); } }

function checkAchievements(extra = {}) {
    if (!achievements) return;
    const getStarsForSet = (setName, i) => {
        const key = `${setName}_${i}`;
        return parseInt(localStorage.getItem(key) || '0');
    };
    achievements.check({
        totalStars: calculateTotalStars(),
        totalGold: totalGold,
        ownedItems: ownedItems,
        activeItems: activeItems,
        getStarsForSet: getStarsForSet,
        timeAttackScore: timeAttack ? timeAttack.score : 0,
        dailyStreak: achievements.getDailyStreak(),
        ...extra
    });
}
function drawBackground() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    if (!bgLoaded || !bgImage.complete || bgImage.naturalWidth === 0) {
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, w, h);
        return;
    }
    const imgRatio = bgImage.width / bgImage.height;
    const screenRatio = w / h;
    let renderW, renderH, offsetX, offsetY;
    if (screenRatio > imgRatio) {
        renderW = w; renderH = w / imgRatio;
        offsetX = 0; offsetY = (h - renderH) / 2;
    } else {
        renderH = h; renderW = h * imgRatio;
        offsetX = (w - renderW) / 2; offsetY = 0;
    }
    ctx.globalAlpha = 1.0;
    try {
        ctx.drawImage(bgImage, offsetX, offsetY, renderW, renderH);
    } catch (e) {
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1.0;
}

function initSystems() { 
  layout = new Layout(canvas); grid = new Grid(ctx, CONFIG.COLS, CONFIG.ROWS); hud = new HUD(layout); 
  audio = new AudioManager(); window.audio = audio; 
  dynamicBg = new DynamicBackground(canvas); // Partikeleffekter
  layout.onResize = () => { if (grid) grid.resize(); if (tray) tray.resize(); if (hud) hud.resize(); if (worldMap) worldMap.resize(); if (dynamicBg) dynamicBg.resize(); resetPiecesPosition(); }; 
  bitfield = new BitField(grid); tray = new Tray(ctx, layout); effects = new Effects(grid); tutorial = new Tutorial(canvas, grid); dailySystem = new DailySystem(); timeAttack = new TimeAttack(); 
  ui = new UI(() => { if (currentLevelSetName === 'LEVELS_DAILY') { gameState = "MENU"; saveProgress(); } else { if (currentLevelSetName === 'LEVELS_EASY' && currentLevelIndex === 0) { hasSeenTutorial = true; saveProgress(); } currentLevelIndex++; if (currentLevelIndex >= currentLevelSet.length) { gameState = "MAP"; } else { saveProgress(); timeElapsed = 0; loadLevel(currentLevelIndex); } } }, ads);
  input = new Input(canvas, grid, pieces, bitfield, tray, effects);
  input.hudCheckFn = (x, y) => hud && hud.checkHit(x, y);
  worldMap = new WorldMap(canvas, (globalLevelIndex) => startLevelFromMap(globalLevelIndex), () => goToMenu(), (index) => getStarsForGlobalIndex(index), () => { shopReturnState = "MAP"; gameState = "SHOP"; shop.updateInventory(ownedItems, activeItems, ownedHints); checkAchievements({ visitedShop: true }); }, () => totalGold);
  shop = new Shop( canvas, () => { gameState = shopReturnState; }, (item, action) => handleShopPurchase(item, action), ads );
  achievements = new AchievementSystem(canvas);
  const savedHigh = localStorage.getItem('goldenGlyphsHighScore'); if (savedHigh && hud) { hud.highScore = parseInt(savedHigh); }

  // --- GameVolt SDK ---
  if (window.GameVolt) {
    GameVolt.init('golden-glyphs');
    GameVolt.save.registerMigration({
      keys: ['goldenGlyphsProgress', 'goldenGlyphsGold', 'goldenGlyphsHints', 'goldenGlyphsInventory', 'goldenGlyphsActive', 'goldenGlyphsTutorial', 'goldenGlyphsAchievements', 'goldenGlyphsGoldEarned', 'goldenGlyphsGoldSpent', 'goldenGlyphsDailyCount', 'goldenGlyphsLevelsWon', 'goldenGlyphsHighScore', 'goldenGlyphsLeaderboard', 'goldenGlyphsTA_PB'],
      merge: function(local, cloud) {
        return cloud || local['goldenGlyphsProgress'] || {};
      },
      getAchievements: function(local) {
        var achs = local['goldenGlyphsAchievements'] || {};
        return Object.keys(achs).map(function(id) { return { id: id, unlocked_at: achs[id] }; });
      },
      getScores: function(local) {
        var pb = null;
        try { pb = local['goldenGlyphsTA_PB']; } catch(e) {}
        if (pb && pb.bestScore) return [{ score: pb.bestScore, mode: 'time-attack' }];
        return [];
      }
    });
    // Sync local trophies to cloud on auth state change
    GameVolt.auth.onStateChange(function(user) {
      if (user && achievements && achievements.unlocked) {
        var ids = Object.keys(achievements.unlocked);
        for (var i = 0; i < ids.length; i++) {
          GameVolt.achievements.unlock(ids[i]);
        }
      }
    });
  }
  if (typeof gvPost === 'function') gvPost('game_start', {});
  if (typeof GameVoltTracker !== 'undefined') GameVoltTracker.start('Golden Glyphs');
  window.addEventListener('level-complete', () => { const completionTime = Math.floor(timeElapsed); let awardedStars = getStars(completionTime); let reward = 0; 
    
    // Zen Mode: Ingen win-screen, bara smooth transition
    if (zenMode) {
        // Markera tutorial som sedd om det var tutorial-nivån
        if (currentLevelSetName === 'LEVELS_EASY' && currentLevelIndex === 0 && !hasSeenTutorial) {
            hasSeenTutorial = true;
            saveProgress();
        }
        
        // Spela mjukt ljud (fallback till 'place' om zen_complete saknas)
        try { playSound('zen_complete'); } catch(e) { playSound('place'); }
        
        // Mjuk puls-effekt på bitarna
        if (effects) effects.triggerVictory(pieces);
        
        // Smooth transition till nästa nivå
        setTimeout(() => {
            transitionToLevel(() => nextZenLevel());
        }, 600);
        
        return; // Skippa resten av win-logiken
    }
    
    let streakBonus = 0; const isDaily = currentLevelSetName === 'LEVELS_DAILY'; if (isDaily) { if (dailySystem && !dailySystem.isCompleted()) { if (dailySystem) dailySystem.markCompleted(); const streak = achievements ? achievements.getDailyStreak() : 0; streakBonus = streak >= 7 ? 100 : streak >= 3 ? 50 : streak >= 2 ? 20 : 0; reward = 500 + streakBonus; } else { reward = 0; } } else { const levelKey = `${currentLevelSetName}_${currentLevelIndex}`; const oldStars = parseInt(localStorage.getItem(levelKey) || 0); if (awardedStars > oldStars) reward = 100 + (awardedStars * 20); else reward = 50; if (awardedStars > oldStars) localStorage.setItem(levelKey, awardedStars.toString()); } totalGold += reward; saveProgress(awardedStars); checkAchievements({ completedLevel: true, completedDaily: isDaily && reward > 0, awardedStars: awardedStars, goldEarned: reward }); if (typeof gvPost === 'function') gvPost('level_complete', { level: currentLevelIndex + 1, stars: awardedStars, set: currentLevelSetName }); if (typeof GameVoltTracker !== 'undefined') GameVoltTracker.end({ level: currentLevelIndex + 1, outcome: 'level_complete' }); playSound('win'); try { if (effects) effects.triggerVictory(pieces); } catch(e) {} setTimeout(() => { if (ui && typeof ui.showWinScreen === 'function') {
        const titleText = "LEVEL COMPLETE";
        const btnText = "NEXT LEVEL";
        ui.showWinScreen(awardedStars, reward, () => { totalGold += reward; saveProgress(); playSound('purchase'); }, titleText, btnText, null, (name) => playSound(name), streakBonus); } else { gameState = "MAP"; } }, 1500); });
  canvas.addEventListener('pointerdown', (e) => { const pos = getEventPos(e); if (gameState === "CREDITS") { const btn = window._creditsBackBtn; if (btn && pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) { playSound('menu_back'); hideCredits(); } return; } if (gameState === "MENU") { playSound('click'); handleMenuClick(pos.x, pos.y); } else if (gameState === "MAP") { worldMap.handleInput('down', pos.x, pos.y); } else if (gameState === "SHOP") { shop.handleInput('down', pos.x, pos.y); } else if (gameState === "ACHIEVEMENTS") { if (achievements.checkBackButton(pos.x, pos.y)) { playSound('menu_back'); gameState = "MENU"; return; } achievements.handleInput('down', pos.x, pos.y); } else if (gameState === "PLAYING" || gameState === "TIME_ATTACK") { const hudAction = hud.checkHit(pos.x, pos.y); if (hudAction === 'menu') { playSound('click'); saveProgress(); if (typeof GameVoltTracker !== 'undefined') GameVoltTracker.end({ outcome: 'quit' }); if (gameState === "TIME_ATTACK") { if (audio) audio.stopMusic(); gameState = "MENU"; return; } if (zenMode || currentLevelSetName === 'LEVELS_DAILY') { zenMode = false; if (audio) audio.stopMusic(); gameState = "MENU"; } else { gameState = "MAP"; } return; } if (hudAction === 'hint') { tryUseHint(); return; } } });
  canvas.addEventListener('pointermove', (e) => { const pos = getEventPos(e); if (gameState === "MAP") worldMap.handleInput('move', pos.x, pos.y); if (gameState === "SHOP") shop.handleInput('move', pos.x, pos.y); if (gameState === "ACHIEVEMENTS") achievements.handleInput('move', pos.x, pos.y); });
  canvas.addEventListener('pointerup', (e) => { const pos = getEventPos(e); if (gameState === "MAP") worldMap.handleInput('up', pos.x, pos.y); if (gameState === "SHOP") shop.handleInput('up', pos.x, pos.y); if (gameState === "ACHIEVEMENTS") achievements.handleInput('up', pos.x, pos.y); });
  canvas.addEventListener('wheel', (e) => { if (gameState === "MAP") { e.preventDefault(); worldMap.handleScroll(e.deltaY); } if (gameState === "SHOP") { e.preventDefault(); shop.handleWheel(e.deltaY); } if (gameState === "ACHIEVEMENTS") { e.preventDefault(); achievements.handleWheel(e.deltaY); } }, { passive: false });
  layout.resize(); if (!loadProgress()) { currentLevelSetName = 'LEVELS_EASY'; currentLevelIndex = 0; } if (effects && activeItems.trail) effects.setTrailType(activeItems.trail); if (grid && activeItems.glow) grid.setGlow(activeItems.glow);
}

window.checkWin = function() { const allPlaced = pieces.every(p => !p.inTray && p.isPlaced); if (!allPlaced) return; if (bitfield.isSolved(pieces)) { input.activePiece = null; input.locked = true; if (gameState === "TIME_ATTACK") { const reward = timeAttack.onSolve(); if (effects) { effects.triggerVictory(pieces); const _dpr = window.devicePixelRatio || 1; const cx = canvas.width / _dpr / 2; const cy = canvas.height / _dpr / 2; effects.spawnFloatingText(cx, cy - 100, `+${reward.addedTime}s`, "#4CAF50", "large"); if (reward.combo >= 2) { effects.spawnFloatingText(cx, cy - 155, `COMBO x${reward.combo}`, "#FF9800"); } } setTimeout(() => { transitionToLevel(() => { input.locked = false; const next = timeAttack.getNextLevel(); currentLevelSetName = next.set; loadLevel(next.index); timeAttack.markLevelStart(); playSound('equip'); }); }, 300); return; } window.dispatchEvent(new Event('level-complete')); } }
function tryUseHint() { 
    if (activeHint) {
        // Hint redan aktiv - ge feedback
        playSound('invalid');
        if (effects) effects.spawnFloatingText(canvas.width / (window.devicePixelRatio || 1) / 2, 150, "HINT ACTIVE", "#FFA500");
        return; 
    }
    const hintCost = 150; 
    if (ownedHints > 0) {
        if (generateHint()) {
            ownedHints--;
            playSound('hint');
            saveProgress();
            checkAchievements({ usedHint: true });
        } else {
            // Alla bitar redan rätt
            playSound('invalid');
            if (effects) effects.spawnFloatingText(canvas.width / (window.devicePixelRatio || 1) / 2, 150, "NO HINT NEEDED", "#4CAF50");
        }
        return; 
    } 
    if (totalGold >= hintCost) { 
        if (generateHint()) { 
            totalGold -= hintCost; 
            playSound('hint'); 
            saveProgress(); 
        } else {
            playSound('invalid');
            if (effects) effects.spawnFloatingText(canvas.width / (window.devicePixelRatio || 1) / 2, 150, "NO HINT NEEDED", "#4CAF50");
        }
    } else {
        // Inte råd - visa tydligt!
        playSound('invalid');
        if (effects) effects.spawnFloatingText(canvas.width / (window.devicePixelRatio || 1) / 2, 150, `NEED ${hintCost} GOLD`, "#FF4444");
    }
}

function generateHint() { 
    const levelData = currentLevelSet[currentLevelIndex]; 
    if (!levelData || !levelData.solution) return false; 
    
    const pendingSolutions = []; 
    
    // Gå igenom alla lösningar och hitta de som INTE är lösta
    for (const sol of levelData.solution) {
        // Rekonstruera formen exakt som editorn gör det — ingen normalisering
        const baseShape = SHAPES[sol.key];
        if (!baseShape) continue;
        let s = baseShape.map(c => [...c]);
        if (sol.flipped) s = s.map(([x,y]) => [-x, y]);
        for (let i = 0; i < sol.rotation; i++) s = s.map(([x,y]) => [-y, x]);

        // Editorn sparar col/row som rå position, formen är onormaliserad
        const targetCol = sol.col;
        const targetRow = sol.row;

        // Kolla om någon bit med rätt shapeKey är korrekt placerad på denna position
        const isAlreadySolved = pieces.some(p => {
            if (p.shapeKey !== sol.key) return false;
            if (!p.isPlaced) return false;

            const pieceCells = p.shape.map(([c, r]) => [p.col + c, p.row + r]);
            const solutionCells = s.map(([c, r]) => [targetCol + c, targetRow + r]);

            const sortCells = (cells) => [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
            const pSorted = sortCells(pieceCells);
            const sSorted = sortCells(solutionCells);

            if (pSorted.length !== sSorted.length) return false;
            return pSorted.every((cell, i) => cell[0] === sSorted[i][0] && cell[1] === sSorted[i][1]);
        });

        if (!isAlreadySolved) {
            // Normalisera formen för rendering (hint-markören behöver 0-baserade koordinater)
            let minC = Infinity, minR = Infinity;
            s.forEach(([c, r]) => { if (c < minC) minC = c; if (r < minR) minR = r; });
            const normalizedShape = s.map(([c, r]) => [c - minC, r - minR]);

            pendingSolutions.push({
                ...sol,
                targetCol: targetCol + minC,
                targetRow: targetRow + minR,
                shape: normalizedShape
            });
        }
    } 
    
    if (pendingSolutions.length === 0) return false; 
    
    // Välj första olösta lösningen
    const sol = pendingSolutions[0]; 
    
    // Hitta en bit som kan användas för denna hint
    // 1. Först: Kolla om det finns en OPLACERAD bit med rätt shapeKey
    // 2. Annars: Hitta en bit som är FELPLACERAD (finns i pendingSolutions)
    let pieceToHint = pieces.find(p => p.shapeKey === sol.key && !p.isPlaced);
    
    if (!pieceToHint) {
        // Alla bitar med denna shape är placerade - hitta en som är FELPLACERAD
        pieceToHint = pieces.find(p => {
            if (p.shapeKey !== sol.key) return false;
            if (!p.isPlaced) return false;
            
            // Kolla om denna bit är på rätt ställe redan
            const pieceCells = p.shape.map(([c, r]) => [p.col + c, p.row + r]);
            const solutionCells = sol.shape.map(([c, r]) => [sol.targetCol + c, sol.targetRow + r]);
            
            const sortCells = (cells) => [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
            const pSorted = sortCells(pieceCells);
            const sSorted = sortCells(solutionCells);
            
            if (pSorted.length !== sSorted.length) return true; // Fel!
            // Om den INTE matchar, är den felplacerad och kan hintas
            return !pSorted.every((cell, i) => cell[0] === sSorted[i][0] && cell[1] === sSorted[i][1]);
        });
    }
    
    if (pieceToHint) { 
        // Cleara eventuell gammal timeout
        if (hintTimeoutId) {
            clearTimeout(hintTimeoutId);
        }
        
        activeHint = { 
            key: sol.key, 
            col: sol.targetCol, 
            row: sol.targetRow, 
            shape: sol.shape 
        }; 
        
        hintTimeoutId = setTimeout(() => { 
            activeHint = null; 
            hintTimeoutId = null;
        }, 10000); 
        
        return true; 
    } 
    return false; 
}

function getShapeMetrics(key, rotation, flipped) { 
    const baseShape = SHAPES[key]; 
    if (!baseShape) return { shape: [], offsetX: 0, offsetY: 0 }; 
    let s = baseShape.map(c => [...c]);
    if (flipped) s = s.map(([x,y]) => [-x, y]);
    for(let i=0; i<rotation; i++) s = s.map(([x,y]) => [-y, x]); 
    let minC = Infinity, minR = Infinity; 
    s.forEach(c => { if(c[0] < minC) minC = c[0]; if(c[1] < minR) minR = c[1]; }); 
    const normalizedShape = s.map(c => [c[0] - minC, c[1] - minR]); 
    return { shape: normalizedShape, offsetX: minC, offsetY: minR }; 
}

function handleShopPurchase(item, action) {
    // Watch ad för gratis guld
    if (action === 'watch_ad') {
        const reward = item.reward || 100;
        totalGold += reward;
        playSound('purchase');
        shop.updateInventory(ownedItems, activeItems, ownedHints);
        saveProgress();
        checkAchievements({ goldEarned: reward });
        return;
    }
    
    // Skin Lootbox
    if (action === 'lootbox_skin') {
        if (totalGold < item.price) {
            return { success: false };
        }
        const unownedSkins = Object.keys(SKINS).filter(id => id !== 'skin_default' && !ownedItems.includes(id));
        if (unownedSkins.length === 0) {
            return { success: false };
        }
        const randomId = unownedSkins[Math.floor(Math.random() * unownedSkins.length)];
        totalGold -= item.price;
        ownedItems.push(randomId);
        playSound('purchase');
        shop.updateInventory(ownedItems, activeItems, ownedHints);
        saveProgress();
        checkAchievements({ boughtCosmetic: true, goldSpent: item.price });
        return { success: true, itemId: randomId };
    }

    // Trail Lootbox
    if (action === 'lootbox_trail') {
        if (totalGold < item.price) {
            return { success: false };
        }
        const unownedTrails = Object.keys(TRAILS).filter(id => id !== 'trail_default' && !ownedItems.includes(id));
        if (unownedTrails.length === 0) {
            return { success: false };
        }
        const randomId = unownedTrails[Math.floor(Math.random() * unownedTrails.length)];
        totalGold -= item.price;
        ownedItems.push(randomId);
        playSound('purchase');
        shop.updateInventory(ownedItems, activeItems, ownedHints);
        saveProgress();
        checkAchievements({ boughtCosmetic: true, goldSpent: item.price });
        return { success: true, itemId: randomId };
    }
    
    // Equip
    if (action === 'equip') {
        playSound('equip');
        const equippedTrail = item.type === 'trail' && item.id !== 'trail_default';
        const equippedTheme = item.type === 'world' && item.id !== 'default';
        if (item.type === 'trail') { activeItems.trail = item.id; effects.setTrailType(item.id); }
        if (item.type === 'skin') activeItems.skin = item.id;
        if (item.type === 'glow') { activeItems.glow = item.id; grid.setGlow(item.id); }
        if (item.type === 'world') {
            activeItems.world = item.id;
            if (item.id === 'default') {
                // Default = följ världen, sätt inte specifik bakgrund här
                // loadLevel() hanterar detta
            } else if (WORLDS[item.id] && WORLDS[item.id].src) {
                setBgImage(WORLDS[item.id].src);
            } else if (SYSTEM_IMAGES[item.id] && SYSTEM_IMAGES[item.id].src) {
                setBgImage(SYSTEM_IMAGES[item.id].src);
            }
        }
        shop.updateInventory(ownedItems, activeItems, ownedHints);
        saveProgress();
        checkAchievements({ equippedTrail: equippedTrail, equippedTheme: equippedTheme });
        return;
    }

    // Köp
    if (action === 'buy') {
        if (totalGold >= item.price) {
            totalGold -= item.price;
            playSound('purchase');
            const isCosmetic = item.id !== 'hint' && item.type !== 'consumable';
            if (item.id === 'hint') ownedHints++;
            else if (item.type !== 'consumable') ownedItems.push(item.id);
            shop.updateInventory(ownedItems, activeItems, ownedHints);
            saveProgress();
            checkAchievements({ boughtCosmetic: isCosmetic, goldSpent: item.price });
            return { success: true };
        }
        return { success: false };
    }
}
function handleMenuClick(clickX, clickY) { const { x, startY, w: btnW, h: btnH, gap } = menuBtnLayout; MENU_BUTTONS.forEach((btn, index) => { const y = startY + index * (btnH + gap); if (clickX >= x && clickX <= x + btnW && clickY >= y && clickY <= y + btnH) { if (btn.text === "CAMPAIGN") { if (!hasSeenTutorial) { startGame('LEVELS_EASY', 0); } else { gameState = "MAP"; } } else if (btn.name === 'DAILY') { const dailyIndex = dailySystem.getTodayIndex(); startGame('LEVELS_DAILY', dailyIndex); } else if (btn.name === 'MODE_TIME') { timeAttack.start(); const next = timeAttack.getNextLevel(); gameState = "TIME_ATTACK"; startGame(next.set, next.index); timeAttack.markLevelStart(); if (audio) audio.playMusic('music_time_attack'); checkAchievements({ playedTimeAttack: true }); } else if (btn.name === 'MODE_ZEN') { startZenMode(); } else if (btn.name === 'SHOP') { shopReturnState = "MENU"; gameState = "SHOP"; shop.updateInventory(ownedItems, activeItems, ownedHints); checkAchievements({ visitedShop: true }); } else if (btn.name === 'ACHIEVEMENTS') { gameState = "ACHIEVEMENTS"; achievements.resetScroll(); } } }); }

// --- ZEN MODE ---
let zenMode = false;
let zenLevelPool = []; // Pool av alla banor att slumpa från

function buildZenLevelPool() {
    zenLevelPool = [];
    const levelSets = ['LEVELS_EASY', 'LEVELS_MEDIUM', 'LEVELS_HARD', 'LEVELS_ARCANE'];
    levelSets.forEach(setName => {
        const levels = ALL_LEVEL_SETS[setName];
        if (levels) {
            levels.forEach((level, idx) => {
                // Skippa tutorial-nivåer
                if (level.id && level.id.includes('tutorial')) return;
                zenLevelPool.push({ setName, index: idx, level });
            });
        }
    });
}

function getRandomZenLevel() {
    if (zenLevelPool.length === 0) buildZenLevelPool();
    const randomIdx = Math.floor(Math.random() * zenLevelPool.length);
    return zenLevelPool[randomIdx];
}

function startZenMode() {
    zenMode = true;
    
    // Kolla om tutorial behövs (om inte sett i campaign heller)
    if (!hasSeenTutorial) {
        // Visa tutorial först
        currentLevelSetName = 'LEVELS_EASY';
        currentLevelSet = ALL_LEVEL_SETS[currentLevelSetName];
        currentLevelIndex = 0;
    } else {
        // Slumpa en bana
        buildZenLevelPool();
        const randomLevel = getRandomZenLevel();
        currentLevelSetName = randomLevel.setName;
        currentLevelSet = ALL_LEVEL_SETS[currentLevelSetName];
        currentLevelIndex = randomLevel.index;
    }
    
    gameState = "PLAYING";
    timeElapsed = 0;
    clearActiveHint();
    loadLevel(currentLevelIndex);
}

function nextZenLevel() {
    // Slumpa nästa bana
    const randomLevel = getRandomZenLevel();
    currentLevelSetName = randomLevel.setName;
    currentLevelSet = ALL_LEVEL_SETS[currentLevelSetName];
    currentLevelIndex = randomLevel.index;
    
    timeElapsed = 0;
    clearActiveHint();
    loadLevel(currentLevelIndex);
}

// --- CREDITS OVERLAY ---
let showingCredits = false;
function showCredits() {
    showingCredits = true;
    gameState = "CREDITS";
}
function hideCredits() {
    showingCredits = false;
    gameState = "MENU";
}
function drawCredits() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Mörk bakgrund
    ctx.fillStyle = "rgba(5, 5, 12, 0.95)";
    ctx.fillRect(0, 0, w, h);

    // Titel
    ctx.save();
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#FFD700";
    ctx.font = `900 ${Math.min(w * 0.1, 70)}px 'Cinzel', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CREDITS", w / 2, h * 0.15);
    ctx.restore();

    // Credits text
    const credits = [
        { label: "DEVELOPED BY", value: "SmarProc Games" },
        { label: "GAME DESIGN", value: "SmarProc Games" },
        { label: "PROGRAMMING", value: "SmarProc Games" },
        { label: "ART & GRAPHICS", value: "SmarProc Games" },
        { label: "SOUND DESIGN", value: "SmarProc Games" },
        { label: "", value: "" },
        { label: "SPECIAL THANKS", value: "All our players!" },
        { label: "", value: "" },
        { label: "VERSION", value: "1.0.0" }
    ];

    const lineHeight = 50;
    const startY = h * 0.30;

    credits.forEach((line, i) => {
        const y = startY + i * lineHeight;

        if (line.label) {
            ctx.fillStyle = "#888";
            ctx.font = `600 18px 'Cinzel', serif`;
            ctx.textAlign = "center";
            ctx.fillText(line.label, w / 2, y);
        }

        if (line.value) {
            ctx.fillStyle = "#FFF";
            ctx.font = `700 24px 'Cinzel', serif`;
            ctx.textAlign = "center";
            ctx.fillText(line.value, w / 2, y + 25);
        }
    });

    // Tillbaka-knapp
    const btnW = 200;
    const btnH = 60;
    const btnX = (w - btnW) / 2;
    const btnY = h * 0.85;

    ctx.fillStyle = "#333";
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 3;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = "#FFF";
    ctx.font = `700 22px 'Cinzel', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BACK", w / 2, btnY + btnH / 2);

    // Spara knappens position för klickdetektering
    window._creditsBackBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
}
function startLevelFromMap(globalIndex) { let setName = 'LEVELS_EASY'; let localIndex = 0; if (globalIndex < 25) { setName = 'LEVELS_EASY'; localIndex = globalIndex; } else if (globalIndex < 50) { setName = 'LEVELS_MEDIUM'; localIndex = globalIndex - 25; } else if (globalIndex < 75) { setName = 'LEVELS_HARD'; localIndex = globalIndex - 50; } else { setName = 'LEVELS_ARCANE'; localIndex = globalIndex - 75; } if (ALL_LEVEL_SETS[setName] && ALL_LEVEL_SETS[setName][localIndex]) { startGame(setName, localIndex); } }
function startGame(levelSetName, levelIndex) { currentLevelSetName = levelSetName; currentLevelSet = ALL_LEVEL_SETS[levelSetName]; currentLevelIndex = levelIndex; if (gameState !== "TIME_ATTACK") gameState = "PLAYING"; timeElapsed = 0; clearActiveHint(); saveProgress(); loadLevel(currentLevelIndex); }
function goToMenu() { zenMode = false; gameState = "MENU"; pieces.length = 0; if (hud) { hud.levelStars = 0; hud.currency = totalGold; hud.ownedHints = ownedHints; } playSound('click'); if (typeof GameVoltTracker !== 'undefined') GameVoltTracker.end({ outcome: 'quit' }); }

function loadLevel(index) { 
    currentLevelSet = ALL_LEVEL_SETS[currentLevelSetName]; 
    if (index >= currentLevelSet.length) { gameState = "MAP"; return; } 
    const levelData = currentLevelSet[index]; bitfield.loadLevelMap(levelData.map); pieces = []; clearActiveHint(); if (input) input.locked = false;
    
    // --- BAKGRUNDSLOGIK ---
    // Steg 1: Bestäm världens standard-bakgrund och partikeleffekt
    let worldDefaultBg = SYSTEM_IMAGES['bg_temple'].src;
    let targetAudio = 'ambience_jungle';
    let targetParticles = 'spores'; // DEFAULT partikeleffekt
    
    // TIME ATTACK: Fast bakgrund oavsett vilken värld nivån kommer från
    if (gameState === "TIME_ATTACK") {
        worldDefaultBg = SYSTEM_IMAGES['bg_time'].src;
        targetParticles = 'volcano';
    }
    // ZEN MODE: Fast lugn zen-bakgrund och zen-musik
    else if (zenMode) {
        worldDefaultBg = SYSTEM_IMAGES['bg_zen'].src;
        targetAudio = 'ambience_zen';
        targetParticles = 'spores';
    } else if (currentLevelSetName === 'LEVELS_EASY') { 
        worldDefaultBg = SYSTEM_IMAGES['bg_temple'].src; 
        targetAudio = 'ambience_jungle'; 
        targetParticles = 'spores';
    } else if (currentLevelSetName === 'LEVELS_MEDIUM') { 
        worldDefaultBg = SYSTEM_IMAGES['bg_ice'].src; 
        targetAudio = 'ambience_ice'; 
        targetParticles = 'snow';
    } else if (currentLevelSetName === 'LEVELS_HARD') { 
        worldDefaultBg = SYSTEM_IMAGES['bg_lava'].src; 
        targetAudio = 'ambience_lava'; 
        targetParticles = 'volcano';
    } else if (currentLevelSetName === 'LEVELS_ARCANE') { 
        worldDefaultBg = SYSTEM_IMAGES['bg_cyber'].src; 
        targetAudio = 'ambience_cyber'; 
        targetParticles = 'rain';
    } else if (currentLevelSetName === 'LEVELS_DAILY') { 
        worldDefaultBg = SYSTEM_IMAGES['bg_cyber'].src; 
        targetAudio = 'ambience_cyber'; 
        targetParticles = 'rain';
    }
    
    // Steg 2: Kolla om spelaren har en KÖPT bakgrund equipped
    let targetBgSrc = worldDefaultBg; // Default = följ världen
    
    if (activeItems.world && activeItems.world !== 'default') {
        // Spelaren har köpt och equipped en bakgrund - använd den överallt
        if (WORLDS[activeItems.world] && WORLDS[activeItems.world].src) {
            targetBgSrc = WORLDS[activeItems.world].src;
        }
    }
    
    // Steg 3: Aktivera partikeleffekt
    if (dynamicBg) {
        dynamicBg.setEffect(targetParticles);
    }
    
    setBgImage(targetBgSrc); 
    // Byt INTE musik om vi är i Time Attack - behåll music_time_attack
    if (audio && gameState !== "TIME_ATTACK") audio.playMusic(targetAudio);
    if (hud) { const levelKey = `${currentLevelSetName}_${index}`; const savedStars = parseInt(localStorage.getItem(levelKey) || 0); hud.levelStars = savedStars; }
    
    // --- LOAD PIECES ---
    let piecesToLoad = levelData.pieces;
    tray.setSlotCount(piecesToLoad.length); 
    tray.resize(); 
    piecesToLoad.forEach((shapeKey, index) => { 
        const p = new Piece(grid, shapeKey, activeItems.skin, activeItems.glow); 
        p.trayIndex = index; // VIKTIGT: Spara permanent tray-position
        // Tutorial rotation (endast visuell hjälp)
        if (levelData.id === 'tutorial_step_by_step') {
            if (shapeKey === '3') p.rotate(); 
            if (shapeKey === '4') p.rotate(); 
        }
        pieces.push(p); 
    });
    resetPiecesPosition(); 
    input.pieces = pieces; 
}

// --- FIX: CENTRERING MED NEGATIVA KOORDINATER ---
function resetPiecesPosition() { 
    pieces.forEach((p) => { 
        if (p.inTray) { 
            // Använd trayIndex för rätt slot
            const index = (typeof p.trayIndex !== 'undefined') ? p.trayIndex : pieces.indexOf(p);
            const slot = tray.getSlotPosition(index); 
            const slotCenterX = slot.x + slot.size / 2; 
            const slotCenterY = slot.y + slot.size / 2; 
            
            // Beräkna metrics vid full skala först
            p.scale = 1.0;
            p.updateMetrics();
            
            // Beräkna skala dynamiskt så biten passar i sloten
            const fullPitch = grid.pitch;
            const fullW = p.widthCells * fullPitch;
            const fullH = p.heightCells * fullPitch;
            const maxDim = Math.max(fullW, fullH);
            
            // Lämna 15% marginal i sloten
            const targetSize = slot.size * 0.85;
            const scale = Math.min(targetSize / maxDim, 0.7);
            
            p.scale = scale;
            p.targetScale = scale;
            p.updateMetrics(); 
            
            const pitch = grid.pitch * scale;
            const bboxW = p.widthCells * pitch;
            const bboxH = p.heightCells * pitch;
            
            // Ta hänsyn till minC/minR offset
            const offsetX = p.minC * pitch;
            const offsetY = p.minR * pitch;

            const tx = slotCenterX - (bboxW / 2) - offsetX; 
            const ty = slotCenterY - (bboxH / 2) - offsetY; 
            
            p.x = tx; p.y = ty;
            p.targetX = tx; p.targetY = ty; 
            p.visualX = tx; p.visualY = ty; 
            p.inTray = true;
            p.isPlaced = false;
        } 
    }); 
}

function init() { if (!ctx) return; initSystems(); requestAnimationFrame(loop); }
function loop(timestamp) {
    loopRunning = true;
    if (!lastTime) lastTime = timestamp; const dt = (timestamp - lastTime) / 1000; lastTime = timestamp;
    
    // Kolla om aktiv hint är uppfylld
    if (activeHint && pieces) { 
        const isSatisfied = pieces.some(p => {
            if (p.shapeKey !== activeHint.key) return false;
            if (!p.isPlaced) return false;
            
            // Jämför bitens celler mot hintens celler
            const pieceCells = p.shape.map(([c, r]) => [p.col + c, p.row + r]);
            const hintCells = activeHint.shape.map(([c, r]) => [activeHint.col + c, activeHint.row + r]);
            
            if (pieceCells.length !== hintCells.length) return false;
            
            // Sortera och jämför
            const sortCells = (cells) => cells.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
            const pSorted = sortCells([...pieceCells]);
            const hSorted = sortCells([...hintCells]);
            
            return pSorted.every((cell, i) => cell[0] === hSorted[i][0] && cell[1] === hSorted[i][1]);
        }); 
        
        if (isSatisfied) {
            clearActiveHint();
        }
    }
    
    if (gameState === "PLAYING") { timeElapsed += dt; if (hud) { hud.isTimeAttack = false; hud.time = zenMode ? null : timeElapsed; hud.currentLevelName = zenMode ? "ZEN" : (currentLevelSetName === 'LEVELS_DAILY') ? "DAILY CHALLENGE" : `LEVEL ${currentLevelIndex + 1}`; hud.currency = totalGold; hud.ownedHints = ownedHints; hud.currentScore = 0; const levelKey = `${currentLevelSetName}_${currentLevelIndex}`; hud.earnedStars = parseInt(localStorage.getItem(levelKey) || 0); } } 
    else if (gameState === "TIME_ATTACK") { const status = timeAttack.update(dt); if (status === "GAME_OVER") { handleTimeAttackGameOver(); loopRunning = false; return; } if (hud) { hud.isTimeAttack = true; hud.time = timeAttack.timeLeft; hud.currentScore = timeAttack.score; hud.currency = totalGold; const currentHigh = parseInt(localStorage.getItem('goldenGlyphsHighScore') || 0); if (timeAttack.score > currentHigh) { hud.highScore = timeAttack.score; localStorage.setItem('goldenGlyphsHighScore', timeAttack.score); } else { hud.highScore = currentHigh; } } }
    ctx.save(); 
    let shakeX = 0; let shakeY = 0; if (effects) { const shake = effects.getShakeOffset(); shakeX = shake.x; shakeY = shake.y; } ctx.translate(shakeX, shakeY);
    drawBackground(); 
    
    // Rita bakgrundspartiklar ENDAST om spelaren har DEFAULT bakgrund
    // (Sporer/snö/aska/regn passar inte på köpta bakgrunder som BLUEPRINT etc.)
    const showBgParticles = (activeItems.world === 'default') && (gameState === "PLAYING" || gameState === "TIME_ATTACK");
    if (dynamicBg && showBgParticles) {
        dynamicBg.update(dt);
        dynamicBg.draw();
    }
    
    if (gameState === "MENU") { drawMenu(); } else if (gameState === "CREDITS") { drawCredits(); } else if (gameState === "MAP") { worldMap.update(dt); worldMap.draw(); } else if (gameState === "SHOP") { worldMap.draw(); shop.draw(ctx, totalGold); } else if (gameState === "ACHIEVEMENTS") { achievements.draw(ctx); } 
    else { 
        pieces.forEach(p => p.update(dt)); if (effects) effects.update(dt); grid.draw(ctx); 
        
        // Tutorial System - aktiveras på Level 1 (LEVELS_EASY index 0)
        const levelData = currentLevelSet[currentLevelIndex];
        const isTutorialLevel = currentLevelSetName === 'LEVELS_EASY' && currentLevelIndex === 0 && !hasSeenTutorial;
        let tutorialHint = null;
        
        if (isTutorialLevel && levelData?.solution) { 
            tutorial.init(pieces, levelData.solution);
            tutorial.update(dt);
            tutorialHint = tutorial.getHintForNextPiece();
        } else { 
            tutorial.hide(); 
        }
        
        // Rita hint (tutorial eller vanlig)
        if (tutorialHint) {
            grid.drawActiveHint(tutorialHint, tutorialHint.shape);
        } else if (activeHint) {
            grid.drawActiveHint(activeHint, activeHint.shape);
        }
        
        bitfield.draw(ctx); tray.draw(); pieces.forEach(p => { if (!p.dragging) p.draw(ctx); }); const draggingPiece = pieces.find(p => p.dragging); if (draggingPiece) draggingPiece.draw(ctx); if (effects) effects.draw(ctx); if (hud) hud.draw(ctx); 
        
        // Rita tutorial-text (ROTATE/FLIP)
        if (tutorialHint) {
            tutorial.draw();
        } 
    } 
    ctx.restore();
    // Transition overlay
    if (transitionDir !== 0) {
        const speed = dt * 4; // ~250ms per fas
        transitionAlpha += transitionDir * speed;
        if (transitionDir === 1 && transitionAlpha >= 1) {
            transitionAlpha = 1;
            if (transitionCallback) { transitionCallback(); transitionCallback = null; }
            transitionDir = -1; // fade in
        } else if (transitionDir === -1 && transitionAlpha <= 0) {
            transitionAlpha = 0;
            transitionDir = 0;
        }
        if (transitionAlpha > 0) {
            const dpr = window.devicePixelRatio || 1;
            ctx.fillStyle = `rgba(0,0,0,${Math.min(1, transitionAlpha)})`;
            ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        }
    }
    if (achievements) { achievements.updateNotification(dt); achievements.drawNotification(ctx); } requestAnimationFrame(loop);
}
function handleTimeAttackGameOver() { 
    playSound('invalid'); 
    
    // Hämta och uppdatera leaderboard
    let highScores = JSON.parse(localStorage.getItem('goldenGlyphsLeaderboard') || "[]"); 
    const previousHighScore = highScores.length > 0 ? highScores[0] : 0;
    const isNewHighScore = timeAttack.score > previousHighScore;
    
    highScores.push(timeAttack.score); 
    highScores.sort((a, b) => b - a); 
    highScores = highScores.slice(0, 5); 
    localStorage.setItem('goldenGlyphsLeaderboard', JSON.stringify(highScores)); 
    
    // Beräkna guld
    const goldEarned = Math.floor(timeAttack.score / 10);
    totalGold += goldEarned;
    saveProgress();
    checkAchievements({ goldEarned: goldEarned, timeAttackScore: timeAttack.score });
    
    // PB-stats
    const tier = timeAttack.getTier();
    const solved = timeAttack.solvedCount;
    const maxCombo = timeAttack.maxCombo;
    const { pb, isNewBest } = timeAttack.savePB();

    // SDK leaderboard + postMessage
    if (window.GameVolt) GameVolt.leaderboard.submit(timeAttack.score, { mode: 'time-attack' });
    if (typeof gvPost === 'function') gvPost('game_over', { score: timeAttack.score, mode: 'time-attack' });
    if (isNewBest && typeof gvPost === 'function') gvPost('high_score', { score: timeAttack.score, mode: 'time-attack' });
    if (typeof GameVoltTracker !== 'undefined') GameVoltTracker.end({ score: timeAttack.score, outcome: 'game_over' });

    // Stoppa Time Attack-musiken
    if (audio) audio.stopMusic();

    // Visa Game Over med leaderboard + PB
    ui.showTimeAttackGameOver(timeAttack.score, goldEarned, highScores, isNewHighScore, () => {
        gameState = "MENU";
        if (!loopRunning) { lastTime = performance.now(); requestAnimationFrame(loop); }
    }, { tier, solved, pb, maxCombo });
}
function drawMenu() {
    const time = Date.now() / 1000;
    const dpr = window.devicePixelRatio || 1;
    const isMobile = window.innerWidth < 700;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Rita menybakgrund
    if (menuBgLoaded) {
        const imgRatio = menuBgImage.width / menuBgImage.height;
        const screenRatio = w / h;
        let renderW, renderH, offsetX, offsetY;
        if (screenRatio > imgRatio) {
            renderW = w;
            renderH = w / imgRatio;
            offsetX = 0;
            offsetY = (h - renderH) / 2;
        } else {
            renderH = h;
            renderW = h * imgRatio;
            offsetX = (w - renderW) / 2;
            offsetY = 0;
        }
        ctx.drawImage(menuBgImage, offsetX, offsetY, renderW, renderH);
    }

    // Mörkare overlay för läsbarhet
    ctx.fillStyle = "rgba(5, 5, 15, 0.55)";
    ctx.fillRect(0, 0, w, h);

    // Titel
    let titleSize = Math.min(w * 0.12, isMobile ? 35 : 80);
    ctx.save();
    const floatY = Math.sin(time * 0.8) * 4;
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#FFD700";
    ctx.font = `900 ${titleSize}px 'Cinzel', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GOLDEN GLYPHS", w / 2, (h * 0.15) + floatY);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Knappar - Glasstil
    let btnW = isMobile ? w * 0.88 : Math.min(400, w * 0.7);
    const logicalHeight = isMobile ? 65 : 70;
    const btnH = logicalHeight;
    const gap = 12;
    const totalMenuH = MENU_BUTTONS.length * (btnH + gap) - gap;
    const startY = (h * 0.52) - (totalMenuH / 2);
    const x = (w - btnW) / 2;
    const cornerRadius = 12;
    menuBtnLayout = { x, startY, w: btnW, h: btnH, gap }; 
    
    MENU_BUTTONS.forEach((btn, index) => { 
        const y = startY + index * (btnH + gap); 
        ctx.save(); 
        
        let buttonText = btn.text; 
        let accentColor = btn.color; 
        let isDisabled = false;
        let isCompleted = false;
        
        if (btn.name === 'DAILY') { 
            if (dailySystem && dailySystem.isCompleted()) { 
                buttonText = "✓ COMPLETED"; 
                accentColor = "#FFD700"; // Guld = trofé!
                isCompleted = true;
            } 
        } 
        
        // Skugga
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 5;
        
        // Färgad glas-bakgrund med gradient
        const btnGrad = ctx.createLinearGradient(x, y, x, y + btnH);
        const baseColor = accentColor;
        // Gör ljusare och mörkare varianter
        btnGrad.addColorStop(0, adjustBrightness(baseColor, 30));
        btnGrad.addColorStop(0.5, baseColor);
        btnGrad.addColorStop(1, adjustBrightness(baseColor, -30));
        
        ctx.fillStyle = btnGrad;
        ctx.beginPath();
        ctx.roundRect(x, y, btnW, btnH, cornerRadius);
        ctx.fill();
        
        // Reset skugga
        ctx.shadowBlur = 0; 
        ctx.shadowOffsetY = 0;
        
        // Glas-shine effekt (övre halvan)
        const shineGrad = ctx.createLinearGradient(x, y, x, y + btnH * 0.5);
        shineGrad.addColorStop(0, "rgba(255,255,255,0.35)");
        shineGrad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = shineGrad;
        ctx.beginPath();
        ctx.roundRect(x, y, btnW, btnH * 0.5, [cornerRadius, cornerRadius, 0, 0]);
        ctx.fill();
        
        // Border - ljus kant överst
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, btnW, btnH, cornerRadius);
        ctx.stroke();
        
        // "3D" underkant
        ctx.fillStyle = adjustBrightness(baseColor, -50);
        ctx.beginPath();
        ctx.roundRect(x, y + btnH - 4, btnW, 4, [0, 0, cornerRadius, cornerRadius]);
        ctx.fill();
        
        // Ikon
        const iconX = x + 35;
        ctx.font = `${btnH * 0.4}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#FFF";
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 4;
        ctx.fillText(isCompleted ? "🏆" : (btn.icon || ""), iconX, y + btnH/2);
        ctx.shadowBlur = 0;
        
        // Text med skugga för läsbarhet
        ctx.fillStyle = "#FFF";
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 4;
        ctx.font = `700 ${btnH * 0.32}px 'Cinzel', serif`;
        ctx.textAlign = "left";
        ctx.fillText(buttonText, x + 60, y + btnH/2 + 2);
        ctx.shadowBlur = 0;
        
        // Campaign: visa totala stjärnor
        if (btn.name === 'LEVELS_EASY') {
            const allStars = calculateTotalStars();
            ctx.font = `600 ${btnH * 0.22}px sans-serif`;
            ctx.fillStyle = "#FFD700";
            ctx.textAlign = "right";
            ctx.fillText(`⭐ ${allStars}`, x + btnW - 20, y + btnH/2 + 2);
        }

        // Achievements: visa progress
        if (btn.name === 'ACHIEVEMENTS' && achievements) {
            const count = achievements.getUnlockedCount();
            const total = achievements.getTotalCount();
            ctx.font = `600 ${btnH * 0.22}px sans-serif`;
            ctx.fillStyle = "#FFF";
            ctx.textAlign = "right";
            ctx.fillText(`${count}/${total}`, x + btnW - 20, y + btnH/2 + 2);
        }
        
        ctx.restore(); 
    }); 
    
    // Footer
    ctx.save(); 
    ctx.font = `600 18px 'Cinzel', serif`;
    ctx.fillStyle = "#555";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("SmarProc Games", w / 2, h - 30);
    ctx.font = `400 12px sans-serif`;
    ctx.fillStyle = "#444";
    ctx.fillText("v1.0.0", w / 2, h - 12); 
    ctx.restore(); 
}
window.onload = init; window.resetGame = function() { localStorage.clear(); window.location.reload(); }; window.cheat = function() { totalGold += 5000; ownedHints += 5; saveProgress(); console.log("💰 FUSK AKTIVERAT"); };
window.setStars = function(count) {
    // Sätter X stjärnor jämnt fördelat för att testa world locking
    // Användning: setStars(25) → låser upp Frozen Peaks
    let remaining = count;
    const sets = ['LEVELS_EASY', 'LEVELS_MEDIUM', 'LEVELS_HARD', 'LEVELS_ARCANE'];
    // Rensa först
    for (const set of sets) { for (let i = 0; i < 25; i++) localStorage.removeItem(`${set}_${i}`); }
    for (const set of sets) {
        for (let i = 0; i < 25 && remaining > 0; i++) {
            const stars = Math.min(3, remaining);
            localStorage.setItem(`${set}_${i}`, stars.toString());
            remaining -= stars;
        }
    }
    console.log(`⭐ Satt ${count} stjärnor. Total: ${calculateTotalStars()}. Ladda om kartan.`);
};