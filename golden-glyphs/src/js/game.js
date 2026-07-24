// src/js/game.js
import { Layout } from "./layout.js";
import { Grid } from "./grid.js?v=7";
import { Piece } from "./piece.js?v=7";
import { HUD } from "./hud.js?v=9";
import { Input } from "./input.js?v=7";
import { BitField } from "./bitfield.js?v=7";
import { Tray } from "./tray.js?v=8";
import { AudioManager } from "./audio.js";
import { UI } from "./ui.js?v=12";
import { Effects } from "./effects.js?v=7";
import { CONFIG, SHAPES, WORLDS, SYSTEM_IMAGES, SKINS, TRAILS, ACHIEVEMENTS } from "./config.js";
import { AchievementSystem } from "./achievements.js?v=4";
import { WorldMap } from "./worldmap.js?v=12";
import { Shop } from "./shop.js?v=13";
import { Tutorial } from "./tutorial.js?v=3";
import { DailySystem } from "./daily.js?v=4";
import { DynamicBackground } from "./dynamic_background.js";

import { LEVELS_EASY } from "./levels_easy.js";
import { LEVELS_MEDIUM } from "./levels_medium.js"; 
import { LEVELS_HARD } from "./levels_hard.js";
import { LEVELS_ARCANE } from "./levels_arcane.js";
import { LEVELS_DAILY } from "./levels_daily.js?v=3";
import { TimeAttack } from "./timeattack.js";
import { ads } from "./ads.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

let layout, grid, bitfield, tray, pieces = [], effects, audio, hud, input, ui, worldMap, shop, tutorial, dailySystem, timeAttack, dynamicBg, achievements;
let lastTime = 0; let timeElapsed = 0; let gameState = "MENU"; let currentLevelIndex = 0; let currentLevelSet = []; let currentLevelSetName = 'LEVELS_EASY'; let hasSeenTutorial = false; let totalGold = 0;

let gamePaused = false; // SDK pause menu state
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
let dailyHintsUsed = 0;
let dailyCloudChallenge = null;
let dailyBriefButtons = { back: null, play: null };
let accessibilitySettings = { textScale: 1, colorblind: false, reducedMotion: false };

function applyAccessibilitySettings() {
    window.GoldenGlyphsAccessibility = accessibilitySettings;
    document.documentElement.style.setProperty('--gg-text-scale', accessibilitySettings.textScale);
    const shell = document.getElementById('game-shell');
    if (shell) { shell.style.fontSize = `${16 * accessibilitySettings.textScale}px`; shell.dataset.reducedMotion = accessibilitySettings.reducedMotion ? 'true' : 'false'; }
    if (hud) hud.textScale = accessibilitySettings.textScale;
    if (effects && typeof effects.setReducedMotion === 'function') effects.setReducedMotion(accessibilitySettings.reducedMotion || (zenMode && zenSettings.reducedMotion));
}

function configureAccessibility() {
    try { accessibilitySettings = Object.assign(accessibilitySettings, JSON.parse(localStorage.getItem('goldenGlyphsAccessibility') || '{}')); } catch (e) {}
    const open = document.getElementById('accessibility-open');
    const overlay = document.getElementById('accessibility-settings');
    const save = document.getElementById('access-save');
    const cancel = document.getElementById('access-cancel');
    if (!open || !overlay || open.dataset.bound) { applyAccessibilitySettings(); return; }
    open.dataset.bound = 'true';
    const populate = () => { document.getElementById('access-text-scale').value = String(accessibilitySettings.textScale); document.getElementById('access-colorblind').checked = !!accessibilitySettings.colorblind; document.getElementById('access-reduced-motion').checked = !!accessibilitySettings.reducedMotion; };
    open.addEventListener('click', () => { populate(); overlay.classList.remove('hidden'); });
    cancel.addEventListener('click', () => overlay.classList.add('hidden'));
    save.addEventListener('click', () => {
        accessibilitySettings = { textScale: Number(document.getElementById('access-text-scale').value) || 1, colorblind: document.getElementById('access-colorblind').checked, reducedMotion: document.getElementById('access-reduced-motion').checked };
        localStorage.setItem('goldenGlyphsAccessibility', JSON.stringify(accessibilitySettings));
        applyAccessibilitySettings(); overlay.classList.add('hidden');
    });
    applyAccessibilitySettings();
}

function getDailySeed() { return dailySystem ? `daily-${dailySystem.getDateKey()}` : null; }

function prepareDailyLeaderboard() {
    dailyCloudChallenge = null;
    if (!window.GameVolt || !GameVolt.challenge || !GameVolt.auth || !GameVolt.auth.getUser || !GameVolt.auth.getUser()) return;
    const seed = getDailySeed();
    dailyCloudChallenge = GameVolt.challenge.create({ seed: seed, levelCount: 1, config: { mode: 'daily', levelIndex: dailySystem.getTodayIndex() } })
        .catch(() => null);
}

