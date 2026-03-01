// Achievement definitions + localStorage persistence for Breakout

export const ACHIEVEMENTS = [
  // BRONZE (15)
  { id: 'first_blood',   tier: 'bronze', icon: '🧱', name: 'First Blood',      desc: 'Destroy your first brick' },
  { id: 'level_1',       tier: 'bronze', icon: '⭐', name: 'Level 1 Clear',    desc: 'Clear level 1' },
  { id: 'power_player',  tier: 'bronze', icon: '⚡', name: 'Power Player',     desc: 'Collect a power-up' },
  { id: 'wide_angle',    tier: 'bronze', icon: '🟢', name: 'Wide Angle',       desc: 'Use wide paddle' },
  { id: 'trigger_happy', tier: 'bronze', icon: '🔫', name: 'Trigger Happy',    desc: 'Use laser cannons' },
  { id: 'safety_first',  tier: 'bronze', icon: '🛡️', name: 'Safety First',     desc: 'Use floor shield' },
  { id: 'ball_frenzy',   tier: 'bronze', icon: '🎱', name: 'Ball Frenzy',      desc: 'Get multiball' },
  { id: 'extra_life',    tier: 'bronze', icon: '❤️', name: 'Extra Life',       desc: 'Collect a 1-UP' },
  { id: 'score_5k',      tier: 'bronze', icon: '💰', name: 'Score 5K',         desc: 'Reach 5,000 points' },
  { id: 'score_10k',     tier: 'bronze', icon: '💰', name: 'Score 10K',        desc: 'Reach 10,000 points' },
  { id: 'brick_layer',   tier: 'bronze', icon: '🧱', name: 'Brick Layer',      desc: 'Destroy 100 bricks total', target: 100, stat: 'totalBricks' },
  { id: 'level_3',       tier: 'bronze', icon: '🏁', name: 'Level 3',          desc: 'Reach level 3' },
  { id: 'combo_5',       tier: 'bronze', icon: '🔥', name: 'Combo x5',         desc: 'Get a 5-brick combo' },
  { id: 'neon_novice',   tier: 'bronze', icon: '🎮', name: 'Neon Novice',      desc: 'Play 5 games', target: 5, stat: 'totalGames' },
  { id: 'quick_clear',   tier: 'bronze', icon: '⏱️', name: 'Quick Clear',      desc: 'Clear a level in under 45s' },

  // SILVER (10)
  { id: 'halfway',       tier: 'silver', icon: '🌟', name: 'Halfway',          desc: 'Reach level 5' },
  { id: 'score_25k',     tier: 'silver', icon: '💰', name: 'Score 25K',        desc: 'Reach 25,000 points' },
  { id: 'brick_master',  tier: 'silver', icon: '🧱', name: 'Brick Master',     desc: 'Destroy 500 bricks total', target: 500, stat: 'totalBricks' },
  { id: 'flawless',      tier: 'silver', icon: '💎', name: 'Flawless',         desc: 'Clear a level with no deaths' },
  { id: 'laser_show',    tier: 'silver', icon: '🔴', name: 'Laser Show',       desc: 'Destroy 10 bricks with laser' },
  { id: 'triple_threat', tier: 'silver', icon: '🎯', name: 'Triple Threat',    desc: 'Have 3 balls active at once' },
  { id: 'survivor',      tier: 'silver', icon: '🛡️', name: 'Survivor',         desc: 'Clear 3 levels without dying' },
  { id: 'combo_10',      tier: 'silver', icon: '🔥', name: 'Combo x10',        desc: 'Get a 10-brick combo' },
  { id: 'power_hoarder', tier: 'silver', icon: '⚡', name: 'Power Hoarder',    desc: 'Collect 10 power-ups in one game' },
  { id: 'marathon',      tier: 'silver', icon: '🏃', name: 'Marathon',          desc: 'Play 20 games', target: 20, stat: 'totalGames' },

  // GOLD (5)
  { id: 'level_10',      tier: 'gold', icon: '🏆', name: 'Level 10',           desc: 'Reach level 10' },
  { id: 'score_50k',     tier: 'gold', icon: '💰', name: 'Score 50K',          desc: 'Reach 50,000 points' },
  { id: 'brick_legend',  tier: 'gold', icon: '🧱', name: 'Brick Legend',       desc: 'Destroy 1,000 bricks total', target: 1000, stat: 'totalBricks' },
  { id: 'untouchable',   tier: 'gold', icon: '👻', name: 'Untouchable',        desc: 'Clear 5 levels without dying' },
  { id: 'neon_god',      tier: 'gold', icon: '🔱', name: 'Neon God',           desc: 'Beat level 10 "NEON GOD"' },

  // PLATINUM (1)
  { id: 'neon_master',   tier: 'platinum', icon: '👑', name: 'Neon Master',     desc: 'Unlock all 30 other achievements' },
];

const BO_KEY = 'bo_data';

function defaultData() {
  var d = {
    totalGames: 0,
    totalBricks: 0,
    bestScore: 0,
    bestLevel: 0,
    scores: [],
    unlocked: {}
  };
  for (var i = 0; i < ACHIEVEMENTS.length; i++) {
    d.unlocked[ACHIEVEMENTS[i].id] = 0;
  }
  return d;
}

export function loadBOData() {
  try {
    var raw = localStorage.getItem(BO_KEY);
    if (raw) {
      var d = JSON.parse(raw);
      // Migration: add any new fields
      if (!d.scores) d.scores = [];
      for (var i = 0; i < ACHIEVEMENTS.length; i++) {
        if (!(ACHIEVEMENTS[i].id in d.unlocked)) d.unlocked[ACHIEVEMENTS[i].id] = 0;
      }
      return d;
    }
  } catch (e) {}

  // First run: migrate old highscore key
  var d = defaultData();
  try {
    var old = parseInt(localStorage.getItem('neonDriftHighscore')) || 0;
    if (old > 0) d.bestScore = old;
  } catch (e) {}
  return d;
}

export function saveBOData(data) {
  try { localStorage.setItem(BO_KEY, JSON.stringify(data)); } catch (e) {}
}
