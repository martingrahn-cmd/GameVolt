const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dir = __dirname;
const read = (file) => fs.readFileSync(path.join(dir, file), 'utf8');

function loadInput() {
  let source = read('src/core/input.js')
    .replace("import { TUNING as T } from '../config.js';", 'const T = { STEER_RISE: 5, STEER_RELEASE: 14, THROTTLE_RISE: 8, THROTTLE_RELEASE: 10 };')
    .replaceAll('export ', '');
  const storage = new Map();
  const env = {
    window: { addEventListener() {} },
    document: { getElementById() { return null; }, querySelectorAll() { return []; } },
    localStorage: {
      getItem(k) { return storage.has(k) ? storage.get(k) : null; },
      setItem(k, v) { storage.set(k, String(v)); },
    },
    navigator: { getGamepads() { return []; } },
    console,
  };
  vm.runInNewContext(`${source}\nthis.InputClass = Input;`, env);
  return new env.InputClass();
}

test('touch cockpit exposes every control needed to finish a race', () => {
  const html = read('index.html');
  for (const control of ['touch-steer', 'touch-thrust', 'touch-brake', 'touch-drift', 'touch-fire']) {
    assert.match(html, new RegExp(control));
  }
  assert.match(read('styles/main.css'), /pointer: coarse/);
});

test('multi-touch driving feeds the same analog axes and edge actions as a gamepad', () => {
  const input = loadInput();
  input.touchHold('steer', 0.8);
  input.touchHold('throttle', 1);
  input.touchHold('airbrake', 1);
  input.touchPress('fire');
  input.update(0.2);
  assert.ok(input.steer > 0.75);
  assert.equal(input.throttle, 1);
  assert.equal(input.airbrake, true);
  assert.equal(input.consumeAction('fire'), true);
  assert.equal(input.lastDevice, 'touch');
  input.releaseTouch();
  input.update(0.2);
  assert.equal(input.throttle, 0);
  assert.equal(input.airbrake, false);
});