async function submitAndFetchDailyLeaderboard(summary) {
    if (!window.GameVolt || !GameVolt.challenge) return [];
    const seed = getDailySeed();
    try {
        const challenge = dailyCloudChallenge ? await dailyCloudChallenge : null;
        if (challenge && GameVolt.auth && GameVolt.auth.getUser && GameVolt.auth.getUser()) {
            const score = Math.max(1, 1000000 - Math.round(summary.time * 1000) - summary.hints * 10000);
            await GameVolt.challenge.submit(challenge.id, { score: score, timeMs: Math.round(summary.time * 1000), completedCount: 1, totalCount: 1, stats: { hints: summary.hints, stars: summary.stars, dailyId: seed } });
        }
        return await GameVolt.challenge.getDailyLeaderboard(seed, { limit: 10 });
    } catch (e) { return []; }
}

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
    { text: "CAMPAIGN", name: 'LEVELS_EASY', color: "#4CAF50", glyph: "C" },
    { text: "DAILY CHALLENGE", name: 'DAILY', color: "#E91E63", glyph: "D" },
    { text: "TIME ATTACK", name: 'MODE_TIME', color: "#FF5722", glyph: "T" },
    { text: "ZEN MODE", name: 'MODE_ZEN', color: "#00BCD4", glyph: "Z" },
    { text: "SHOP", name: 'SHOP', color: "#9C27B0", glyph: "S" },
    { text: "ACHIEVEMENTS", name: 'ACHIEVEMENTS', color: "#FFD700", glyph: "A" }
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
function drawMenuGlyph(x, y, radius, glyph, completed = false, accent = "#FFD700") {
    ctx.save();
    ctx.shadowColor = completed ? "#FFD700" : accent;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(2,5,10,.82)";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = completed ? "#FFD700" : accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = completed ? "#FFD700" : "#FFF";
    ctx.font = `900 ${radius * 1.05}px 'Cinzel', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(completed ? "✓" : glyph, x, y + 1);
    ctx.restore();
}
function getStars(time) { if (time < STAR_TIMES[3]) return 3; if (time < STAR_TIMES[2]) return 2; return 1; }
function getStarsForLevel(levelSetName, levelIndex) { const key = `${levelSetName}_${levelIndex}`; return parseInt(localStorage.getItem(key) || 0); }
function getBestTimeForGlobalIndex(globalIndex) { let setName = CAMPAIGN_SET_NAMES[Math.floor(globalIndex / 25)] || 'LEVELS_EASY'; let localIndex = globalIndex % 25; return finiteNumber(localStorage.getItem(`${setName}_${localIndex}_bestTime`)); }
export function getStarsForGlobalIndex(globalIndex) { let setName = 'LEVELS_EASY'; let localIndex = 0; if (globalIndex < 25) { setName = 'LEVELS_EASY'; localIndex = globalIndex; } else if (globalIndex < 50) { setName = 'LEVELS_MEDIUM'; localIndex = globalIndex - 25; } else if (globalIndex < 75) { setName = 'LEVELS_HARD'; localIndex = globalIndex - 50; } else { setName = 'LEVELS_ARCANE'; localIndex = globalIndex - 75; } if (ALL_LEVEL_SETS[setName] && ALL_LEVEL_SETS[setName][localIndex]) { return getStarsForLevel(setName, localIndex); } return 0; }
function calculateTotalStars() { let total = 0; for (const setName in ALL_LEVEL_SETS) { if (ALL_LEVEL_SETS[setName] && Array.isArray(ALL_LEVEL_SETS[setName])) { const setLength = ALL_LEVEL_SETS[setName].length; for (let i = 0; i < setLength; i++) { total += getStarsForLevel(setName, i); } } } return total; }

const CLOUD_SAVE_VERSION = 5;
const CAMPAIGN_SET_NAMES = ['LEVELS_EASY', 'LEVELS_MEDIUM', 'LEVELS_HARD', 'LEVELS_ARCANE'];
let cloudSaveTimer = null;
let cloudSyncInProgress = false;

function safeObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function safeArray(value) { return Array.isArray(value) ? value : []; }
function finiteNumber(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }

function collectCampaignStars() {
    const stars = {};
    CAMPAIGN_SET_NAMES.forEach((setName) => {
        stars[setName] = {};
        const levels = ALL_LEVEL_SETS[setName] || [];
        levels.forEach((_, index) => {
            const value = Math.max(0, Math.min(3, parseInt(localStorage.getItem(`${setName}_${index}`) || '0')));
            if (value > 0) stars[setName][index] = value;
        });
    });
    return stars;
}

function collectCampaignBestTimes() {
    const bestTimes = {};
    CAMPAIGN_SET_NAMES.forEach((setName) => {
        bestTimes[setName] = {};
        (ALL_LEVEL_SETS[setName] || []).forEach((_, index) => {
            const value = finiteNumber(localStorage.getItem(`${setName}_${index}_bestTime`));
            if (value > 0) bestTimes[setName][index] = value;
        });
    });
    return bestTimes;
}

function collectDailyCompletions() {
    const completed = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('daily_complete_') && localStorage.getItem(key) === 'true') completed[key] = true;
    }
    return completed;
}

function buildGoldenGlyphsSave() {
    let progress = { set: currentLevelSetName, index: currentLevelIndex };
    let achievementsData = {};
    let timeAttackPB = {};
    let localLeaderboard = [];
    try { progress = JSON.parse(localStorage.getItem('goldenGlyphsProgress') || 'null') || progress; } catch (e) {}
    try { achievementsData = JSON.parse(localStorage.getItem('goldenGlyphsAchievements') || '{}'); } catch (e) {}
    try { timeAttackPB = JSON.parse(localStorage.getItem('goldenGlyphsTA_PB') || '{}'); } catch (e) {}
    try { localLeaderboard = JSON.parse(localStorage.getItem('goldenGlyphsLeaderboard') || '[]'); } catch (e) {}
    if (!ALL_LEVEL_SETS[progress.set] || progress.set === 'LEVELS_DAILY') progress = { set: 'LEVELS_EASY', index: 0 };

    return {
        version: CLOUD_SAVE_VERSION,
        updatedAt: new Date().toISOString(),
        progress: { set: progress.set, index: Math.max(0, finiteNumber(progress.index, 0)) },
        stars: collectCampaignStars(),
        bestTimes: collectCampaignBestTimes(),
        wallet: { gold: Math.max(0, finiteNumber(totalGold)), hints: Math.max(0, finiteNumber(ownedHints)) },
        inventory: safeArray(ownedItems),
        activeItems: safeObject(activeItems),
        tutorialSeen: !!hasSeenTutorial,
        preferences: { accessibility: safeObject(accessibilitySettings), zen: safeObject(zenSettings) },
        achievements: safeObject(achievementsData),
        stats: {
            goldEarned: Math.max(0, finiteNumber(localStorage.getItem('goldenGlyphsGoldEarned'))),
            goldSpent: Math.max(0, finiteNumber(localStorage.getItem('goldenGlyphsGoldSpent'))),
            dailyCount: Math.max(0, finiteNumber(localStorage.getItem('goldenGlyphsDailyCount'))),
            levelsWon: Math.max(0, finiteNumber(localStorage.getItem('goldenGlyphsLevelsWon')))
        },
        dailyCompletions: collectDailyCompletions(),
        dailyResults: (() => { try { return JSON.parse(localStorage.getItem('goldenGlyphsDailyResults') || '{}'); } catch (e) { return {}; } })(),
        timeAttack: {
            highScore: Math.max(0, finiteNumber(localStorage.getItem('goldenGlyphsHighScore'))),
            bestScore: Math.max(0, finiteNumber(timeAttackPB.bestScore)),
            bestSolved: Math.max(0, finiteNumber(timeAttackPB.bestSolved)),
            bestTier: ['EASY', 'MEDIUM', 'HARD', 'ARCANE'].includes(timeAttackPB.bestTier) ? timeAttackPB.bestTier : 'EASY',
            localLeaderboard: safeArray(localLeaderboard).map(Number).filter(Number.isFinite).sort((a, b) => b - a).slice(0, 5)
        }
    };
}

function sumSaveStars(save) {
    let total = 0;
    const stars = safeObject(save && save.stars);
    CAMPAIGN_SET_NAMES.forEach((setName) => {
        Object.values(safeObject(stars[setName])).forEach((value) => { total += Math.max(0, Math.min(3, finiteNumber(value))); });
    });
    return total;
}

function progressRank(progress) {
    const value = safeObject(progress);
    const setIndex = CAMPAIGN_SET_NAMES.indexOf(value.set);
    if (setIndex < 0) return 0;
    return setIndex * 25 + Math.max(0, finiteNumber(value.index));
}

function mergeDailyResults(localResults, cloudResults) {
    const merged = Object.assign({}, safeObject(cloudResults));
    Object.entries(safeObject(localResults)).forEach(([dateKey, result]) => {
        const localResult = safeObject(result);
        const cloudResult = safeObject(merged[dateKey]);
        if (!merged[dateKey] || finiteNumber(localResult.time, Infinity) < finiteNumber(cloudResult.time, Infinity)) merged[dateKey] = localResult;
    });
    return merged;
}

function mergeGoldenGlyphsSaves(localSave, cloudSave) {
    const local = safeObject(localSave);
    const rawCloud = safeObject(cloudSave);
    // The old broken migration stored only { set, index } at the cloud root.
    // Preserve that progress when upgrading to the complete v2 save format.
    const cloud = rawCloud.set && !rawCloud.progress
        ? { version: 1, progress: { set: rawCloud.set, index: rawCloud.index } }
        : rawCloud;
    const mergedStars = {};
    const mergedBestTimes = {};
    CAMPAIGN_SET_NAMES.forEach((setName) => {
        mergedStars[setName] = {};
        mergedBestTimes[setName] = {};
        const localStars = safeObject(safeObject(local.stars)[setName]);
        const cloudStars = safeObject(safeObject(cloud.stars)[setName]);
        const levels = ALL_LEVEL_SETS[setName] || [];
        levels.forEach((_, index) => {
            const best = Math.max(finiteNumber(localStars[index]), finiteNumber(cloudStars[index]));
            if (best > 0) mergedStars[setName][index] = Math.min(3, best);
            const localTime = finiteNumber(safeObject(safeObject(local.bestTimes)[setName])[index]);
            const cloudTime = finiteNumber(safeObject(safeObject(cloud.bestTimes)[setName])[index]);
            const times = [localTime, cloudTime].filter((value) => value > 0);
            if (times.length) mergedBestTimes[setName][index] = Math.min(...times);
        });
    });

    const localProgress = safeObject(local.progress);
    const cloudProgress = safeObject(cloud.progress);
    const localStarTotal = sumSaveStars(local);
    const cloudStarTotal = sumSaveStars(cloud);
    const progress = cloudStarTotal > localStarTotal || (cloudStarTotal === localStarTotal && progressRank(cloudProgress) > progressRank(localProgress))
        ? cloudProgress
        : localProgress;
    const localTA = safeObject(local.timeAttack);
    const cloudTA = safeObject(cloud.timeAttack);
    const tierRank = { EASY: 0, MEDIUM: 1, HARD: 2, ARCANE: 3 };
    const bestTier = (tierRank[cloudTA.bestTier] || 0) > (tierRank[localTA.bestTier] || 0) ? cloudTA.bestTier : (localTA.bestTier || 'EASY');
    const leaderboard = safeArray(localTA.localLeaderboard).concat(safeArray(cloudTA.localLeaderboard)).map(Number).filter(Number.isFinite).sort((a, b) => b - a).slice(0, 5);

    return {
        version: CLOUD_SAVE_VERSION,
        updatedAt: new Date().toISOString(),
        progress: ALL_LEVEL_SETS[progress.set] && progress.set !== 'LEVELS_DAILY'
            ? { set: progress.set, index: Math.max(0, finiteNumber(progress.index)) }
            : { set: 'LEVELS_EASY', index: 0 },
        stars: mergedStars,
        bestTimes: mergedBestTimes,
        wallet: {
            gold: Math.max(finiteNumber(safeObject(local.wallet).gold), finiteNumber(safeObject(cloud.wallet).gold)),
            hints: Math.max(finiteNumber(safeObject(local.wallet).hints), finiteNumber(safeObject(cloud.wallet).hints))
        },
        inventory: Array.from(new Set(safeArray(cloud.inventory).concat(safeArray(local.inventory)))),
        activeItems: Object.assign({}, safeObject(cloud.activeItems), safeObject(local.activeItems)),
        tutorialSeen: !!(local.tutorialSeen || cloud.tutorialSeen),
        preferences: {
            accessibility: Object.assign({}, safeObject(safeObject(cloud.preferences).accessibility), safeObject(safeObject(local.preferences).accessibility)),
            zen: Object.assign({}, safeObject(safeObject(cloud.preferences).zen), safeObject(safeObject(local.preferences).zen))
        },
        achievements: Object.assign({}, safeObject(cloud.achievements), safeObject(local.achievements)),
        stats: {
            goldEarned: Math.max(finiteNumber(safeObject(local.stats).goldEarned), finiteNumber(safeObject(cloud.stats).goldEarned)),
            goldSpent: Math.max(finiteNumber(safeObject(local.stats).goldSpent), finiteNumber(safeObject(cloud.stats).goldSpent)),
            dailyCount: Math.max(finiteNumber(safeObject(local.stats).dailyCount), finiteNumber(safeObject(cloud.stats).dailyCount)),
            levelsWon: Math.max(finiteNumber(safeObject(local.stats).levelsWon), finiteNumber(safeObject(cloud.stats).levelsWon))
        },
        dailyCompletions: Object.assign({}, safeObject(cloud.dailyCompletions), safeObject(local.dailyCompletions)),
        dailyResults: mergeDailyResults(local.dailyResults, cloud.dailyResults),
        timeAttack: {
            highScore: Math.max(finiteNumber(localTA.highScore), finiteNumber(cloudTA.highScore)),
            bestScore: Math.max(finiteNumber(localTA.bestScore), finiteNumber(cloudTA.bestScore)),
            bestSolved: Math.max(finiteNumber(localTA.bestSolved), finiteNumber(cloudTA.bestSolved)),
            bestTier: bestTier,
            localLeaderboard: leaderboard
        }
    };
}

function legacyDataToGoldenGlyphsSave(local) {
    const data = safeObject(local);
    const parseStoredObject = (key, fallback) => {
        const value = data[key];
        if (value && typeof value === 'object') return value;
        return fallback;
    };
    const legacy = {
        version: CLOUD_SAVE_VERSION,
        progress: parseStoredObject('goldenGlyphsProgress', { set: 'LEVELS_EASY', index: 0 }),
        stars: {},
        bestTimes: {},
        wallet: { gold: finiteNumber(data.goldenGlyphsGold), hints: finiteNumber(data.goldenGlyphsHints) },
        inventory: safeArray(data.goldenGlyphsInventory),
        activeItems: safeObject(data.goldenGlyphsActive),
        tutorialSeen: data.goldenGlyphsTutorial === true,
        preferences: { accessibility: safeObject(data.goldenGlyphsAccessibility), zen: safeObject(data.goldenGlyphsZenSettings) },
        achievements: safeObject(data.goldenGlyphsAchievements),
        stats: {
            goldEarned: finiteNumber(data.goldenGlyphsGoldEarned), goldSpent: finiteNumber(data.goldenGlyphsGoldSpent),
            dailyCount: finiteNumber(data.goldenGlyphsDailyCount), levelsWon: finiteNumber(data.goldenGlyphsLevelsWon)
        },
        dailyCompletions: {},
        dailyResults: safeObject(data.goldenGlyphsDailyResults),
        timeAttack: Object.assign({ highScore: finiteNumber(data.goldenGlyphsHighScore), localLeaderboard: safeArray(data.goldenGlyphsLeaderboard) }, safeObject(data.goldenGlyphsTA_PB))
    };
    CAMPAIGN_SET_NAMES.forEach((setName) => {
        legacy.stars[setName] = {};
        legacy.bestTimes[setName] = {};
        (ALL_LEVEL_SETS[setName] || []).forEach((_, index) => {
            const value = finiteNumber(data[`${setName}_${index}`]);
            if (value > 0) legacy.stars[setName][index] = Math.min(3, value);
            const bestTime = finiteNumber(data[`${setName}_${index}_bestTime`]);
            if (bestTime > 0) legacy.bestTimes[setName][index] = bestTime;
        });
    });
    return legacy;
}

function applyGoldenGlyphsSave(save) {
    const data = safeObject(save);
    const progress = safeObject(data.progress);
    if (ALL_LEVEL_SETS[progress.set] && progress.set !== 'LEVELS_DAILY') {
        currentLevelSetName = progress.set;
        currentLevelIndex = Math.min((ALL_LEVEL_SETS[progress.set] || []).length - 1, Math.max(0, finiteNumber(progress.index)));
        localStorage.setItem('goldenGlyphsProgress', JSON.stringify({ set: currentLevelSetName, index: currentLevelIndex }));
    }
    const wallet = safeObject(data.wallet);
    totalGold = Math.max(0, finiteNumber(wallet.gold));
    ownedHints = Math.max(0, finiteNumber(wallet.hints));
    ownedItems = safeArray(data.inventory);
    activeItems = Object.assign({}, activeItems, safeObject(data.activeItems));
    hasSeenTutorial = !!data.tutorialSeen;
    const preferences = safeObject(data.preferences);
    accessibilitySettings = Object.assign(accessibilitySettings, safeObject(preferences.accessibility));
    zenSettings = Object.assign(zenSettings, safeObject(preferences.zen));
    localStorage.setItem('goldenGlyphsGold', totalGold.toString());
    localStorage.setItem('goldenGlyphsHints', ownedHints.toString());
    localStorage.setItem('goldenGlyphsInventory', JSON.stringify(ownedItems));
    localStorage.setItem('goldenGlyphsActive', JSON.stringify(activeItems));
    localStorage.setItem('goldenGlyphsTutorial', hasSeenTutorial ? 'true' : 'false');
    localStorage.setItem('goldenGlyphsAccessibility', JSON.stringify(accessibilitySettings));
    localStorage.setItem('goldenGlyphsZenSettings', JSON.stringify(zenSettings));
    applyAccessibilitySettings();

    const stars = safeObject(data.stars);
    CAMPAIGN_SET_NAMES.forEach((setName) => {
        Object.entries(safeObject(stars[setName])).forEach(([index, value]) => localStorage.setItem(`${setName}_${index}`, Math.min(3, finiteNumber(value)).toString()));
    });
    const bestTimes = safeObject(data.bestTimes);
    CAMPAIGN_SET_NAMES.forEach((setName) => {
        Object.entries(safeObject(bestTimes[setName])).forEach(([index, value]) => {
            if (finiteNumber(value) > 0) localStorage.setItem(`${setName}_${index}_bestTime`, finiteNumber(value).toString());
        });
    });
    localStorage.setItem('goldenGlyphsAchievements', JSON.stringify(safeObject(data.achievements)));
    const stats = safeObject(data.stats);
    localStorage.setItem('goldenGlyphsGoldEarned', finiteNumber(stats.goldEarned).toString());
    localStorage.setItem('goldenGlyphsGoldSpent', finiteNumber(stats.goldSpent).toString());
    localStorage.setItem('goldenGlyphsDailyCount', finiteNumber(stats.dailyCount).toString());
    localStorage.setItem('goldenGlyphsLevelsWon', finiteNumber(stats.levelsWon).toString());
    Object.entries(safeObject(data.dailyCompletions)).forEach(([key, value]) => { if (value && key.startsWith('daily_complete_')) localStorage.setItem(key, 'true'); });
    localStorage.setItem('goldenGlyphsDailyResults', JSON.stringify(safeObject(data.dailyResults)));
    const ta = safeObject(data.timeAttack);
    localStorage.setItem('goldenGlyphsHighScore', Math.max(finiteNumber(ta.highScore), finiteNumber(ta.bestScore)).toString());
    localStorage.setItem('goldenGlyphsTA_PB', JSON.stringify({ bestScore: finiteNumber(ta.bestScore), bestSolved: finiteNumber(ta.bestSolved), bestTier: ta.bestTier || 'EASY' }));
    localStorage.setItem('goldenGlyphsLeaderboard', JSON.stringify(safeArray(ta.localLeaderboard)));
    if (achievements) achievements.load();
    if (hud) { hud.currency = totalGold; hud.ownedHints = ownedHints; hud.highScore = Math.max(finiteNumber(ta.highScore), finiteNumber(ta.bestScore)); }
    if (shop) shop.updateInventory(ownedItems, activeItems, ownedHints);
    if (effects && activeItems.trail) effects.setTrailType(activeItems.trail);
    if (grid && activeItems.glow) grid.setGlow(activeItems.glow);
}

function queueCloudSave() {
    if (!window.GameVolt || !GameVolt.save || !GameVolt.auth || !GameVolt.auth.getUser || !GameVolt.auth.getUser()) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => GameVolt.save.set(buildGoldenGlyphsSave()).catch(() => {}), 500);
}

async function syncGoldenGlyphsCloud() {
    if (cloudSyncInProgress || !window.GameVolt || !GameVolt.save || !GameVolt.auth || !GameVolt.auth.getUser || !GameVolt.auth.getUser()) return;
    cloudSyncInProgress = true;
    try {
        const local = buildGoldenGlyphsSave();
        const cloud = await GameVolt.save.get();
        const merged = mergeGoldenGlyphsSaves(local, cloud);
        applyGoldenGlyphsSave(merged);
        await GameVolt.save.set(merged);
    } catch (e) {
        console.warn('[Golden Glyphs] Cloud sync failed:', e);
    } finally {
        cloudSyncInProgress = false;
    }
}

function saveProgress(stars = 0) { try { const progress = { set: currentLevelSetName, index: currentLevelIndex }; localStorage.setItem('goldenGlyphsProgress', JSON.stringify(progress)); localStorage.setItem('goldenGlyphsGold', totalGold.toString()); localStorage.setItem('goldenGlyphsHints', ownedHints.toString()); localStorage.setItem('goldenGlyphsInventory', JSON.stringify(ownedItems)); localStorage.setItem('goldenGlyphsActive', JSON.stringify(activeItems)); localStorage.setItem('goldenGlyphsTutorial', hasSeenTutorial ? 'true' : 'false'); if (stars > 0 && currentLevelSetName !== 'LEVELS_DAILY') { const levelKey = `${currentLevelSetName}_${currentLevelIndex}`; const existingStars = parseInt(localStorage.getItem(levelKey) || 0); if (stars > existingStars) localStorage.setItem(levelKey, stars.toString()); } queueCloudSave(); } catch (e) {} }
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

// --- SDK PAUSE MENU ---
function togglePause() {
    if (window.GameVolt && GameVolt.ui) {
        GameVolt.ui.pauseMenu({
            musicVolume: audio ? audio.musicVolume : 0.5,
            sfxVolume: audio ? audio.sfxVolume : 0.6,
            onPause: function() {
                gamePaused = true;
                if (input) input.locked = true;
                if (audio && audio.currentAudio) audio.currentAudio.volume = audio.musicVolume * 0.2;
            },
            onResume: function() {
                gamePaused = false;
                if (input) input.locked = false;
                if (audio && audio.currentAudio) audio.currentAudio.volume = audio.musicVolume;
            },
            onRestart: function() {
                gamePaused = false;
                if (input) input.locked = false;
                if (audio && audio.currentAudio) audio.currentAudio.volume = audio.musicVolume;
                timeElapsed = 0;
                clearActiveHint();
                loadLevel(currentLevelIndex);
            },
            onQuit: function() {
                gamePaused = false;
                if (input) input.locked = false;
                if (audio && audio.currentAudio) audio.currentAudio.volume = audio.musicVolume;
                quitToMenu();
            },
            onMusicVolume: function(v) {
                if (audio) {
                    audio.musicVolume = v;
                    if (audio.currentAudio && !audio.currentAudio.paused) audio.currentAudio.volume = v * 0.2;
                }
            },
            onSfxVolume: function(v) {
                if (audio) audio.sfxVolume = v;
            }
        });
    } else {
        // Fallback without SDK: go directly to menu/map
        quitToMenu();
    }
}

function quitToMenu() {
    saveProgress();
    if (typeof GameVoltTracker !== 'undefined') GameVoltTracker.track('level_quit', { level: currentLevelIndex + 1, set: currentLevelSetName });
    if (gameState === "TIME_ATTACK") {
        if (audio) audio.stopMusic();
        gameState = "MENU";
        return;
    }
    if (zenMode || currentLevelSetName === 'LEVELS_DAILY') {
        zenMode = false;
        if (audio) audio.stopMusic();
        gameState = "MENU";
    } else {
        gameState = "MAP";
    }
}

function initSystems() {
  layout = new Layout(canvas); grid = new Grid(ctx, CONFIG.COLS, CONFIG.ROWS); hud = new HUD(layout); 
  audio = new AudioManager(); window.audio = audio; 
  dynamicBg = new DynamicBackground(canvas); // Partikeleffekter
  layout.onResize = () => { if (grid) grid.resize(); if (tray) tray.resize(); if (hud) hud.resize(); if (worldMap) worldMap.resize(); if (dynamicBg) dynamicBg.resize(); resetPiecesPosition(); }; 
  bitfield = new BitField(grid); tray = new Tray(ctx, layout); effects = new Effects(grid); tutorial = new Tutorial(canvas, grid); dailySystem = new DailySystem(); timeAttack = new TimeAttack(); 
  ui = new UI(() => { if (currentLevelSetName === 'LEVELS_DAILY') { gameState = "MENU"; saveProgress(); } else { if (currentLevelSetName === 'LEVELS_EASY' && currentLevelIndex === 0) { hasSeenTutorial = true; saveProgress(); } currentLevelIndex++; if (currentLevelIndex >= currentLevelSet.length) { gameState = "MAP"; } else { saveProgress(); timeElapsed = 0; loadLevel(currentLevelIndex); } } }, ads);
  configureZenSettings();
  configureAccessibility();
  input = new Input(canvas, grid, pieces, bitfield, tray, effects);
  input.keyboardEnabledFn = () => gameState === "PLAYING" || gameState === "TIME_ATTACK";
  input.hudCheckFn = (x, y) => hud && hud.checkHit(x, y);
  worldMap = new WorldMap(canvas, (globalLevelIndex) => startLevelFromMap(globalLevelIndex), () => goToMenu(), (index) => getStarsForGlobalIndex(index), () => { shopReturnState = "MAP"; gameState = "SHOP"; shop.updateInventory(ownedItems, activeItems, ownedHints); checkAchievements({ visitedShop: true }); }, () => totalGold, (index) => getBestTimeForGlobalIndex(index));
  shop = new Shop( canvas, () => { gameState = shopReturnState; }, (item, action) => handleShopPurchase(item, action), ads );
  achievements = new AchievementSystem(canvas);
  const savedHigh = localStorage.getItem('goldenGlyphsHighScore'); if (savedHigh && hud) { hud.highScore = parseInt(savedHigh); }

  // --- GameVolt SDK ---
  if (window.GameVolt) {
    const migrationKeys = ['goldenGlyphsProgress', 'goldenGlyphsGold', 'goldenGlyphsHints', 'goldenGlyphsInventory', 'goldenGlyphsActive', 'goldenGlyphsTutorial', 'goldenGlyphsAccessibility', 'goldenGlyphsZenSettings', 'goldenGlyphsAchievements', 'goldenGlyphsGoldEarned', 'goldenGlyphsGoldSpent', 'goldenGlyphsDailyCount', 'goldenGlyphsDailyResults', 'goldenGlyphsLevelsWon', 'goldenGlyphsHighScore', 'goldenGlyphsLeaderboard', 'goldenGlyphsTA_PB'];
    CAMPAIGN_SET_NAMES.forEach((setName) => {
      (ALL_LEVEL_SETS[setName] || []).forEach((_, index) => { migrationKeys.push(`${setName}_${index}`); migrationKeys.push(`${setName}_${index}_bestTime`); });
    });
    GameVolt.save.registerMigration({
      keys: migrationKeys,
      merge: function(local, cloud) {
        return mergeGoldenGlyphsSaves(legacyDataToGoldenGlyphsSave(local), cloud);
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
    // Register migration before init so even an immediately restored session
    // cannot miss the migration config.
    GameVolt.init('golden-glyphs');
    // Sync local trophies to cloud on auth state change
    GameVolt.auth.onStateChange(function(user) {
      if (user && achievements && achievements.unlocked) {
        var ids = Object.keys(achievements.unlocked);
        for (var i = 0; i < ids.length; i++) {
          GameVolt.achievements.unlock(ids[i]);
        }
      }
    });
    // Cross-device: pull cloud-earned trophies into the local store so this
    // device doesn't re-toast them (also fixes the trophy count/panel).
    function backfillTrophies(user) {
      if (!user || !GameVolt.achievements.getUnlockedIds) return;
      GameVolt.achievements.getUnlockedIds().then(function(ids) {
        if (!ids || !ids.forEach) return;
        ids.forEach(function(id) {
          if (achievements && !achievements.unlocked[id]) achievements.unlocked[id] = Date.now();
        });
        if (achievements) achievements.save();
      });
    }
    GameVolt.auth.onStateChange(backfillTrophies);
    GameVolt.auth.onStateChange(function(user) {
      if (!user) return;
      // Await the SDK's legacy migration, then perform a full two-way merge.
      // migrate() is idempotent; calling it here also covers restored sessions.
      GameVolt.save.migrate().then(syncGoldenGlyphsCloud);
    });
    if (GameVolt.auth.getUser) { var u = GameVolt.auth.getUser(); if (u) backfillTrophies(u); }
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
    
    const isFirstTutorialCompletion = currentLevelSetName === 'LEVELS_EASY' && currentLevelIndex === 0 && !hasSeenTutorial;
    const starsBeforeCompletion = calculateTotalStars();
    let streakBonus = 0; const isDaily = currentLevelSetName === 'LEVELS_DAILY'; let dailySummary = null; if (isDaily) { const firstCompletion = dailySystem && !dailySystem.isCompleted(); if (dailySystem) { const streak = dailySystem.markCompleted({ time: completionTime, stars: awardedStars, hints: dailyHintsUsed }); streakBonus = firstCompletion ? (streak >= 7 ? 100 : streak >= 3 ? 50 : streak >= 2 ? 20 : 0) : 0; dailySummary = { number: dailySystem.getDayNumber(), dateKey: dailySystem.getDateKey(), time: completionTime, hints: dailyHintsUsed, stars: awardedStars, streak: streak, replay: !firstCompletion }; dailySummary.leaderboard = submitAndFetchDailyLeaderboard(dailySummary); } reward = firstCompletion ? 500 + streakBonus : 0; } else { const levelKey = `${currentLevelSetName}_${currentLevelIndex}`; const oldStars = parseInt(localStorage.getItem(levelKey) || 0); const bestTimeKey = `${levelKey}_bestTime`; const oldBestTime = finiteNumber(localStorage.getItem(bestTimeKey)); if (!oldBestTime || completionTime < oldBestTime) localStorage.setItem(bestTimeKey, completionTime.toString()); if (awardedStars > oldStars) reward = 100 + (awardedStars * 20); else reward = 50; if (isFirstTutorialCompletion) reward += 250; if (awardedStars > oldStars) localStorage.setItem(levelKey, awardedStars.toString()); } const starsAfterCompletion = calculateTotalStars(); const worldUnlock = [{ name: 'FROZEN PEAKS', required: 25 }, { name: 'INFERNO CORE', required: 50 }, { name: 'NEON NEXUS', required: 100 }].find((world) => starsBeforeCompletion < world.required && starsAfterCompletion >= world.required) || null; if (isFirstTutorialCompletion) hasSeenTutorial = true; totalGold += reward; saveProgress(awardedStars); checkAchievements({ completedLevel: true, completedDaily: isDaily && reward > 0, awardedStars: awardedStars, goldEarned: reward }); if (typeof gvPost === 'function') gvPost('level_complete', { level: currentLevelIndex + 1, stars: awardedStars, set: currentLevelSetName }); if (typeof GameVoltTracker !== 'undefined') { GameVoltTracker.track('level_complete', { level: currentLevelIndex + 1, set: currentLevelSetName, stars: awardedStars, time_seconds: completionTime }); if (isFirstTutorialCompletion) GameVoltTracker.track('tutorial_complete', { time_seconds: completionTime }); } playSound('win'); try { if (effects) effects.triggerVictory(pieces); } catch(e) {} setTimeout(() => { if (ui && typeof ui.showWinScreen === 'function') {
        const titleText = isDaily ? "DAILY COMPLETE" : "LEVEL COMPLETE";
        const btnText = isDaily ? "BACK TO MENU" : "NEXT LEVEL";
        ui.showWinScreen(awardedStars, reward, () => { totalGold += reward; saveProgress(); playSound('purchase'); }, titleText, btnText, null, (name) => playSound(name), streakBonus, dailySummary, worldUnlock); } else { gameState = "MAP"; } }, 1500); });
  canvas.addEventListener('pointerdown', (e) => { const pos = getEventPos(e); if (gameState === "CREDITS") { const btn = window._creditsBackBtn; if (btn && pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) { playSound('menu_back'); hideCredits(); } return; } if (gameState === "MENU") { playSound('click'); handleMenuClick(pos.x, pos.y); } else if (gameState === "DAILY_BRIEF") { handleDailyBriefClick(pos.x, pos.y); } else if (gameState === "MAP") { worldMap.handleInput('down', pos.x, pos.y); } else if (gameState === "SHOP") { shop.handleInput('down', pos.x, pos.y); } else if (gameState === "ACHIEVEMENTS") { if (achievements.checkBackButton(pos.x, pos.y)) { playSound('menu_back'); gameState = "MENU"; return; } achievements.handleInput('down', pos.x, pos.y); } else if (gameState === "PLAYING" || gameState === "TIME_ATTACK") { const hudAction = hud.checkHit(pos.x, pos.y); if (hudAction === 'menu') { playSound('click'); togglePause(); return; } if (hudAction === 'hint') { tryUseHint(); return; } } });
  canvas.addEventListener('pointermove', (e) => { const pos = getEventPos(e); if (gameState === "MAP") worldMap.handleInput('move', pos.x, pos.y); if (gameState === "SHOP") shop.handleInput('move', pos.x, pos.y); if (gameState === "ACHIEVEMENTS") achievements.handleInput('move', pos.x, pos.y); });
  canvas.addEventListener('pointerup', (e) => { const pos = getEventPos(e); if (gameState === "MAP") worldMap.handleInput('up', pos.x, pos.y); if (gameState === "SHOP") shop.handleInput('up', pos.x, pos.y); if (gameState === "ACHIEVEMENTS") achievements.handleInput('up', pos.x, pos.y); });
  canvas.addEventListener('wheel', (e) => { if (gameState === "MAP") { e.preventDefault(); worldMap.handleScroll(e.deltaY); } if (gameState === "SHOP") { e.preventDefault(); shop.handleWheel(e.deltaY); } if (gameState === "ACHIEVEMENTS") { e.preventDefault(); achievements.handleWheel(e.deltaY); } }, { passive: false });
  // ESC key opens/closes SDK pause menu during gameplay
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (gameState === "PLAYING" || gameState === "TIME_ATTACK")) {
      e.preventDefault();
      togglePause();
    }
  });
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
            if (currentLevelSetName === 'LEVELS_DAILY') dailyHintsUsed++;
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
            if (currentLevelSetName === 'LEVELS_DAILY') dailyHintsUsed++;
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
function pointInRect(x, y, rect) {
    return rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function getDailyDifficulty(level) {
    const id = String(level?.id || '');
    if (id.includes('boss')) return { label: 'MASTER', color: '#ff5e83', marks: 3 };
    if (id.includes('hard')) return { label: 'HARD', color: '#ff9b55', marks: 3 };
    if (id.includes('quick')) return { label: 'QUICK', color: '#70e0a1', marks: 1 };
    return { label: 'STANDARD', color: '#66e2ff', marks: 2 };
}

function drawDailyBoardPreview(level, x, y, size, accent) {
    const cells = [];
    (level?.map || []).forEach((row, rowIndex) => row.forEach((value, colIndex) => { if (value) cells.push({ col: colIndex, row: rowIndex }); }));
    if (!cells.length) return;
    const minCol = Math.min(...cells.map(cell => cell.col));
    const maxCol = Math.max(...cells.map(cell => cell.col));
    const minRow = Math.min(...cells.map(cell => cell.row));
    const maxRow = Math.max(...cells.map(cell => cell.row));
    const cellSize = Math.min(size / (maxCol - minCol + 1), size / (maxRow - minRow + 1));
    const offsetX = x + (size - (maxCol - minCol + 1) * cellSize) / 2;
    const offsetY = y + (size - (maxRow - minRow + 1) * cellSize) / 2;
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 10;
    cells.forEach(cell => {
        const cx = offsetX + (cell.col - minCol) * cellSize;
        const cy = offsetY + (cell.row - minRow) * cellSize;
        const tile = ctx.createLinearGradient(cx, cy, cx, cy + cellSize);
        tile.addColorStop(0, 'rgba(102,226,255,.48)');
        tile.addColorStop(1, 'rgba(20,67,86,.72)');
        ctx.fillStyle = tile;
        ctx.fillRect(cx + 1, cy + 1, Math.max(2, cellSize - 2), Math.max(2, cellSize - 2));
    });
    ctx.restore();
}

function drawDailyBrief() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const mobile = w < 700;
    const info = dailySystem.getDisplayInfo();
    const level = LEVELS_DAILY[info.levelIndex];
    const difficulty = getDailyDifficulty(level);
    const completed = dailySystem.isCompleted();
    const result = dailySystem.getTodayResult();
    const streak = dailySystem.getStreak();
    const longest = dailySystem.getLongestStreak();

    const bg = ctx.createRadialGradient(w / 2, h * .38, 20, w / 2, h * .45, Math.max(w, h) * .72);
    bg.addColorStop(0, '#173244');
    bg.addColorStop(.48, '#09141d');
    bg.addColorStop(1, '#020509');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.strokeStyle = 'rgba(233,30,99,.07)';
    for (let r = 34; r < Math.max(w, h); r += 44) {
        ctx.beginPath();
        ctx.arc(w / 2, h * .38, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = '#ff5e96';
    ctx.font = `800 ${mobile ? 10 : 12}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`DAILY CHALLENGE · UTC`, w / 2, mobile ? 76 : 68);
    ctx.fillStyle = '#fff3cf';
    ctx.font = `900 ${mobile ? 34 : 46}px 'Cinzel', serif`;
    ctx.fillText(`#${info.number}`, w / 2, mobile ? 113 : 111);
    ctx.fillStyle = 'rgba(225,231,235,.66)';
    ctx.font = `700 ${mobile ? 11 : 12}px sans-serif`;
    ctx.fillText(info.label.toUpperCase(), w / 2, mobile ? 142 : 150);

    const cardW = Math.min(430, w - (mobile ? 28 : 48));
    const cardH = mobile ? 390 : 410;
    const cardX = (w - cardW) / 2;
    const cardY = mobile ? 174 : 180;
    const card = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    card.addColorStop(0, 'rgba(27,40,48,.97)');
    card.addColorStop(1, 'rgba(5,10,14,.98)');
    ctx.fillStyle = card;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = completed ? 'rgba(216,182,79,.65)' : 'rgba(102,226,255,.38)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const previewSize = mobile ? 132 : 150;
    drawDailyBoardPreview(level, w / 2 - previewSize / 2, cardY + 31, previewSize, difficulty.color);

    ctx.fillStyle = difficulty.color;
    ctx.font = `800 ${mobile ? 11 : 12}px sans-serif`;
    ctx.fillText(difficulty.label, w / 2, cardY + previewSize + 50);
    const markGap = 15;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(w / 2 + (i - 1) * markGap, cardY + previewSize + 70, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = i < difficulty.marks ? difficulty.color : 'rgba(255,255,255,.13)';
        ctx.fill();
    }

    ctx.fillStyle = 'rgba(225,231,235,.5)';
    ctx.font = `700 ${mobile ? 9 : 10}px sans-serif`;
    ctx.fillText(`${level?.pieces?.length || 4} GLYPHS · ONE SHARED PUZZLE`, w / 2, cardY + previewSize + 94);

    const statY = cardY + previewSize + 132;
    const statW = (cardW - 50) / 2;
    [['CURRENT STREAK', `${streak} DAYS`], ['LONGEST STREAK', `${longest} DAYS`]].forEach(([label, value], index) => {
        const sx = cardX + 20 + index * (statW + 10);
        ctx.fillStyle = 'rgba(255,255,255,.045)';
        ctx.beginPath();
        ctx.roundRect(sx, statY, statW, 58, 8);
        ctx.fill();
        ctx.fillStyle = 'rgba(225,231,235,.5)';
        ctx.font = '700 8px sans-serif';
        ctx.fillText(label, sx + statW / 2, statY + 17);
        ctx.fillStyle = index ? '#d8b64f' : '#ff8c55';
        ctx.font = `800 ${mobile ? 14 : 16}px 'Cinzel', serif`;
        ctx.fillText(value, sx + statW / 2, statY + 39);
    });

    if (completed && result) {
        const minutes = Math.floor(result.time / 60);
        const seconds = Math.floor(result.time % 60).toString().padStart(2, '0');
        ctx.fillStyle = '#d8b64f';
        ctx.font = '700 10px sans-serif';
        ctx.fillText(`COMPLETED · BEST ${minutes}:${seconds} · ${result.stars || 0}/3 STARS`, w / 2, cardY + cardH - 30);
    } else {
        ctx.fillStyle = 'rgba(225,231,235,.52)';
        ctx.font = '700 9px sans-serif';
        ctx.fillText('FIRST CLEAR REWARD · 500 GOLD', w / 2, cardY + cardH - 30);
    }

    const playW = Math.min(330, w - 50);
    const playH = 54;
    const playX = (w - playW) / 2;
    const playY = Math.min(h - 82, cardY + cardH + 24);
    ctx.shadowColor = completed ? '#d8b64f' : '#e91e63';
    ctx.shadowBlur = 14;
    ctx.fillStyle = completed ? '#d8b64f' : '#f04b82';
    ctx.beginPath();
    ctx.roundRect(playX, playY, playW, playH, 11);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#080b0e';
    ctx.font = `900 ${mobile ? 15 : 17}px 'Cinzel', serif`;
    ctx.fillText(completed ? 'REPLAY TODAY\'S GLYPH' : 'BEGIN TODAY\'S GLYPH', w / 2, playY + playH / 2);

    ctx.fillStyle = '#d8b64f';
    ctx.font = '700 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('‹', 22, 32);
    dailyBriefButtons = { back: { x: 0, y: 0, w: 60, h: 64 }, play: { x: playX, y: playY, w: playW, h: playH } };
}

