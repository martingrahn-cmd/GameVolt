import assert from 'node:assert/strict';
import ParticleManager from './ParticleManager.js';

const game = { effectsLevel: 'high' };
const particles = new ParticleManager(game);

particles.explode(10, 20, '#00eaff');
assert.equal(particles.particles.length, 14, 'high FX uses the full explosion');

particles.clear();
game.effectsLevel = 'low';
particles.explode(10, 20, '#00eaff');
assert.equal(particles.particles.length, 7, 'low FX halves explosion particles');

particles.clear();
particles.impact(10, 20, '#00eaff', 1);
assert.equal(particles.particles.length, 3, 'low FX keeps a lightweight impact');
assert.equal(particles.rings.length, 1);

particles.clear();
game.effectsLevel = 'off';
particles.explode(10, 20, '#00eaff');
particles.impact(10, 20, '#00eaff', 1);
assert.equal(particles.particles.length, 0, 'off disables particles');
assert.equal(particles.rings.length, 0, 'off disables impact rings');

console.log('✅ Breakout effect quality rules pass');
