import assert from 'node:assert/strict';
import {
  getBrickOptions,
  getLevelMechanic,
  rotateVelocity
} from './BrickMechanics.js';

assert.equal(getLevelMechanic(1).key, 'classic');
assert.equal(getLevelMechanic(2).key, 'row-chain');
assert.equal(getLevelMechanic(10).key, 'final-boss');
assert.equal(getLevelMechanic(99).key, 'final-boss');

assert.equal(getBrickOptions(3, 0, 0, 3, 40).armor, 1);
assert.equal(getBrickOptions(3, 0, 0, 2, 40).armor, 0);

const leftLink = getBrickOptions(4, 2, 1, 2, 40);
const rightLink = getBrickOptions(4, 2, 8, 2, 40);
assert.equal(leftLink.linkId, rightLink.linkId);

assert.equal(getBrickOptions(5, 2, 2, 1, 40).kind, 'bomb');
assert.equal(getBrickOptions(5, 2, 3, 1, 40).kind, 'normal');

const moving = getBrickOptions(6, 1, 1, 2, 40);
assert.equal(moving.kind, 'moving');
assert.ok(moving.moveAmplitude > 0);

assert.equal(getBrickOptions(7, 0, 2, 3, 40).kind, 'invader');
assert.equal(getBrickOptions(8, 0, 4, 3, 40).kind, 'prism');

assert.equal(getBrickOptions(9, 2, 2, 2, 40).isSwitch, true);
assert.equal(getBrickOptions(9, 5, 0, 3, 40).locked, true);

const finalArena = [
  getBrickOptions(10, 0, 1, 4, 40).kind,
  getBrickOptions(10, 1, 0, 4, 40).kind,
  getBrickOptions(10, 2, 2, 2, 40).kind,
  getBrickOptions(10, 3, 0, 3, 40).kind,
  getBrickOptions(10, 5, 1, 3, 40).kind
];
assert.deepEqual(finalArena, ['god-sentinel', 'bomb', 'prism', 'linked', 'moving']);
assert.equal(getBrickOptions(10, 4, 8, 4, 40).isGodSentinel, true);

const rotated = rotateVelocity(100, 0, 90);
assert.ok(Math.abs(rotated.vx) < 0.000001);
assert.ok(Math.abs(rotated.vy - 100) < 0.000001);
assert.ok(Math.abs(Math.hypot(rotated.vx, rotated.vy) - 100) < 0.000001);

console.log('✅ Breakout level mechanic definitions pass');
