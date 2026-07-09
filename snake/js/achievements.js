// ============================================================
// Snake — Trophy / Achievement system
// 31 trophies (15 bronze / 10 silver / 5 gold / 1 platinum).
// Nokia 3310 mode earns exactly ONE trophy ("Blast from the Past");
// all other 29 skill trophies come from Neo + Fruit Chain (16-bit) runs.
// Grid UI mirrors Asteroid Storm. Cloud sync via the optional GameVolt SDK.
// ============================================================

const GAME_ID = "snake";
const STATS_KEY = "snake_stats";
const TROPHIES_KEY = "snake_trophies";

const TIER_COLORS = { bronze: "#cd7f32", silver: "#c0c0c0", gold: "#ffd700", platinum: "#b4ffff" };

// id has NO "snake-" prefix locally; the SDK stores "<gameId>-<id>".
export const SN_TROPHIES = [
    // ── Bronze (15) ──
    { id: "first-game",      tier: "bronze", icon: "🐍", name: "First Slither",   desc: "Play your first game" },
    { id: "food-10",         tier: "bronze", icon: "🍎", name: "Snack Time",      desc: "Eat 10 food in a single game" },
    { id: "combo-2x",        tier: "bronze", icon: "⚡", name: "Picking Up Speed", desc: "Reach a 2× combo (Neo)" },
    { id: "level-2",         tier: "bronze", icon: "🚪", name: "Getting Going",   desc: "Clear level 2 (Neo campaign)" },
    { id: "chain-5",         tier: "bronze", icon: "🔗", name: "Nice!",           desc: "Reach a 5-chain (Fruit Chain)" },
    { id: "lockin-first",    tier: "bronze", icon: "🔒", name: "Locked In",       desc: "Land your first lock-in (Fruit Chain)" },
    { id: "played-3310",     tier: "bronze", icon: "📟", name: "Blast from the Past", desc: "Play a round in Nokia 3310 mode" },
    { id: "survive-60",      tier: "bronze", icon: "⏱️", name: "One Minute",      desc: "Survive 60 seconds in a game" },
    { id: "score-1000",      tier: "bronze", icon: "💯", name: "Four Figures",    desc: "Score 1,000 in a single game" },
    { id: "accuracy-80",     tier: "bronze", icon: "🎯", name: "Sharp Eye",       desc: "Finish a Fruit Chain run at 80%+ accuracy" },
    { id: "level-5",         tier: "bronze", icon: "🧗", name: "Halfway There",   desc: "Clear level 5 (Neo campaign)" },
    { id: "chain-10",        tier: "bronze", icon: "🔥", name: "Great!",          desc: "Reach a 10-chain (Fruit Chain)" },
    { id: "games-5",         tier: "bronze", icon: "🎮", name: "Regular",         desc: "Play 5 games" },
    { id: "both-modes",      tier: "bronze", icon: "🔀", name: "Skin Collector",  desc: "Play both Neo and Fruit Chain" },
    { id: "food-total-250",  tier: "bronze", icon: "🐛", name: "Big Appetite",    desc: "Eat 250 food total" },
    // ── Silver (10) ──
    { id: "combo-3x",        tier: "silver", icon: "⚡", name: "Combo Master",    desc: "Reach the max 3× combo (Neo)" },
    { id: "food-50",         tier: "silver", icon: "🍽️", name: "Glutton",         desc: "Eat 50 food in a single game" },
    { id: "chain-15",        tier: "silver", icon: "💎", name: "Amazing!",        desc: "Reach a 15-chain (Fruit Chain)" },
    { id: "level-10",        tier: "silver", icon: "🏁", name: "Campaign Clear",  desc: "Clear all 10 Neo levels" },
    { id: "score-5000",      tier: "silver", icon: "🚀", name: "High Roller",     desc: "Score 5,000 in a single game" },
    { id: "survive-180",     tier: "silver", icon: "🕰️", name: "Marathon",        desc: "Survive 3 minutes in a game" },
    { id: "accuracy-95",     tier: "silver", icon: "🦅", name: "Eagle Eye",       desc: "Finish a Fruit Chain run at 95%+ accuracy" },
    { id: "lockin-10",       tier: "silver", icon: "🗝️", name: "Lockmaster",      desc: "Land 10 lock-ins in a single game (Fruit Chain)" },
    { id: "games-25",        tier: "silver", icon: "🏅", name: "Dedicated",       desc: "Play 25 games" },
    { id: "chain-20",        tier: "silver", icon: "🌟", name: "Incredible!",     desc: "Reach a 20-chain (Fruit Chain)" },
    // ── Gold (5) ──
    { id: "score-15000",     tier: "gold",   icon: "👑", name: "Legend",          desc: "Score 15,000 in a single game" },
    { id: "chain-25",        tier: "gold",   icon: "🔥", name: "Fever Pitch",     desc: "Reach a 25-chain — FEVER (Fruit Chain)" },
    { id: "food-100",        tier: "gold",   icon: "🐍", name: "Anaconda",        desc: "Eat 100 food in a single game" },
    { id: "accuracy-100",    tier: "gold",   icon: "✨", name: "Flawless",        desc: "Finish a Fruit Chain run (20+ fruits) at 100% accuracy" },
    { id: "games-100",       tier: "gold",   icon: "🎖️", name: "Snake Charmer",   desc: "Play 100 games" },
    // ── Platinum (1) ──
    { id: "master",          tier: "platinum", icon: "🏆", name: "Snake Master",  desc: "Unlock all 30 other trophies" },
];

