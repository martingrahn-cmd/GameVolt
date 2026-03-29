// src/js/config.js

export const CONFIG = {
  COLS: 11, ROWS: 11,
  HUD: { HEIGHT: 100 },
  COLORS: { 
      bg: "#1a1a1a",
      grid: "#333",
      piece: "#4CAF50",
      placed: "#2E7D32",
      hover: "rgba(255, 255, 255, 0.2)",
      bgLine: 'rgba(255, 255, 255, 0.05)' 
  },
  OFFSET_X: 20,
  OFFSET_Y: 20,
  PITCH: 50
};

// --- DINA ORIGINAL-FORMER (Detta fixar logiken!) ---
export const SHAPES = {
  "1": [[-1, -2], [-1, -1], [-1, 0], [0, 0]],
  "2": [[0, -2], [0, -1], [0, 0], [1, 1], [0, 1]],
  "3": [[0, -2], [1, -2], [0, -1], [0, 0], [-1, 0]], // 5 block! Fixar nivå 1/2.
  "4": [[0, 0], [1, 0], [1, 1], [2, 1]], 
  "5": [[0, -2], [0, -1], [0, 0], [0, 1], [1, 0]],
  "6": [[0, -1], [-1, 0], [0, 0], [1, 0]], 
  "7": [[0, -1], [0, 0], [0, 1], [0, 2]],
  "8": [[0, -1], [-1, 0], [0, 0]], // 3 block (Vinkel)! Fixar tutorial.
  "9": [[-1, -1], [0, -1], [0, 0], [-1, 0]],
  "10": [[0, -1], [1, 0], [0, 0], [1, -1], [0, 1]],
  "11": [[0, -1], [0, 0], [0, 1]],
  "12": [[0, 0], [0, 1]]
};

// --- FÄRGER ---
export const SHAPE_COLORS = { "1": "#E63946", "2": "#9B5DE5", "3": "#F15BB5", "4": "#FEE440", "5": "#00BBF9", "6": "#00F5D4", "7": "#8338EC", "8": "#FF9F1C", "9": "#FF006E", "10": "#3A86FF", "11": "#80FFDB", "12": "#FFFFFF" };

