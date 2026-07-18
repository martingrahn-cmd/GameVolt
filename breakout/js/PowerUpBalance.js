export const BASE_POWER_UP_DROP_CHANCE = 0.12;
export const EXTRA_BALL_DROP_SCALE = 0.1;
export const LASER_VOLLEY_CAPACITY = 12;

export function getPowerUpDropChance(dropScale = 1) {
  const numericScale = Number(dropScale);
  const safeScale = Number.isFinite(numericScale) ? Math.max(0, numericScale) : 1;
  return Math.min(1, BASE_POWER_UP_DROP_CHANCE * safeScale);
}

export function consumeLaserVolley(remaining) {
  return Math.max(0, Math.floor(Number(remaining) || 0) - 1);
}

export function restoreNormalDropForSingleBall(balls) {
  if (Array.isArray(balls) && balls.length === 1) {
    balls[0].powerUpDropScale = 1;
  }
  return balls;
}