const PLATINUM_ID = "master";

// ── Persistence ──
function loadStats() {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return {
        gamesPlayed: 0, totalFood: 0,
        playedNeo: false, played16bit: false, played3310: false,
    };
}
function saveStats(s) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
}
function loadTrophies() {
    try {
        const raw = localStorage.getItem(TROPHIES_KEY);
        if (raw) return new Set(JSON.parse(raw));
    } catch (e) { /* ignore */ }
    return new Set();
}
function saveTrophies(set) {
    try { localStorage.setItem(TROPHIES_KEY, JSON.stringify(Array.from(set))); } catch (e) { /* ignore */ }
}

let snStats = loadStats();
let snTrophies = loadTrophies();

function unlock(id) {
    if (snTrophies.has(id)) return false;
    snTrophies.add(id);
    saveTrophies(snTrophies);
    try { if (window.GameVolt && window.GameVolt.achievements) window.GameVolt.achievements.unlock(id); } catch (e) { /* offline */ }
    // In-game toast + chime (SDK queues multiple unlocks and shows them one by one)
    try {
        if (window.GameVolt && window.GameVolt.ui && window.GameVolt.ui.achievementToast) {
            const t = SN_TROPHIES.find(t => t.id === id);
            if (t) window.GameVolt.ui.achievementToast({ icon: t.icon, name: t.name, tier: t.tier });
        }
    } catch (e) { /* ignore */ }
    return true;
}

// ── Unlock condition checks (read the current run + lifetime stats) ──
// A check returns true when the trophy should be unlocked.
function buildChecks(r) {
    // r = normalized run view: score, food, timeSec, maxCombo, levelsCompleted,
    //     bestChain, roundsCompleted, accuracy, fruitsEaten
    return {
        "first-game":     () => snStats.gamesPlayed >= 1,
        "food-10":        () => r.food >= 10,
        "combo-2x":       () => r.maxCombo >= 2,
        "level-2":        () => r.levelsCompleted >= 2,
        "chain-5":        () => r.bestChain >= 5,
        "lockin-first":   () => r.roundsCompleted >= 1,
        "played-3310":    () => snStats.played3310 === true,
        "survive-60":     () => r.timeSec >= 60,
        "score-1000":     () => r.score >= 1000,
        "accuracy-80":    () => r.fruitsEaten >= 10 && r.accuracy >= 80,
        "level-5":        () => r.levelsCompleted >= 5,
        "chain-10":       () => r.bestChain >= 10,
        "games-5":        () => snStats.gamesPlayed >= 5,
        "both-modes":     () => snStats.playedNeo && snStats.played16bit,
        "food-total-250": () => snStats.totalFood >= 250,
        "combo-3x":       () => r.maxCombo >= 4,
        "food-50":        () => r.food >= 50,
        "chain-15":       () => r.bestChain >= 15,
        "level-10":       () => r.levelsCompleted >= 10,
        "score-5000":     () => r.score >= 5000,
        "survive-180":    () => r.timeSec >= 180,
        "accuracy-95":    () => r.fruitsEaten >= 15 && r.accuracy >= 95,
        "lockin-10":      () => r.roundsCompleted >= 10,
        "games-25":       () => snStats.gamesPlayed >= 25,
        "chain-20":       () => r.bestChain >= 20,
        "score-15000":    () => r.score >= 15000,
        "chain-25":       () => r.bestChain >= 25,
        "food-100":       () => r.food >= 100,
        "accuracy-100":   () => r.fruitsEaten >= 20 && r.accuracy >= 100,
        "games-100":      () => snStats.gamesPlayed >= 100,
    };
}

