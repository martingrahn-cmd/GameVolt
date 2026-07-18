// Competitive scoring rules for Breakout Neon Drift.
//
// Version 2 removes the old active-ball multiplier. Multiball already creates
// more scoring opportunities, so multiplying every hit by the number of balls
// rewarded the same power-up twice and made leaderboard scores overly random.

export const SCORE_VERSION = 2;
export const LEADERBOARD_MODE = 'neon-drift-v2';
export const OVERDRIVE_COMBO_THRESHOLD = 10;
export const OVERDRIVE_MULTIPLIER = 2;

export function isOverdriveCombo(combo) {
  return Math.max(0, Math.floor(Number(combo) || 0)) >= OVERDRIVE_COMBO_THRESHOLD;
}

export function getOverdriveMultiplier(active) {
  return active ? OVERDRIVE_MULTIPLIER : 1;
}

export function getBrickHitScore(combo, overdriveActive = false) {
  const safeCombo = Math.max(1, Math.floor(Number(combo) || 1));
  const baseScore = 10 + (safeCombo - 1) * 10;
  return baseScore * getOverdriveMultiplier(overdriveActive);
}

export function getLaserHitScore(overdriveActive = false) {
  return 5 * getOverdriveMultiplier(overdriveActive);
}