function handleDailyBriefClick(x, y) {
    if (pointInRect(x, y, dailyBriefButtons.back)) {
        playSound('menu_back');
        gameState = 'MENU';
    } else if (pointInRect(x, y, dailyBriefButtons.play)) {
        playSound('click');
        dailyHintsUsed = 0;
        startGame('LEVELS_DAILY', dailySystem.getTodayIndex());
    }
}

function handleMenuClick(clickX, clickY) { const { x, startY, w: btnW, h: btnH, gap } = menuBtnLayout; MENU_BUTTONS.forEach((btn, index) => { const y = startY + index * (btnH + gap); if (clickX >= x && clickX <= x + btnW && clickY >= y && clickY <= y + btnH) { if (btn.text === "CAMPAIGN") { if (!hasSeenTutorial) { startGame('LEVELS_EASY', 0); } else { gameState = "MAP"; } } else if (btn.name === 'DAILY') { gameState = 'DAILY_BRIEF'; } else if (btn.name === 'MODE_TIME') { timeAttack.start(); const next = timeAttack.getNextLevel(); gameState = "TIME_ATTACK"; startGame(next.set, next.index); timeAttack.markLevelStart(); if (audio) audio.playMusic('music_time_attack'); checkAchievements({ playedTimeAttack: true }); } else if (btn.name === 'MODE_ZEN') { showZenSettings(); } else if (btn.name === 'SHOP') { shopReturnState = "MENU"; gameState = "SHOP"; shop.updateInventory(ownedItems, activeItems, ownedHints); checkAchievements({ visitedShop: true }); } else if (btn.name === 'ACHIEVEMENTS') { gameState = "ACHIEVEMENTS"; achievements.resetScroll(); } } }); }