// Called at game over. mode = 'neo' | 'nokia' | '16bit'. stats = getFinalStats() output.
export function recordRun(mode, stats) {
    stats = stats || {};

    // Nokia earns ONLY the nostalgia trophy — no skill stats, no other checks.
    if (mode === "nokia") {
        if (!snStats.played3310) { snStats.played3310 = true; saveStats(snStats); }
        unlock("played-3310");
        checkPlatinum();
        return;
    }

    // Neo / Fruit Chain: update lifetime stats.
    const food = (stats.foodEaten != null ? stats.foodEaten : (stats.fruitsEaten || 0)) | 0;
    snStats.gamesPlayed = (snStats.gamesPlayed || 0) + 1;
    snStats.totalFood = (snStats.totalFood || 0) + food;
    if (mode === "neo") snStats.playedNeo = true;
    if (mode === "16bit") snStats.played16bit = true;
    saveStats(snStats);

    const r = {
        score: stats.score || 0,
        food: food,
        timeSec: stats.totalTimeSeconds || 0,
        maxCombo: stats.maxCombo || 0,
        levelsCompleted: stats.levelsCompleted || 0,
        bestChain: stats.bestChain || 0,
        roundsCompleted: stats.roundsCompleted || 0,
        accuracy: stats.accuracy || 0,
        fruitsEaten: stats.fruitsEaten || 0,
    };

    const checks = buildChecks(r);
    for (const t of SN_TROPHIES) {
        if (t.id === PLATINUM_ID) continue;
        if (snTrophies.has(t.id)) continue;
        const check = checks[t.id];
        if (check && check()) unlock(t.id);
    }
    checkPlatinum();
}

function checkPlatinum() {
    if (snTrophies.has(PLATINUM_ID)) return;
    // 30 non-platinum trophies exist; unlock platinum when all are done.
    if (snTrophies.size >= SN_TROPHIES.length - 1) unlock(PLATINUM_ID);
}

export function getUnlockedSet() { return new Set(snTrophies); }

// ── SDK init + cloud migration (optional; all guarded) ──
export function initSnakeAchievements() {
    if (!window.GameVolt) return;
    try { window.GameVolt.init(GAME_ID); } catch (e) { /* ignore */ }
    try {
        if (window.GameVolt.save && window.GameVolt.save.registerMigration) {
            window.GameVolt.save.registerMigration(function (cloud) {
                cloud = cloud || {};
                // merge lifetime stats (take max) + union trophies
                const merged = Object.assign({}, cloud.snake_stats || {}, {});
                const local = snStats;
                merged.gamesPlayed = Math.max(merged.gamesPlayed || 0, local.gamesPlayed || 0);
                merged.totalFood = Math.max(merged.totalFood || 0, local.totalFood || 0);
                merged.playedNeo = !!(merged.playedNeo || local.playedNeo);
                merged.played16bit = !!(merged.played16bit || local.played16bit);
                merged.played3310 = !!(merged.played3310 || local.played3310);
                const union = new Set([...(cloud.snake_trophies || []), ...snTrophies]);
                snStats = merged; saveStats(snStats);
                snTrophies = union; saveTrophies(snTrophies);
                // push any locally-unlocked trophies to the cloud
                try { for (const id of snTrophies) window.GameVolt.achievements.unlock(id); } catch (e) { /* ignore */ }
                return { snake_stats: merged, snake_trophies: Array.from(union) };
            });
        }
    } catch (e) { /* ignore */ }
}

// ============================================================
// Achievements grid screen (DOM overlay, Asteroid-Storm style)
// ============================================================
export class AchievementsScreen {
    constructor() { this.element = null; this._keyHandler = null; }

