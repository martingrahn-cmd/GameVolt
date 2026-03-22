/* ── Manga Match! Trophy Definitions (GameVolt.io format) ── */

export const ACHIEVEMENTS = [
  // ── Bronze (15) — Entry-level, natural progression ──
  { id: "first_match", tier: "bronze", icon: "🌸", name: "First Bloom", desc: "Complete your first match" },
  { id: "stage_1", tier: "bronze", icon: "🏫", name: "Academy Student", desc: "Clear Stage 1" },
  { id: "stage_5", tier: "bronze", icon: "⭐", name: "Rising Star", desc: "Clear Stage 5" },
  { id: "stage_10", tier: "bronze", icon: "🌙", name: "Portal Opener", desc: "Clear World 1 (Stage 10)" },
  { id: "first_special", tier: "bronze", icon: "💎", name: "Special Discovery", desc: "Create your first special tile" },
  { id: "first_line", tier: "bronze", icon: "⚡", name: "Line Blast", desc: "Create a line attack tile" },
  { id: "first_bomb", tier: "bronze", icon: "💥", name: "Bomber", desc: "Create a bomb tile" },
  { id: "first_color", tier: "bronze", icon: "🌈", name: "Color Burst", desc: "Create a color bomb" },
  { id: "chain_2", tier: "bronze", icon: "🔗", name: "Chain Starter", desc: "Achieve a 2-chain combo" },
  { id: "fever_first", tier: "bronze", icon: "🔥", name: "First Fever", desc: "Activate Fever Mode for the first time" },
  { id: "score_5k", tier: "bronze", icon: "📊", name: "Point Collector", desc: "Score 5,000 points in a single stage" },
  { id: "clear_50", tier: "bronze", icon: "🧹", name: "Tile Sweeper", desc: "Clear 50 tiles in a single stage" },
  { id: "stars_10", tier: "bronze", icon: "✨", name: "Star Gazer", desc: "Earn 10 stars total" },
  { id: "daily_first", tier: "bronze", icon: "📅", name: "Daily Player", desc: "Complete your first daily challenge" },
  { id: "coins_500", tier: "bronze", icon: "🪙", name: "Coin Collector", desc: "Accumulate 500 coins" },

  // ── Silver (10) — Intermediate skill ──
  { id: "stage_20", tier: "silver", icon: "🏯", name: "Portal Guardian", desc: "Clear World 2 (Stage 20)" },
  { id: "chain_4", tier: "silver", icon: "⛓️", name: "Chain Master", desc: "Achieve a 4-chain combo" },
  { id: "score_10k", tier: "silver", icon: "🏆", name: "High Scorer", desc: "Score 10,000 points in a single stage" },
  { id: "three_stars", tier: "silver", icon: "🌟", name: "Perfectionist", desc: "Get 3 stars on any stage" },
  { id: "stars_30", tier: "silver", icon: "💫", name: "Star Hunter", desc: "Earn 30 stars total" },
  { id: "ink_clear_20", tier: "silver", icon: "🖋️", name: "Ink Eraser", desc: "Clear 20 ink obstacles total" },
  { id: "locks_break_15", tier: "silver", icon: "🔓", name: "Locksmith", desc: "Break 15 locks total" },
  { id: "fever_5", tier: "silver", icon: "🔥", name: "Fever Addict", desc: "Activate Fever Mode 5 times" },
  { id: "daily_streak_3", tier: "silver", icon: "📆", name: "Dedicated", desc: "Reach a 3-day daily challenge streak" },
  { id: "powerup_use_5", tier: "silver", icon: "⚗️", name: "Power User", desc: "Use 5 power-ups total" },

  // ── Gold (5) — Hard, requires dedication ──
  { id: "stage_30", tier: "gold", icon: "👑", name: "Final Panel", desc: "Clear all 30 stages" },
  { id: "chain_6", tier: "gold", icon: "💀", name: "Chain Demon", desc: "Achieve a 6-chain combo" },
  { id: "score_20k", tier: "gold", icon: "🎌", name: "Score Legend", desc: "Score 20,000 points in a single stage" },
  { id: "stars_90", tier: "gold", icon: "🌠", name: "Star Master", desc: "Earn 90 stars (all stages 3-star)" },
  { id: "daily_streak_7", tier: "gold", icon: "🗓️", name: "Weekly Warrior", desc: "Reach a 7-day daily challenge streak" },

  // ── Platinum (1) — Meta-achievement ──
  { id: "manga_master", tier: "platinum", icon: "🏅", name: "Manga Master", desc: "Unlock all other trophies" },
];

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;
export const TROPHY_TIERS = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