// SKINS - varje skin har 12 nyanser (en per form-typ)
// COLORS: { "1": färg, "2": färg, ... "12": färg }
// Priser: Billig 500, Medium 1500, Dyr 3500
export const SKINS = {
  "skin_default": { 
    name: "Classic Jade", 
    price: 0, 
    desc: "Original colors",
    COLORS: null // Använder SHAPE_COLORS
  },
  "skin_ruby": { 
    name: "Ruby Red", 
    price: 500, 
    desc: "Shades of passion",
    COLORS: { "1": "#FF1744", "2": "#F50057", "3": "#E91E63", "4": "#FF4081", "5": "#C2185B", "6": "#D81B60", "7": "#AD1457", "8": "#FF5252", "9": "#FF1744", "10": "#B71C1C", "11": "#E53935", "12": "#EF5350" }
  },
  "skin_ice": { 
    name: "Glacier", 
    price: 500, 
    desc: "Frozen depths",
    COLORS: { "1": "#00E5FF", "2": "#18FFFF", "3": "#00B8D4", "4": "#00BCD4", "5": "#26C6DA", "6": "#4DD0E1", "7": "#00ACC1", "8": "#0097A7", "9": "#00838F", "10": "#006064", "11": "#84FFFF", "12": "#B2EBF2" }
  },
  "skin_amethyst": { 
    name: "Amethyst", 
    price: 500, 
    desc: "Royal purple",
    COLORS: { "1": "#9C27B0", "2": "#AB47BC", "3": "#BA68C8", "4": "#CE93D8", "5": "#8E24AA", "6": "#7B1FA2", "7": "#6A1B9A", "8": "#E040FB", "9": "#EA80FC", "10": "#D500F9", "11": "#AA00FF", "12": "#E1BEE7" }
  },
  "skin_emerald": { 
    name: "Emerald", 
    price: 1500, 
    desc: "Forest gems",
    COLORS: { "1": "#00E676", "2": "#00C853", "3": "#4CAF50", "4": "#66BB6A", "5": "#43A047", "6": "#388E3C", "7": "#2E7D32", "8": "#1B5E20", "9": "#69F0AE", "10": "#A5D6A7", "11": "#81C784", "12": "#C8E6C9" }
  },
  "skin_rose": { 
    name: "Rose", 
    price: 1500, 
    desc: "Blushing petals",
    COLORS: { "1": "#FF80AB", "2": "#FF4081", "3": "#F48FB1", "4": "#F8BBD9", "5": "#EC407A", "6": "#D81B60", "7": "#FCE4EC", "8": "#FF69B4", "9": "#FF1493", "10": "#DB7093", "11": "#FFB6C1", "12": "#FFC0CB" }
  },
  "skin_magma": { 
    name: "Magma", 
    price: 1500, 
    desc: "Molten core",
    COLORS: { "1": "#FF3D00", "2": "#FF6E40", "3": "#FF5722", "4": "#FF9E80", "5": "#DD2C00", "6": "#FF6D00", "7": "#FF9100", "8": "#FFAB00", "9": "#FF8F00", "10": "#E65100", "11": "#BF360C", "12": "#FFAB40" }
  },
  "skin_ocean": { 
    name: "Ocean", 
    price: 3500, 
    desc: "Deep sea",
    COLORS: { "1": "#1565C0", "2": "#1976D2", "3": "#1E88E5", "4": "#2196F3", "5": "#42A5F5", "6": "#64B5F6", "7": "#0D47A1", "8": "#0277BD", "9": "#01579B", "10": "#039BE5", "11": "#03A9F4", "12": "#BBDEFB" }
  },
  "skin_obsidian": { 
    name: "Obsidian", 
    price: 3500, 
    desc: "Volcanic glass",
    COLORS: { "1": "#37474F", "2": "#455A64", "3": "#546E7A", "4": "#607D8B", "5": "#78909C", "6": "#90A4AE", "7": "#263238", "8": "#1C313A", "9": "#4F5B62", "10": "#29434E", "11": "#62727B", "12": "#B0BEC5" }
  },
  "skin_gold": { 
    name: "Midas", 
    price: 3500, 
    desc: "Pure gold",
    COLORS: { "1": "#FFD700", "2": "#FFC107", "3": "#FFCA28", "4": "#FFB300", "5": "#FFA000", "6": "#FF8F00", "7": "#FFE082", "8": "#FFD54F", "9": "#FFECB3", "10": "#FFE57F", "11": "#FFF176", "12": "#FFF8E1" }
  }
};

// TRAILS - 3-tier prissättning: Billig 400, Medium 1000, Dyr 2500
// trail_default är alltid aktiv och gratis - ger enkel juice
export const TRAILS = {
  "trail_default": { name: "Default",   price: 0,    icon: "✨", color: '#FFFFFF' },
  "trail_spark":   { name: "Sparkles",  price: 400,  icon: "⚡", color: '#FFD700' },
  "trail_hearts":  { name: "Hearts",    price: 400,  icon: "❤️", color: '#FF69B4' },
  "trail_bubbles": { name: "Bubbles",   price: 400,  icon: "🫧", color: '#87CEEB' },
  "trail_stars":   { name: "Stars",     price: 1000, icon: "⭐", color: '#FFFF00' },
  "trail_ice":     { name: "Frost",     price: 1000, icon: "❄️", color: '#00FFFF' },
  "trail_fire":    { name: "Fire",      price: 1000, icon: "🔥", color: '#FF4500' },
  "trail_sakura":  { name: "Sakura",    price: 2500, icon: "🌸", color: '#FFB7C5' },
  "trail_magic":   { name: "Magic",     price: 2500, icon: "🔮", color: '#9400D3' },
  "trail_rainbow": { name: "Rainbow",   price: 2500, icon: "🌈", color: 'RAINBOW' }
};