// --- ZEN MODE ---
let zenMode = false;
let zenLevelPool = []; // Pool av alla banor att slumpa från
let zenCursor = 0;
let zenSolved = 0;
let zenSettings = { difficulty: 'mixed', length: 10, theme: 'zen', reducedMotion: false };

function showZenSettings() {
    const overlay = document.getElementById('zen-settings');
    if (!overlay) { startZenMode(); return; }
    try { zenSettings = Object.assign(zenSettings, JSON.parse(localStorage.getItem('goldenGlyphsZenSettings') || '{}')); } catch (e) {}
    document.getElementById('zen-difficulty').value = zenSettings.difficulty;
    document.getElementById('zen-length').value = String(zenSettings.length);
    document.getElementById('zen-theme').value = zenSettings.theme;
    document.getElementById('zen-reduced-motion').checked = !!zenSettings.reducedMotion;
    overlay.classList.remove('hidden');
}

function configureZenSettings() {
    const overlay = document.getElementById('zen-settings');
    const startBtn = document.getElementById('zen-start');
    const cancelBtn = document.getElementById('zen-cancel');
    if (!overlay || !startBtn || startBtn.dataset.bound) return;
    startBtn.dataset.bound = 'true';
    startBtn.addEventListener('click', () => {
        zenSettings = {
            difficulty: document.getElementById('zen-difficulty').value,
            length: Math.max(0, Number(document.getElementById('zen-length').value) || 0),
            theme: document.getElementById('zen-theme').value,
            reducedMotion: document.getElementById('zen-reduced-motion').checked
        };
        localStorage.setItem('goldenGlyphsZenSettings', JSON.stringify(zenSettings));
        overlay.classList.add('hidden');
        startZenMode();
    });
    cancelBtn.addEventListener('click', () => overlay.classList.add('hidden'));
}

