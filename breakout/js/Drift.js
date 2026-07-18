export const PERFECT_DRIFT_EDGE = 0.55;
export const PERFECT_DRIFT_SPEED_RATIO = 0.18;

export function isPerfectDrift(hitPosition, paddleVelocityX, playfieldWidth) {
  const hit = Number(hitPosition) || 0;
  const velocity = Number(paddleVelocityX) || 0;
  const width = Math.max(1, Number(playfieldWidth) || 1);

  if (Math.abs(hit) < PERFECT_DRIFT_EDGE) return false;
  if (Math.abs(velocity) < width * PERFECT_DRIFT_SPEED_RATIO) return false;

  return Math.sign(hit) === Math.sign(velocity);
}

export function getDriftAimBoost(paddleVelocityX, playfieldWidth) {
  const velocity = Number(paddleVelocityX) || 0;
  const width = Math.max(1, Number(playfieldWidth) || 1);
  return Math.max(-0.2, Math.min(0.2, velocity / (width * 1.25)));
}
