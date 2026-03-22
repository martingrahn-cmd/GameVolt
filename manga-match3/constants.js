/* ── Constants & Level Data ── */

export const BOARD_SIZE = 8;
export const BASE_POINTS = 100;
export const MOOD_VARIANTS = 3;
export const TIMING = {
  SWAP_MS: 205,
  INVALID_MS: 220,
  CLEAR_MS: 320,
  SPAWN_MS: 440,
  CASCADE_MS: 140,
  GRAVITY_FALL_MS: 168,
  GRAVITY_STEP_MS: 8,
  IMPACT_CHAIN_MS: 290,
  SWEEP_MS: 340,
  SCORE_POP_MS: 1050,
};

export const FEVER = {
  MAX_CHARGE: 100,
  TURNS: 5,
  SCORE_MULTIPLIER: 1.45,
};

export const DAILY_STORAGE_KEY = "manga-match-daily-v1";
export const PROGRESS_STORAGE_KEY = "manga-match-progress-v1";
export const TUTORIAL_STORAGE_KEY = "manga-match-tutorial-done-v1";
export const SHOP_STORAGE_KEY = "manga-match-shop-v1";
export const DAILY_CHALLENGE_VERSION = 2;

export const TILE_TYPES = [
  { id: "sakura", name: "Pink", icon: "🌸" },
  { id: "neko", name: "Blue", icon: "🔵" },
  { id: "sun", name: "Yellow", icon: "🌟" },
  { id: "ink", name: "Purple", icon: "🟣" },
  { id: "star", name: "Green", icon: "💚" },
  { id: "blade", name: "Orange", icon: "🔶" },
];

export const TILE_INDEX_BY_ID = Object.fromEntries(TILE_TYPES.map((tile, index) => [tile.id, index]));

export const SPECIAL = {
  LINE_H: "line-h",
  LINE_V: "line-v",
  BOMB: "bomb",
  COLOR: "color",
};