    show(onClose) {
        this.onClose = onClose || null;
        const unlocked = snTrophies;
        const total = SN_TROPHIES.length;
        const got = SN_TROPHIES.filter(t => unlocked.has(t.id)).length;

        const div = document.createElement("div");
        div.id = "snakeAchievements";
        div.innerHTML = this._render(got, total, unlocked);
        document.body.appendChild(div);
        this.element = div;

        div.querySelector(".sn-ach-close").addEventListener("click", () => this.hide());
        div.addEventListener("click", (e) => { if (e.target === div) this.hide(); });
        this._keyHandler = (e) => { if (e.key === "Escape") { e.preventDefault(); this.hide(); } };
        window.addEventListener("keydown", this._keyHandler);
    }

    hide() {
        if (this._keyHandler) window.removeEventListener("keydown", this._keyHandler);
        this._keyHandler = null;
        if (this.element) { this.element.remove(); this.element = null; }
        if (this.onClose) this.onClose();
    }

    _render(got, total, unlocked) {
        const tiers = ["bronze", "silver", "gold", "platinum"];
        let sections = "";
        for (const tier of tiers) {
            const list = SN_TROPHIES.filter(t => t.tier === tier);
            if (!list.length) continue;
            const col = TIER_COLORS[tier];
            const nUnlocked = list.filter(t => unlocked.has(t.id)).length;
            sections += `<div class="sn-ach-tier-h" style="color:${col};border-color:${col}66">${tier.toUpperCase()} · ${nUnlocked}/${list.length}</div>`;
            sections += `<div class="sn-ach-grid">`;
            for (const t of list) {
                const on = unlocked.has(t.id);
                sections += `
                    <div class="sn-ach-card${on ? " on" : " off"}">
                        <div class="sn-ach-icon">${on ? t.icon : "🔒"}</div>
                        <div class="sn-ach-name">${this._esc(t.name)}</div>
                        <div class="sn-ach-desc">${on ? this._esc(t.desc) : "???"}</div>
                        <div class="sn-ach-tier" style="color:${col}">${t.tier}</div>
                    </div>`;
            }
            sections += `</div>`;
        }
        return `
            <style>
                #snakeAchievements{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;
                    background:rgba(0,0,0,0.92);font-family:'Press Start 2P','Courier New',monospace;padding:16px;box-sizing:border-box}
                #snakeAchievements .sn-ach-panel{width:100%;max-width:720px;max-height:86vh;display:flex;flex-direction:column;
                    background:rgba(6,12,24,0.96);border:1px solid rgba(0,255,255,0.25);border-radius:12px;
                    box-shadow:0 0 40px rgba(0,255,255,0.12);overflow:hidden}
                #snakeAchievements .sn-ach-top{display:flex;align-items:center;justify-content:space-between;
                    padding:16px 18px;border-bottom:1px solid rgba(0,255,255,0.15)}
                #snakeAchievements .sn-ach-title{color:#0ff;font-size:14px;text-shadow:0 0 10px #0ff;letter-spacing:1px}
                #snakeAchievements .sn-ach-count{color:#a0a4c0;font-size:9px}
                #snakeAchievements .sn-ach-close{background:rgba(0,255,255,0.1);border:1px solid rgba(0,255,255,0.35);
                    color:#0ff;font-family:inherit;font-size:9px;padding:8px 12px;border-radius:6px;cursor:pointer}
                #snakeAchievements .sn-ach-close:hover{background:rgba(0,255,255,0.2)}
                #snakeAchievements .sn-ach-body{overflow-y:auto;padding:14px 18px;-webkit-overflow-scrolling:touch}
                #snakeAchievements .sn-ach-tier-h{font-size:9px;font-weight:700;letter-spacing:3px;margin:14px 0 8px;
                    padding-bottom:5px;border-bottom:1px solid}
                #snakeAchievements .sn-ach-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
                #snakeAchievements .sn-ach-card{display:flex;flex-direction:column;gap:5px;padding:12px;border-radius:8px;
                    background:rgba(0,20,40,0.6);border:1px solid rgba(0,255,255,0.12);min-height:78px}
                #snakeAchievements .sn-ach-card.on{background:rgba(0,30,50,0.7);border-color:rgba(0,255,255,0.3)}
                #snakeAchievements .sn-ach-card.off{opacity:0.4}
                #snakeAchievements .sn-ach-icon{font-size:18px;line-height:1}
                #snakeAchievements .sn-ach-name{color:#f0f0ff;font-size:9px;line-height:1.3}
                #snakeAchievements .sn-ach-desc{color:#a0a4c0;font-size:7px;line-height:1.4;flex:1}
                #snakeAchievements .sn-ach-tier{font-size:7px;font-weight:700;letter-spacing:2px;text-transform:uppercase}
                @media(max-width:560px){#snakeAchievements .sn-ach-grid{grid-template-columns:repeat(2,1fr)}}
            </style>
            <div class="sn-ach-panel">
                <div class="sn-ach-top">
                    <div>
                        <div class="sn-ach-title">🏆 TROPHIES</div>
                        <div class="sn-ach-count">${got} / ${total} unlocked</div>
                    </div>
                    <button class="sn-ach-close">BACK</button>
                </div>
                <div class="sn-ach-body">${sections}</div>
            </div>`;
    }