function buildZenLevelPool() {
    zenLevelPool = [];
    const setsByDifficulty = { gentle: ['LEVELS_EASY'], mixed: ['LEVELS_EASY', 'LEVELS_MEDIUM'], master: ['LEVELS_HARD', 'LEVELS_ARCANE'] };
    const levelSets = setsByDifficulty[zenSettings.difficulty] || setsByDifficulty.mixed;
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
    for (let i = zenLevelPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [zenLevelPool[i], zenLevelPool[j]] = [zenLevelPool[j], zenLevelPool[i]];
    }
    zenCursor = 0;
}

function getRandomZenLevel() {
    if (zenLevelPool.length === 0) buildZenLevelPool();
    if (zenCursor >= zenLevelPool.length) buildZenLevelPool();
    return zenLevelPool[zenCursor++];
}

function startZenMode() {
    zenMode = true;
    zenSolved = 0;
    buildZenLevelPool();
    
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
    zenSolved++;
    if (zenSettings.length > 0 && zenSolved >= zenSettings.length) {
        zenMode = false;
        if (ui) ui.showWinScreen(0, 0, null, "ZEN SESSION COMPLETE", "BACK TO MENU", () => { gameState = "MENU"; pieces.length = 0; }, null, 0, null);
        return;
    }
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
        { label: "A GAMEVOLT ORIGINAL", value: "Golden Glyphs" },
        { label: "CREATED BY", value: "GameVolt" },
        { label: "", value: "" },
        { label: "SPECIAL THANKS", value: "All our players!" },
        { label: "", value: "" },
        { label: "VERSION", value: "1.1.0" }
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
function startGame(levelSetName, levelIndex) { currentLevelSetName = levelSetName; currentLevelSet = ALL_LEVEL_SETS[levelSetName]; currentLevelIndex = levelIndex; if (gameState !== "TIME_ATTACK") gameState = "PLAYING"; timeElapsed = 0; clearActiveHint(); if (levelSetName === 'LEVELS_DAILY') prepareDailyLeaderboard(); saveProgress(); loadLevel(currentLevelIndex); if (typeof GameVoltTracker !== 'undefined') GameVoltTracker.track('level_start', { level: currentLevelIndex + 1, set: currentLevelSetName, mode: zenMode ? 'zen' : (gameState === 'TIME_ATTACK' ? 'time_attack' : currentLevelSetName === 'LEVELS_DAILY' ? 'daily' : 'campaign') }); }
function goToMenu() { zenMode = false; gameState = "MENU"; pieces.length = 0; if (hud) { hud.levelStars = 0; hud.currency = totalGold; hud.ownedHints = ownedHints; } playSound('click'); }

function loadLevel(index) { 
    currentLevelSet = ALL_LEVEL_SETS[currentLevelSetName]; 
    if (index >= currentLevelSet.length) { gameState = "MAP"; return; } 
    const levelData = currentLevelSet[index]; bitfield.loadLevelMap(levelData.map); pieces = []; clearActiveHint(); if (input) input.locked = false;
    
    // --- BAKGRUNDSLOGIK ---
    // Steg 1: Bestäm världens standard-bakgrund och partikeleffekt
    let worldDefaultBg = SYSTEM_IMAGES['bg_temple'].src;
    let targetAudio = 'ambience_jungle';
    let targetParticles = 'spores'; // DEFAULT partikeleffekt
    let boardTheme = 'jungle';
    
    // TIME ATTACK: Fast bakgrund oavsett vilken värld nivån kommer från
    if (gameState === "TIME_ATTACK") {
        worldDefaultBg = SYSTEM_IMAGES['bg_time'].src;
        targetParticles = 'volcano';
        boardTheme = 'inferno';
    }
    // ZEN MODE: Fast lugn zen-bakgrund och zen-musik
    else if (zenMode) {
        const zenThemes = { zen: 'bg_zen', temple: 'bg_temple', ice: 'bg_ice', lava: 'bg_lava', neon: 'bg_cyber' };
        const zenBgKey = zenThemes[zenSettings.theme] || 'bg_zen';
        worldDefaultBg = SYSTEM_IMAGES[zenBgKey].src;
        targetAudio = 'ambience_zen';
        targetParticles = zenSettings.theme === 'ice' ? 'snow' : zenSettings.theme === 'lava' ? 'volcano' : zenSettings.theme === 'neon' ? 'rain' : 'spores';
        boardTheme = ({ ice:'frozen', lava:'inferno', neon:'neon', temple:'jungle', zen:'zen' })[zenSettings.theme] || 'zen';
    } else if (currentLevelSetName === 'LEVELS_EASY') { 
        worldDefaultBg = SYSTEM_IMAGES['bg_temple'].src; 
        targetAudio = 'ambience_jungle'; 
        targetParticles = 'spores';
    } else if (currentLevelSetName === 'LEVELS_MEDIUM') { 
        worldDefaultBg = SYSTEM_IMAGES['bg_ice'].src; 
        targetAudio = 'ambience_ice'; 
        targetParticles = 'snow';
        boardTheme = 'frozen';
    } else if (currentLevelSetName === 'LEVELS_HARD') { 
        worldDefaultBg = SYSTEM_IMAGES['bg_lava'].src; 
        targetAudio = 'ambience_lava'; 
        targetParticles = 'volcano';
        boardTheme = 'inferno';
    } else if (currentLevelSetName === 'LEVELS_ARCANE') { 
        worldDefaultBg = SYSTEM_IMAGES['bg_cyber'].src; 
        targetAudio = 'ambience_cyber'; 
        targetParticles = 'rain';
        boardTheme = 'neon';
    } else if (currentLevelSetName === 'LEVELS_DAILY') { 
        worldDefaultBg = SYSTEM_IMAGES['bg_cyber'].src; 
        targetAudio = 'ambience_cyber'; 
        targetParticles = 'rain';
        boardTheme = 'neon';
    }
    
    // Steg 2: Kolla om spelaren har en KÖPT bakgrund equipped
    let targetBgSrc = worldDefaultBg; // Default = följ världen
    
    if (!zenMode && activeItems.world && activeItems.world !== 'default') {
        // Spelaren har köpt och equipped en bakgrund - använd den överallt
        if (WORLDS[activeItems.world] && WORLDS[activeItems.world].src) {
            targetBgSrc = WORLDS[activeItems.world].src;
        }
    }
    
    // Steg 3: Aktivera partikeleffekt
    if (dynamicBg) {
        dynamicBg.setEffect(targetParticles);
    }
    if (grid && typeof grid.setTheme === 'function') grid.setTheme(boardTheme);
    if (tray && typeof tray.setTheme === 'function') tray.setTheme(boardTheme);
    if (hud && typeof hud.setTheme === 'function') hud.setTheme(boardTheme);
    const gameShell = document.getElementById('game-shell');
    if (gameShell) gameShell.dataset.visualTheme = boardTheme;
    
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
    
    if (gameState === "PLAYING") { if (!gamePaused) timeElapsed += dt; if (hud) { hud.isTimeAttack = false; hud.time = zenMode ? null : timeElapsed; hud.currentLevelName = zenMode ? `ZEN ${zenSettings.length > 0 ? `${Math.min(zenSolved + 1, zenSettings.length)}/${zenSettings.length}` : '∞'}` : (currentLevelSetName === 'LEVELS_DAILY') ? "DAILY CHALLENGE" : `LEVEL ${currentLevelIndex + 1}`; hud.currency = totalGold; hud.ownedHints = ownedHints; hud.currentScore = 0; const levelKey = `${currentLevelSetName}_${currentLevelIndex}`; hud.earnedStars = parseInt(localStorage.getItem(levelKey) || 0); } }
    else if (gameState === "TIME_ATTACK") { const status = gamePaused ? null : timeAttack.update(dt); if (status === "GAME_OVER") { handleTimeAttackGameOver(); loopRunning = false; return; } if (hud) { hud.isTimeAttack = true; hud.time = timeAttack.timeLeft; hud.currentScore = timeAttack.score; hud.currency = totalGold; const currentHigh = parseInt(localStorage.getItem('goldenGlyphsHighScore') || 0); if (timeAttack.score > currentHigh) { hud.highScore = timeAttack.score; localStorage.setItem('goldenGlyphsHighScore', timeAttack.score); } else { hud.highScore = currentHigh; } } }
    ctx.save(); 
    let shakeX = 0; let shakeY = 0; if (effects) { const shake = effects.getShakeOffset(); shakeX = shake.x; shakeY = shake.y; } ctx.translate(shakeX, shakeY);
    drawBackground(); 
    
    // Rita bakgrundspartiklar ENDAST om spelaren har DEFAULT bakgrund
    // (Sporer/snö/aska/regn passar inte på köpta bakgrunder som BLUEPRINT etc.)
    const reducedMotion = accessibilitySettings.reducedMotion || (zenMode && zenSettings.reducedMotion);
    if (effects && typeof effects.setReducedMotion === 'function') effects.setReducedMotion(reducedMotion);
    const showBgParticles = !reducedMotion && (activeItems.world === 'default') && (gameState === "PLAYING" || gameState === "TIME_ATTACK");
    if (dynamicBg && showBgParticles) {
        dynamicBg.update(dt);
        dynamicBg.draw();
    }
    
    const accessibilityOpen = document.getElementById('accessibility-open'); if (accessibilityOpen) accessibilityOpen.classList.toggle('hidden', gameState !== "MENU");
    if (gameState === "MENU") { drawMenu(); } else if (gameState === "DAILY_BRIEF") { drawDailyBrief(); } else if (gameState === "CREDITS") { drawCredits(); } else if (gameState === "MAP") { worldMap.update(dt); worldMap.draw(); } else if (gameState === "SHOP") { worldMap.draw(); shop.draw(ctx, totalGold); } else if (gameState === "ACHIEVEMENTS") { achievements.draw(ctx); }
    else { 
        pieces.forEach(p => p.update(dt)); if (effects) effects.update(dt); grid.draw(ctx); 
        
        // Tutorial System - aktiveras på Level 1 (LEVELS_EASY index 0)
        const levelData = currentLevelSet[currentLevelIndex];
        const isTutorialLevel = !zenMode && gameState !== 'TIME_ATTACK' && currentLevelSetName === 'LEVELS_EASY' && currentLevelIndex === 0 && !hasSeenTutorial;
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
    if (typeof GameVoltTracker !== 'undefined') GameVoltTracker.track('time_attack_complete', { score: timeAttack.score, solved: solved, tier: tier });

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

    // Deep vignette focuses the eye on the relic-like menu stack.
    ctx.fillStyle = "rgba(3, 5, 12, 0.5)";
    ctx.fillRect(0, 0, w, h);
    const vignette = ctx.createRadialGradient(w / 2, h * .46, Math.min(w,h) * .12, w / 2, h * .46, Math.max(w,h) * .72);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.56)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // Titel
    let titleSize = Math.min(w * 0.12, isMobile ? 35 : 80) * accessibilitySettings.textScale;
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
    ctx.font = `600 ${Math.max(10, titleSize * .27)}px 'Cinzel', serif`;
    ctx.fillStyle = "rgba(255,236,176,.72)";
    ctx.fillText("AN ANCIENT PUZZLE AWAITS", w / 2, (h * .15) + titleSize * .5);
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
        let secondaryText = "";
        let recentCalendar = null;
        
        if (btn.name === 'DAILY') { 
            if (dailySystem) {
                const dailyInfo = dailySystem.getDisplayInfo();
                const dailyStreak = dailySystem.getStreak();
                const longestStreak = dailySystem.getLongestStreak();
                secondaryText = `#${dailyInfo.number} · ${dailyInfo.label} · ${dailyStreak}/${longestStreak}`;
                recentCalendar = dailySystem.getRecentCalendar(7);
            }
            if (dailySystem && dailySystem.isCompleted()) { 
                accentColor = "#B88716";
                isCompleted = true;
            } 
        } 
        
        // Deep artifact panel with a restrained mode-colored energy edge.
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 7;
        
        // Dark stone/glass instead of a full saturated color block.
        const btnGrad = ctx.createLinearGradient(x, y, x, y + btnH);
        const baseColor = accentColor;
        btnGrad.addColorStop(0, "rgba(31,37,46,.96)");
        btnGrad.addColorStop(.5, "rgba(12,17,25,.96)");
        btnGrad.addColorStop(1, "rgba(4,7,12,.98)");
        
        ctx.fillStyle = btnGrad;
        ctx.beginPath();
        ctx.roundRect(x, y, btnW, btnH, cornerRadius);
        ctx.fill();
        
        // Reset skugga
        ctx.shadowBlur = 0; 
        ctx.shadowOffsetY = 0;
        
        // Narrow glass sheen and colored energy rail.
        const shineGrad = ctx.createLinearGradient(x, y, x, y + btnH * 0.5);
        shineGrad.addColorStop(0, "rgba(255,255,255,0.12)");
        shineGrad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = shineGrad;
        ctx.beginPath();
        ctx.roundRect(x, y, btnW, btnH * 0.5, [cornerRadius, cornerRadius, 0, 0]);
        ctx.fill();
        
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 9;
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.roundRect(x, y + 8, 4, btnH - 16, 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Fine neutral border lets the accent carry the hierarchy.
        ctx.strokeStyle = "rgba(225,235,242,.18)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, btnW, btnH, cornerRadius);
        ctx.stroke();
        
        // Colored lower reflection, kept deliberately subtle.
        ctx.globalAlpha = .35;
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.roundRect(x + 10, y + btnH - 2, btnW - 20, 2, [0, 0, cornerRadius, cornerRadius]);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Ikon
        const iconX = x + 35;
        drawMenuGlyph(iconX, y + btnH/2, btnH * 0.22, btn.glyph, isCompleted, baseColor);
        
        // Text med skugga för läsbarhet
        ctx.fillStyle = "#FFF";
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 4;
        ctx.font = `700 ${(secondaryText ? btnH * 0.27 : btnH * 0.32) * accessibilitySettings.textScale}px 'Cinzel', serif`;
        ctx.textAlign = "left";
        ctx.fillText(buttonText, x + 60, y + (secondaryText ? btnH * 0.40 : btnH/2 + 2));
        ctx.shadowBlur = 0;

        if (secondaryText) {
            ctx.font = `600 ${btnH * 0.17}px sans-serif`;
            ctx.fillStyle = "rgba(205,216,224,.78)";
            ctx.textAlign = "left";
            ctx.fillText(secondaryText, x + 60, y + btnH * 0.70);
        }
        if (recentCalendar) {
            const dotGap = 11;
            const dotsStartX = x + btnW - 18 - dotGap * (recentCalendar.length - 1);
            recentCalendar.forEach((day, dayIndex) => {
                const dotX = dotsStartX + dayIndex * dotGap;
                const dotY = y + btnH * 0.70;
                ctx.beginPath();
                ctx.arc(dotX, dotY, day.today ? 4 : 3.2, 0, Math.PI * 2);
                ctx.fillStyle = day.completed ? "#FFD700" : "rgba(205,216,224,.28)";
                ctx.fill();
                if (day.today) { ctx.strokeStyle = "#FFF"; ctx.lineWidth = 1; ctx.stroke(); }
            });
        }
        
        // Campaign: visa totala stjärnor
        if (btn.name === 'LEVELS_EASY') {
            const allStars = calculateTotalStars();
            ctx.font = `600 ${btnH * 0.22}px sans-serif`;
            ctx.fillStyle = "#FFD700";
            ctx.textAlign = "right";
            let completedLevels = 0;
            CAMPAIGN_SET_NAMES.forEach((setName) => {
                (ALL_LEVEL_SETS[setName] || []).forEach((_, levelIndex) => { if (getStarsForLevel(setName, levelIndex) > 0) completedLevels++; });
            });
            ctx.fillText(`${completedLevels}/100 · ★ ${allStars}`, x + btnW - 20, y + btnH/2 + 2);
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
    ctx.fillText("A GAMEVOLT ORIGINAL", w / 2, h - 30);
    ctx.font = `400 12px sans-serif`;
    ctx.fillStyle = "#444";
    ctx.fillText("v1.2.0", w / 2, h - 12);
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
