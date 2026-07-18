import assert from 'node:assert/strict';
import {
  clampStartLevel,
  getHorizontalLevelTarget,
  getMaxUnlockedStartLevel,
  getVerticalLevelTarget,
  isRankedStartLevel
} from './LevelSelect.js';

assert.equal(getMaxUnlockedStartLevel(0), 1);
assert.equal(getMaxUnlockedStartLevel(1), 1);
assert.equal(getMaxUnlockedStartLevel(6), 6);
assert.equal(getMaxUnlockedStartLevel(99), 10);

assert.equal(clampStartLevel(0, 6), 1);
assert.equal(clampStartLevel(4, 6), 4);
assert.equal(clampStartLevel(99, 6), 6);
assert.equal(clampStartLevel('5', 6), 5);

assert.equal(isRankedStartLevel(1), true);
assert.equal(isRankedStartLevel(2), false);

assert.equal(getHorizontalLevelTarget(1, 1, 6), 2);
assert.equal(getHorizontalLevelTarget(6, 1, 6), 6);
assert.equal(getHorizontalLevelTarget(3, -1, 6), 2);
assert.equal(getVerticalLevelTarget(1, 1, 6), 6);
assert.equal(getVerticalLevelTarget(2, 1, 6), 0);
assert.equal(getVerticalLevelTarget(6, -1, 6), 1);
assert.equal(getVerticalLevelTarget(4, -1, 6), 0);

console.log('✅ Breakout level select rules pass');