    _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
}

// ============================================================
// High Scores screen — LOCAL (this device, per mode) + GLOBAL
// (windowed Supabase leaderboard via the optional GameVolt SDK).
// Mirrors the Vector Hexagon / Asteroid Storm layout.
// ============================================================
const HS_PAGE = 10;
const HS_BOARDS = [
    { key: "neo",   label: "NEO SYNTHWAVE", col: "#ff1dac", mode: "default" },
    { key: "16bit", label: "FRUIT CHAIN",   col: "#ffd700", mode: "fruit-chain" },
    { key: "nokia", label: "NOKIA 3310",    col: "#9acd32", mode: "nokia" },
];

export class HighScoresScreen {
    constructor() {
        this.element = null;
        this._keyHandler = null;
        this.tab = "local";
        this.board = 0;
        this.offset = 0;
        this.total = 0;
        this.reqId = 0;
    }

    show(onClose) {
        this.onClose = onClose || null;
        const div = document.createElement("div");
        div.id = "snakeHighScores";
        div.innerHTML = `
            <style>
                #snakeHighScores{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;
                    background:rgba(0,0,0,0.92);font-family:'Press Start 2P','Courier New',monospace;padding:16px;box-sizing:border-box}
                #snakeHighScores .sn-hs-panel{width:100%;max-width:460px;max-height:86vh;display:flex;flex-direction:column;
                    background:rgba(6,12,24,0.96);border:1px solid rgba(0,255,255,0.25);border-radius:12px;
                    box-shadow:0 0 40px rgba(0,255,255,0.12);overflow:hidden}
                #snakeHighScores .sn-hs-top{display:flex;align-items:center;justify-content:space-between;
                    padding:16px 18px;border-bottom:1px solid rgba(0,255,255,0.15)}
                #snakeHighScores .sn-hs-title{color:#0ff;font-size:13px;text-shadow:0 0 10px #0ff;letter-spacing:1px}
                #snakeHighScores .sn-hs-close{background:rgba(0,255,255,0.1);border:1px solid rgba(0,255,255,0.35);
                    color:#0ff;font-family:inherit;font-size:9px;padding:8px 12px;border-radius:6px;cursor:pointer}
                #snakeHighScores .sn-hs-close:hover{background:rgba(0,255,255,0.2)}
                #snakeHighScores .sn-hs-tabs{display:flex;gap:8px;padding:12px 18px 0}
                #snakeHighScores .sn-hs-tab{flex:1;background:rgba(0,20,40,0.6);border:1px solid rgba(0,255,255,0.15);
                    color:#a0a4c0;font-family:inherit;font-size:9px;padding:9px 0;border-radius:6px;cursor:pointer;letter-spacing:2px}
                #snakeHighScores .sn-hs-tab.sel{background:rgba(0,255,255,0.12);border-color:rgba(0,255,255,0.45);color:#0ff}
                #snakeHighScores .sn-hs-board{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 18px 0}
                #snakeHighScores .sn-hs-arrow{background:rgba(0,255,255,0.08);border:1px solid rgba(0,255,255,0.3);
                    color:#0ff;font-family:inherit;font-size:10px;padding:8px 12px;border-radius:6px;cursor:pointer}
                #snakeHighScores .sn-hs-boardname{flex:1;text-align:center;font-size:10px;letter-spacing:2px}
                #snakeHighScores .sn-hs-acts{display:flex;flex-wrap:wrap;gap:6px;padding:10px 18px 0}
                #snakeHighScores .sn-hs-act{background:rgba(0,20,40,0.6);border:1px solid rgba(0,255,255,0.15);
                    color:#a0a4c0;font-family:inherit;font-size:7px;padding:7px 9px;border-radius:6px;cursor:pointer;letter-spacing:1px}
                #snakeHighScores .sn-hs-act:hover{color:#0ff;border-color:rgba(0,255,255,0.4)}
                #snakeHighScores .sn-hs-body{overflow-y:auto;padding:10px 18px 14px;min-height:220px;-webkit-overflow-scrolling:touch}
                #snakeHighScores .sn-hs-row{display:flex;justify-content:space-between;align-items:center;gap:8px;
                    padding:7px 10px;border-radius:6px;background:rgba(0,20,40,0.5);margin-bottom:5px}
                #snakeHighScores .sn-hs-row.me{background:rgba(0,255,255,0.1);border:1px solid rgba(0,255,255,0.35)}
                #snakeHighScores .sn-hs-rank{color:#a0a4c0;font-size:9px;flex-shrink:0}
                #snakeHighScores .sn-hs-name{color:#f0f0ff;font-size:8px;flex:1;min-width:0;overflow:hidden;
                    text-overflow:ellipsis;white-space:nowrap}
                #snakeHighScores .sn-hs-date{color:#626580;font-size:7px;flex:1;text-align:left}
                #snakeHighScores .sn-hs-score{color:#0ff;font-size:9px;flex-shrink:0}
                #snakeHighScores .sn-hs-empty{color:#626580;font-size:8px;padding:14px 10px;line-height:1.6;text-align:center}
                #snakeHighScores .sn-hs-total{color:#626580;font-size:7px;padding:0 18px 14px;text-align:center;letter-spacing:1px}
            </style>
            <div class="sn-hs-panel">
                <div class="sn-hs-top">
                    <div class="sn-hs-title">🥇 HIGH SCORES</div>
                    <button class="sn-hs-close">BACK</button>
                </div>
                <div class="sn-hs-tabs">
                    <button class="sn-hs-tab sel" data-tab="local">LOCAL</button>
                    <button class="sn-hs-tab" data-tab="global">GLOBAL</button>
                </div>
                <div class="sn-hs-board">
                    <button class="sn-hs-arrow" data-nav="-1">◀</button>
                    <div class="sn-hs-boardname"></div>
                    <button class="sn-hs-arrow" data-nav="1">▶</button>
                </div>
                <div class="sn-hs-acts" style="display:none">
                    <button class="sn-hs-act" data-act="top">⏮ TOP</button>
                    <button class="sn-hs-act" data-act="me">◎ AROUND ME</button>
                    <button class="sn-hs-act" data-act="prev">◀ −${HS_PAGE}</button>
                    <button class="sn-hs-act" data-act="next">+${HS_PAGE} ▶</button>
                </div>
                <div class="sn-hs-body"></div>
                <div class="sn-hs-total"></div>
            </div>`;
        document.body.appendChild(div);
        this.element = div;

        div.querySelector(".sn-hs-close").addEventListener("click", () => this.hide());
        div.addEventListener("click", (e) => { if (e.target === div) this.hide(); });
        div.querySelectorAll(".sn-hs-tab").forEach(b =>
            b.addEventListener("click", () => this._setTab(b.dataset.tab)));
        div.querySelectorAll(".sn-hs-arrow").forEach(b =>
            b.addEventListener("click", () => this._moveBoard(parseInt(b.dataset.nav, 10))));
        div.querySelectorAll(".sn-hs-act").forEach(b =>
            b.addEventListener("click", () => this._act(b.dataset.act)));
        this._keyHandler = (e) => { if (e.key === "Escape") { e.preventDefault(); this.hide(); } };
        window.addEventListener("keydown", this._keyHandler);

        this._setTab("local");
    }