export const GLOWS = {
    "glow_none": { name: "No Glow", price: 0, color: "transparent", blur: 0 },
    "glow_soft": { name: "Soft Aura", price: 300, color: "rgba(255,255,255,0.6)", blur: 15 },
    "glow_neon": { name: "Neon Pulse", price: 1000, color: "rgba(0,255,255,0.9)", blur: 30 }
};

// WORLDS = Köpbara bakgrunder i shoppen
// "default" = Följer världen automatiskt (temple/ice/lava/cyber)
// Övriga = Ersätter bakgrunden på ALLA levels när equipped
export const WORLDS = {
    "default":    { src: null,                          name: "DEFAULT",   price: 0 },
    "bg_shop_1":  { src: "assets/gfx/bg_shop_1.webp",   name: "SPACE",     price: 500 },
    "bg_shop_2":  { src: "assets/gfx/bg_shop_2.webp",   name: "BLUEPRINT", price: 1000 },
    "bg_shop_3":  { src: "assets/gfx/bg_shop_3.webp",   name: "PORTAL",    price: 1500 },
    "bg_shop_4":  { src: "assets/gfx/bg_shop_4.webp",   name: "SUNSET",    price: 2000 },
    "bg_shop_5":  { src: "assets/gfx/bg_shop_5.webp",   name: "RETRO",     price: 2500 },
    "bg_shop_6":  { src: "assets/gfx/bg_shop_6.webp",   name: "MARBLE",    price: 3000 },
    "bg_shop_7":  { src: "assets/gfx/bg_shop_7.webp",   name: "JUNGLE",    price: 1500 }
};

