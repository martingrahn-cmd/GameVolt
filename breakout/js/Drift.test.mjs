import assert from 'node:assert/strict';
import {
  PERFECT_DRIFT_EDGE,
  PERFECT_DRIFT_SPEED_RATIO,
  isPerfectDrift,
  getDriftAimBoost
} from './Drift.js';

assert.equal(PERFECT_DRIFT_EDGE, 0.55);
assert.equal(PERFECT_DRIFT_SPEED_RATIO, 0.18);

assert.equal(
  isPerfectDrift(0.7, 200, 800),
  true,
  'a fast outward-moving edge catch is a Perfect Drift'
);
assert.equal(
  isPerfectDrift(-0.7, -200, 800),
  true,
  'Perfect Drift works symmetrically'
);
assert.equal(
  isPerfectDrift(0.4, 200, 800),
  false,
  'the paddle center is outside the drift zone'
);
assert.equal(
  isPerfectDrift(0.7, 100, 800),
  false,
  'slow movement is not a drift'
);
assert.equal(
  isPerfectDrift(0.7, -200, 800),
  false,
  'moving against the outgoing angle is not a drift'
);

assert.equal(getDriftAimBoost(1000, 800), 0.2, 'aim boost is safely capped');
assert.equal(getDriftAimBoost(-1000, 800), -0.2, 'negative aim boost is safely capped');

console.log('✅ Breakout Perfect Drift rules pass');