    hide() {
        if (this._keyHandler) window.removeEventListener("keydown", this._keyHandler);
        this._keyHandler = null;
        this.reqId++; // invalidate in-flight leaderboard requests
        if (this.element) { this.element.remove(); this.element = null; }
        if (this.onClose) this.onClose();
    }

    _hasLB() {
        return !!(window.GameVolt && window.GameVolt.leaderboard && window.GameVolt.leaderboard.page);
    }

    _setTab(t) {
        this.tab = t;
        this.element.querySelectorAll(".sn-hs-tab").forEach(b =>
            b.classList.toggle("sel", b.dataset.tab === t));
        this.element.querySelector(".sn-hs-acts").style.display = t === "global" ? "flex" : "none";
        this.offset = 0;
        this._refresh();
    }

    _moveBoard(d) {
        this.board = (this.board + d + HS_BOARDS.length) % HS_BOARDS.length;
        this.offset = 0;
        this._refresh();
    }

    _refresh() {
        const b = HS_BOARDS[this.board];
        const nameEl = this.element.querySelector(".sn-hs-boardname");
        nameEl.textContent = b.label;
        nameEl.style.color = b.col;
        if (this.tab === "local") this._renderLocal();
        else this._loadGlobal();
    }

    _renderLocal() {
        const body = this.element.querySelector(".sn-hs-body");
        this.element.querySelector(".sn-hs-total").textContent = "";
        const scores = this._read("snakeHighscores_" + HS_BOARDS[this.board].key).slice(0, 10);
        if (!scores.length) {
            body.innerHTML = `<div class="sn-hs-empty">NO SCORES YET<br>Play a game to set one!</div>`;
            return;
        }
        body.innerHTML = scores.map((s, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "&nbsp;&nbsp;";
            const d = s.date ? new Date(s.date) : null;
            const dateStr = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
            return `<div class="sn-hs-row"><span class="sn-hs-rank">${medal} ${i + 1}</span>` +
                `<span class="sn-hs-date">${dateStr}</span>` +
                `<span class="sn-hs-score">${Number(s.score || 0).toLocaleString()}</span></div>`;
        }).join("");
    }

