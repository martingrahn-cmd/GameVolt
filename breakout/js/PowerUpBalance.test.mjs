import assert from 'node:assert/strict';
import {
  BASE_POWER_UP_DROP_CHANCE,
  EXTRA_BALL_DROP_SCALE,
  LASER_VOLLEY_CAPACITY,
  getPowerUpDropChance,
  consumeLaserVolley,
  restoreNormalDropForSingleBall
} from './PowerUpBalance.js';

assert.equal(BASE_POWER_UP_DROP_CHANCE, 0.12);
assert.equal(EXTRA_BALL_DROP_SCALE, 0.1);
assert.equal(
  getPowerUpDropChance(EXTRA_BALL_DROP_SCALE),
  0.012,
  'extra multiballs get a 90% lower power-up drop chance'
);
assert.equal(getPowerUpDropChance(), 0.12, 'the primary ball keeps the normal drop chance');
assert.equal(LASER_VOLLEY_CAPACITY, 12);
assert.equal(consumeLaserVolley(12), 11);
assert.equal(consumeLaserVolley(1), 0);
assert.equal(consumeLaserVolley(0), 0);

const remainingBall = { powerUpDropScale: EXTRA_BALL_DROP_SCALE };
restoreNormalDropForSingleBall([remainingBall]);
assert.equal(remainingBall.powerUpDropScale, 1, 'the last surviving ball returns to normal drops');

console.log('✅ Breakout power-up balance rules pass');
