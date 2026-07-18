import assert from 'node:assert/strict';
import {
  FINAL_BOSS_BONUS,
  FINAL_CORE_BASE_HP,
  FINAL_SENTINEL_COUNT,
  getFinalCoreHP,
  getFinalCoreStage,
  getFinalStageMotion
} from './FinalBoss.js';

assert.equal(FINAL_SENTINEL_COUNT, 4);
assert.equal(FINAL_CORE_BASE_HP, 12);
assert.equal(FINAL_BOSS_BONUS, 5000);
assert.equal(getFinalCoreHP(10), 12);
assert.equal(getFinalCoreHP(20), 15);

assert.equal(getFinalCoreStage(12, 12), 1);
assert.equal(getFinalCoreStage(8, 12), 2);
assert.equal(getFinalCoreStage(4, 12), 3);
assert.equal(getFinalCoreStage(0, 12), 3);

const stage1 = getFinalStageMotion(1, 40);
const stage3 = getFinalStageMotion(3, 40);
assert.ok(stage3.amplitude > stage1.amplitude);
assert.ok(stage3.speed > stage1.speed);

console.log('✅ Breakout Neon God final boss rules pass');