    _loadGlobal() {
        const body = this.element.querySelector(".sn-hs-body");
        const totalEl = this.element.querySelector(".sn-hs-total");
        if (!this._hasLB()) {
            body.innerHTML = `<div class="sn-hs-empty">Play on GameVolt.io to see<br>the global leaderboard.</div>`;
            totalEl.textContent = "";
            return;
        }
        const mode = HS_BOARDS[this.board].mode;
        const myId = window.GameVolt.leaderboard.userId ? window.GameVolt.leaderboard.userId() : null;
        const req = ++this.reqId;
        body.innerHTML = `<div class="sn-hs-empty">LOADING…</div>`;
        window.GameVolt.leaderboard.count({ mode }).then(n => {
            if (req !== this.reqId || !this.element) return;
            this.total = n | 0;
            totalEl.textContent = n > 0 ? n.toLocaleString() + " PLAYERS" : "";
        });
        window.GameVolt.leaderboard.page({ mode, offset: this.offset, limit: HS_PAGE }).then(rows => {
            if (req !== this.reqId || !this.element) return;
            if (!rows.length) {
                body.innerHTML = `<div class="sn-hs-empty">No scores on this board yet<br>— be the first!</div>`;
                return;
            }
            body.innerHTML = rows.map(r => {
                const me = myId && r.user_id === myId;
                const name = this._esc(String(r.username || "player").slice(0, 20));
                return `<div class="sn-hs-row${me ? " me" : ""}">` +
                    `<span class="sn-hs-rank">#${r.rank}</span>` +
                    `<span class="sn-hs-name">${name}${me ? " (YOU)" : ""}</span>` +
                    `<span class="sn-hs-score">${Number(r.score || 0).toLocaleString()}</span></div>`;
            }).join("");
        });
    }

    _act(a) {
        if (!this._hasLB()) return;
        if (a === "top") { this.offset = 0; this._loadGlobal(); }
        else if (a === "me") {
            window.GameVolt.leaderboard.myRank({ mode: HS_BOARDS[this.board].mode }).then(r => {
                if (!this.element) return;
                this.offset = r ? Math.max(0, r.rank - Math.floor(HS_PAGE / 2)) : 0;
                this._loadGlobal();
            });
        }
        else if (a === "prev") { this.offset = Math.max(0, this.offset - HS_PAGE); this._loadGlobal(); }
        else if (a === "next") {
            const max = this.total > 0 ? Math.max(0, this.total - 1) : this.offset + HS_PAGE;
            this.offset = Math.min(this.offset + HS_PAGE, max);
            this._loadGlobal();
        }
    }

    _read(key) {
        try {
            const raw = localStorage.getItem(key);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    }

    _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
}