// ACHIEVEMENTS — 31 st: 15 bronze, 10 silver, 5 gold, 1 platinum
export const ACHIEVEMENTS = {
    // === BRONZE (15) ===
    "ach_first_win":      { name: "First Steps",    desc: "Complete your first level",               tier: "bronze", icon: "🏛️" },
    "ach_win_5":          { name: "Getting Started", desc: "Complete 5 levels",                       tier: "bronze", icon: "📜" },
    "ach_win_10":         { name: "Apprentice",      desc: "Complete 10 levels",                      tier: "bronze", icon: "🎓" },
    "ach_stars_10":       { name: "Star Collector",  desc: "Earn 10 stars",                           tier: "bronze", icon: "⭐" },
    "ach_stars_30":       { name: "Shiny!",          desc: "Earn 30 stars",                           tier: "bronze", icon: "✨" },
    "ach_visit_shop":     { name: "Window Shopper",  desc: "Visit the shop",                          tier: "bronze", icon: "🛒" },
    "ach_first_cosmetic": { name: "New Look",        desc: "Buy your first cosmetic",                 tier: "bronze", icon: "🎨" },
    "ach_gold_500":       { name: "Pocket Change",   desc: "Earn 500 gold total",                     tier: "bronze", icon: "🪙" },
    "ach_gold_2000":      { name: "Piggy Bank",      desc: "Earn 2,000 gold total",                   tier: "bronze", icon: "🐷" },
    "ach_daily_1":        { name: "Daily Player",    desc: "Complete a daily challenge",               tier: "bronze", icon: "📅" },
    "ach_3star_1":        { name: "Quick Thinker",   desc: "Get 3 stars on a level",                  tier: "bronze", icon: "💡" },
    "ach_3star_10":       { name: "Speed Demon",     desc: "Get 3 stars on 10 levels",                tier: "bronze", icon: "⚡" },
    "ach_time_attack":    { name: "Time Rookie",     desc: "Play Time Attack",                        tier: "bronze", icon: "⏱️" },
    "ach_use_hint":       { name: "Hint Hunter",     desc: "Use a hint",                              tier: "bronze", icon: "🔍" },
    "ach_change_trail":   { name: "Fashionista",     desc: "Equip a trail",                           tier: "bronze", icon: "💃" },

    // === SILVER (10) ===
    "ach_win_50":         { name: "Veteran",         desc: "Complete 50 levels",                      tier: "silver", icon: "🗡️" },
    "ach_stars_100":      { name: "Star Hoarder",    desc: "Earn 100 stars",                          tier: "silver", icon: "🌟" },
    "ach_gold_5000":      { name: "Gold Rush",       desc: "Earn 5,000 gold total",                   tier: "silver", icon: "💰" },
    "ach_streak_7":       { name: "Dedicated",       desc: "Complete 7 daily challenges in a row",    tier: "silver", icon: "🔥" },
    "ach_easy_perfect":   { name: "Easy Peasy",      desc: "Get 3 stars on all Easy levels",          tier: "silver", icon: "🥉" },
    "ach_medium_perfect": { name: "Medium Rare",     desc: "Get 3 stars on all Medium levels",        tier: "silver", icon: "🥈" },
    "ach_ta_2000":        { name: "Time Crusher",    desc: "Score 2,000 in Time Attack",              tier: "silver", icon: "💥" },
    "ach_own_10":         { name: "Collector",        desc: "Own 10 cosmetics",                       tier: "silver", icon: "👑" },
    "ach_change_theme":   { name: "Trendsetter",     desc: "Equip a theme",                           tier: "silver", icon: "🎭" },
    "ach_spend_5000":     { name: "Big Spender",     desc: "Spend 5,000 gold total",                  tier: "silver", icon: "💸" },

    // === GOLD (5) ===
    "ach_hard_perfect":   { name: "Hard as Nails",   desc: "Get 3 stars on all Hard levels",          tier: "gold",   icon: "💎" },
    "ach_arcane_perfect": { name: "Arcane Master",   desc: "Get 3 stars on all Arcane levels",        tier: "gold",   icon: "🔮" },
    "ach_win_100":        { name: "Completionist",   desc: "Complete all 100 campaign levels",        tier: "gold",   icon: "🏆" },
    "ach_ta_10000":       { name: "Time Lord",       desc: "Score 10,000 in Time Attack",             tier: "gold",   icon: "⌛" },
    "ach_daily_30":       { name: "Loyal Player",    desc: "Complete 30 daily challenges",            tier: "gold",   icon: "📆" },

    // === PLATINUM (1) ===
    "ach_platinum":       { name: "Golden Legend",    desc: "Unlock all other achievements",           tier: "platinum", icon: "👼" }
};

export const TIER_COLORS = {
    bronze:   { bg: "#CD7F32", border: "#A0522D", text: "#FFF8E1" },
    silver:   { bg: "#C0C0C0", border: "#808080", text: "#FFFFFF" },
    gold:     { bg: "#FFD700", border: "#DAA520", text: "#FFFFFF" },
    platinum: { bg: "#E5E4E2", border: "#B0B0B0", text: "#1a1a2e" }
};

export const SYSTEM_IMAGES = {
    "bg_galaxy": { src: "assets/gfx/bg_galaxy.webp" },
    "bg_ice":    { src: "assets/gfx/bg_ice.webp" },
    "bg_lava":   { src: "assets/gfx/bg_lava.webp" },
    "bg_cyber":  { src: "assets/gfx/bg_cyber.webp" },
    "bg_temple": { src: "assets/gfx/bg_temple.webp" },
    "bg_zen":    { src: "assets/gfx/bg_zen.webp" },
    "bg_time":   { src: "assets/gfx/bg_time.webp" },
    "map_jungle":{ src: "assets/gfx/map_jungle.webp" },
    "map_ice":   { src: "assets/gfx/map_ice.webp" },
    "map_lava":  { src: "assets/gfx/map_lava.webp" },
    "map_arcane":{ src: "assets/gfx/map_arcane.webp" }
};