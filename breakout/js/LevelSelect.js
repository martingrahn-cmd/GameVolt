export const MAX_SELECTABLE_LEVEL = 10;

export function getMaxUnlockedStartLevel(bestLevel) {
  return Math.min(
    MAX_SELECTABLE_LEVEL,
    Math.max(1, Math.floor(Number(bestLevel) || 0))
  );
}

export function clampStartLevel(level, bestLevel) {
  const maxLevel = getMaxUnlockedStartLevel(bestLevel);
  const requested = Math.floor(Number(level) || 1);
  return Math.max(1, Math.min(maxLevel, requested));
}

export function isRankedStartLevel(level) {
  return Math.max(1, Math.floor(Number(level) || 1)) === 1;
}

export function getHorizontalLevelTarget(level, direction, bestLevel) {
  const maxLevel = getMaxUnlockedStartLevel(bestLevel);
  const current = clampStartLevel(level, bestLevel);
  return Math.max(1, Math.min(maxLevel, current + Math.sign(direction || 0)));
}

export function getVerticalLevelTarget(level, direction, bestLevel, columns = 5) {
  const maxLevel = getMaxUnlockedStartLevel(bestLevel);
  const current = clampStartLevel(level, bestLevel);
  const target = current + Math.sign(direction || 0) * columns;
  return target >= 1 && target <= maxLevel ? target : 0;
}
