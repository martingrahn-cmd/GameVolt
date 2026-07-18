export const FINAL_SENTINEL_COUNT = 4;
export const FINAL_CORE_BASE_HP = 12;
export const FINAL_CORE_CYCLE_HP = 3;
export const FINAL_BOSS_BONUS = 5000;
export const FINAL_VICTORY_DELAY = 1.35;

export function getFinalCoreHP(level) {
  const safeLevel = Math.max(10, Math.floor(Number(level) || 10));
  const completedCycles = Math.max(0, Math.floor((safeLevel - 1) / 10) - 0);
  return FINAL_CORE_BASE_HP + completedCycles * FINAL_CORE_CYCLE_HP;
}

export function getFinalCoreStage(hp, maxHP) {
  const safeMax = Math.max(1, Math.floor(Number(maxHP) || 1));
  const safeHP = Math.max(0, Math.floor(Number(hp) || 0));
  if (safeHP <= Math.ceil(safeMax / 3)) return 3;
  if (safeHP <= Math.ceil(safeMax * 2 / 3)) return 2;
  return 1;
}

export function getFinalStageMotion(stage, brickWidth) {
  const width = Math.max(1, Number(brickWidth) || 1);
  if (stage >= 3) return { amplitude: width * 1.05, speed: 1.75 };
  if (stage === 2) return { amplitude: width * 0.85, speed: 1.15 };
  return { amplitude: width * 0.55, speed: 0.72 };
}