export const LEVELS = [
  // ── World 1: Basics (1-10) — score & collect, no obstacles ──
  { id: 1, name: "Academy Gate", moves: 30, goals: [{ type: "score", amount: 1000 }] },
  { id: 2, name: "Cherry Garden", moves: 30, goals: [{ type: "collect", tile: "sakura", amount: 6 }] },
  { id: 3, name: "Cat Café", moves: 28, goals: [{ type: "score", amount: 1400 }, { type: "collect", tile: "neko", amount: 8 }] },
  { id: 4, name: "Sunset Hill", moves: 28, goals: [{ type: "collect", tile: "sun", amount: 10 }] },
  { id: 5, name: "Star Festival", moves: 27, goals: [{ type: "score", amount: 1800 }, { type: "collect", tile: "star", amount: 8 }] },
  { id: 6, name: "Leaf Whirl Park", moves: 27, goals: [{ type: "collect", tile: "blade", amount: 10 }] },
  { id: 7, name: "Night Market", moves: 26, goals: [{ type: "score", amount: 2200 }, { type: "collect", tile: "neko", amount: 10 }] },
  { id: 8, name: "Moon Bridge", moves: 26, goals: [{ type: "collect", tile: "sakura", amount: 8 }, { type: "collect", tile: "star", amount: 8 }] },
  { id: 9, name: "Thousand Lanterns", moves: 25, goals: [{ type: "score", amount: 2600 }] },
  { id: 10, name: "Portal Trial", moves: 25, goals: [{ type: "score", amount: 2800 }, { type: "collect", tile: "sun", amount: 12 }] },
  // ── World 2: Ink & Locks (11-20) ──
  { id: 11, name: "Ink Alley", moves: 26, goals: [{ type: "score", amount: 2000 }, { type: "clear", obstacle: "ink", amount: 4 }], obstacleMap: ["........", "........", "...i....", "........", "....i...", "........", "........", "........"] },
  { id: 12, name: "Ink Rain", moves: 26, goals: [{ type: "clear", obstacle: "ink", amount: 6 }], obstacleMap: ["........", "..i..i..", "........", "........", "........", "........", "..i..i..", "........"] },
  { id: 13, name: "Dark River", moves: 25, goals: [{ type: "score", amount: 2400 }, { type: "clear", obstacle: "ink", amount: 6 }], obstacleMap: ["........", "..i..i..", "...ii...", "........", "........", "...ii...", "..i..i..", "........"] },
  { id: 14, name: "Sun Temple", moves: 25, goals: [{ type: "collect", tile: "sun", amount: 12 }, { type: "clear", obstacle: "ink", amount: 8 }], obstacleMap: ["........", ".i....i.", "..i..i..", "...ii...", "...ii...", "..i..i..", ".i....i.", "........"] },
  { id: 15, name: "Seal Hall", moves: 25, goals: [{ type: "unlock", amount: 4 }, { type: "score", amount: 2600 }], lockMap: ["........", "........", "...ll...", "........", "........", "...ll...", "........", "........"] },
  { id: 16, name: "Chain Chamber", moves: 24, goals: [{ type: "unlock", amount: 6 }], lockMap: ["........", "..l..l..", "........", "..l..l..", "..l..l..", "........", "..l..l..", "........"] },
  { id: 17, name: "Ink & Shackles", moves: 24, goals: [{ type: "unlock", amount: 4 }, { type: "clear", obstacle: "ink", amount: 6 }], obstacleMap: ["........", "...ii...", "........", "........", "........", "........", "...ii...", "........"], lockMap: ["........", "........", "..l..l..", "........", "........", "..l..l..", "........", "........"] },
  { id: 18, name: "Twin Towers", moves: 24, goals: [{ type: "score", amount: 3000 }, { type: "unlock", amount: 6 }, { type: "clear", obstacle: "ink", amount: 6 }], obstacleMap: ["........", "..i..i..", "........", "........", "........", "........", "..i..i..", "........"], lockMap: ["........", ".l....l.", "..l..l..", "........", "........", "..l..l..", ".l....l.", "........"] },
  { id: 19, name: "Dream Labyrinth", moves: 23, goals: [{ type: "collect", tile: "ink", amount: 12 }, { type: "clear", obstacle: "ink", amount: 8 }], obstacleMap: ["........", ".i....i.", "..i..i..", "........", "........", "..i..i..", ".i....i.", "........"] },
  { id: 20, name: "Portal Guardian", moves: 23, goals: [{ type: "score", amount: 3400 }, { type: "unlock", amount: 8 }], lockMap: ["..l..l..", "...ll...", "........", ".l....l.", ".l....l.", "........", "...ll...", "..l..l.."] },
  // ── World 3: Frames & Full Mix (21-30) ──
  { id: 21, name: "Panel Fortress", moves: 24, goals: [{ type: "clear", obstacle: "frame", amount: 4 }, { type: "score", amount: 2800 }], obstacleMap: ["........", "........", "...ff...", "........", "........", "...ff...", "........", "........"] },
  { id: 22, name: "Frame Ruins", moves: 23, goals: [{ type: "clear", obstacle: "frame", amount: 6 }], obstacleMap: ["........", "........", "..f..f..", "........", "........", "..f..f..", "........", "........"] },
  { id: 23, name: "Steel Panels", moves: 23, goals: [{ type: "clear", obstacle: "frame", amount: 6 }, { type: "clear", obstacle: "ink", amount: 4 }], obstacleMap: ["........", "..f..f..", "........", "...ii...", "...ii...", "........", "..f..f..", "........"] },
  { id: 24, name: "Mecha Manga", moves: 22, goals: [{ type: "clear", obstacle: "frame", amount: 8 }, { type: "clear", obstacle: "ink", amount: 6 }], obstacleMap: [".i....i.", "...ff...", "..f..f..", ".f.ii.f.", ".f.ii.f.", "..f..f..", "...ff...", ".i....i."] },
  { id: 25, name: "Prison Island", moves: 22, goals: [{ type: "unlock", amount: 6 }, { type: "clear", obstacle: "frame", amount: 6 }], obstacleMap: ["........", "...ff...", "..f..f..", "........", "........", "..f..f..", "...ff...", "........"], lockMap: ["........", "........", "........", "..l..l..", "..l..l..", "........", "........", "........"] },
  { id: 26, name: "Shadow Palace", moves: 21, goals: [{ type: "score", amount: 3800 }, { type: "clear", obstacle: "ink", amount: 8 }, { type: "unlock", amount: 6 }], obstacleMap: ["........", ".i....i.", "..i..i..", "...ii...", "...ii...", "..i..i..", ".i....i.", "........"], lockMap: ["........", "........", ".l....l.", "........", "........", ".l....l.", "........", "........"] },
  { id: 27, name: "Shogun's Gate", moves: 21, goals: [{ type: "unlock", amount: 7 }, { type: "clear", obstacle: "frame", amount: 8 }, { type: "score", amount: 4200 }], obstacleMap: ["i..ff..i", ".i....i.", "..fiif..", ".f....f.", ".f....f.", "..fiif..", ".i....i.", "i..ff..i"], lockMap: ["........", "..l..l..", ".l....l.", "........", "........", ".l....l.", "..l..l..", "........"] },
  { id: 28, name: "Chaos Library", moves: 20, goals: [{ type: "collect", tile: "star", amount: 14 }, { type: "clear", obstacle: "frame", amount: 8 }, { type: "clear", obstacle: "ink", amount: 8 }], obstacleMap: ["..f..f..", ".i....i.", "f..ii..f", "........", "........", "f..ii..f", ".i....i.", "..f..f.."] },
  { id: 29, name: "Demon King", moves: 20, goals: [{ type: "score", amount: 5000 }, { type: "unlock", amount: 8 }, { type: "clear", obstacle: "frame", amount: 8 }], obstacleMap: [".f.ff.f.", "........", "f......f", ".f.ii.f.", ".f.ii.f.", "f......f", "........", ".f.ff.f."], lockMap: ["........", ".l.ll.l.", "........", "........", "........", "........", ".l.ll.l.", "........"] },
  { id: 30, name: "Final Panel", moves: 19, goals: [{ type: "score", amount: 5600 }, { type: "collect", tile: "star", amount: 14 }, { type: "clear", obstacle: "frame", amount: 10 }, { type: "unlock", amount: 8 }], obstacleMap: ["if.ff.fi", ".i....i.", "ff....ff", ".f.iif..", ".f.iif..", "ff....ff", ".i....i.", "if.ff.fi"], lockMap: ["..l..l..", "...ll...", "........", ".l....l.", ".l....l.", "........", "...ll...", "........"] },
];

export const POWERUPS = [
  { id: "ink_blast", name: "Manga Ink", icon: "墨", desc: "Destroy all tiles of a chosen color", cost: 80, type: "active" },
  { id: "extra_moves", name: "Time Skip", icon: "+3", desc: "+3 extra moves", cost: 60, type: "pre" },
  { id: "fever_start", name: "Shōnen Boost", icon: "炎", desc: "Start with 50% fever", cost: 100, type: "pre" },
  { id: "bomb_3x3", name: "Panel Breaker", icon: "💥", desc: "Destroy a 3×3 area", cost: 120, type: "active" },
  { id: "sensei", name: "Sensei Eye", icon: "目", desc: "Show best move for 10s", cost: 40, type: "active" },
];

export const COIN_REWARDS = {
  STAR_1: 50,
  STAR_2: 80,
  STAR_3: 150,
  DAILY_BASE: 100,
  DAILY_STREAK_BONUS: 30,
};
