import assert from 'node:assert/strict';
import {
  SCORE_VERSION,
  LEADERBOARD_MODE,
  OVERDRIVE_COMBO_THRESHOLD,
  OVERDRIVE_MULTIPLIER,
  isOverdriveCombo,
  getBrickHitScore,
  getLaserHitScore
} from './Scoring.js';

assert.equal(SCORE_VERSION, 2);
assert.equal(LEADERBOARD_MODE, 'neon-drift-v2');
assert.equal(getBrickHitScore(1), 10, 'first hit is worth the advertised base score');
assert.equal(getBrickHitScore(2), 20, 'second hit adds one combo step');
assert.equal(getBrickHitScore(10), 100, 'combo scoring remains linear');
assert.equal(getBrickHitScore(0), 10, 'invalid low combos clamp safely');
assert.equal(getBrickHitScore(Number.NaN), 10, 'invalid combos clamp safely');
assert.equal(getLaserHitScore(), 5);
assert.equal(OVERDRIVE_COMBO_THRESHOLD, 10);
assert.equal(OVERDRIVE_MULTIPLIER, 2);
assert.equal(isOverdriveCombo(9), false);
assert.equal(isOverdriveCombo(10), true);
assert.equal(getBrickHitScore(10, true), 200, 'Overdrive doubles brick score');
assert.equal(getLaserHitScore(true), 10, 'Overdrive doubles laser score');

console.log('✅ Breakout scoring rules pass');
