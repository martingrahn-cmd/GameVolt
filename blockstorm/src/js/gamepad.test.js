const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(options = {}) {
  const actions = [], statuses = [];
  const window = { navigator: {}, requestAnimationFrame() {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'gamepad.js'), 'utf8'), { window });
  const controller = new window.BlockStormGamepad({
    navigator: options.navigator || { getGamepads() { return []; } },
    requestFrame() {},
    isHidden: options.isHidden || (() => false),
    onAction: (name, repeated) => actions.push({ name, repeated }),
    onStatus: (connected, name) => statuses.push({ connected, name })
  });
  return { controller, actions, statuses };
}

function pad({ buttons = [], axes = [0, 0], mapping = 'standard', id = 'Test Controller', connected = true } = {}) {
  return {
    id, connected, mapping, axes,
    buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: buttons.includes(index) }))
  };
}

test('maps standard controller buttons and keeps hard drop edge-only', () => {
  const { controller, actions } = load();
  controller.update(0, [pad({ buttons: [0, 3, 12, 14] })]);
  assert.deepEqual(actions, [
    { name: 'left', repeated: false },
    { name: 'up', repeated: false },
    { name: 'accept', repeated: false },
    { name: 'aux', repeated: false }
  ]);
  controller.update(500, [pad({ buttons: [0, 3, 12, 14] })]);
  assert.deepEqual(actions.slice(4), [{ name: 'left', repeated: true }]);
});

test('applies DAS separately to horizontal movement and soft drop', () => {
  const { controller, actions } = load();
  controller.update(0, [pad({ axes: [0.8, 0.8] })]);
  assert.deepEqual(actions, [
    { name: 'right', repeated: false },
    { name: 'down', repeated: false }
  ]);
  controller.update(89, [pad({ axes: [0.8, 0.8] })]);
  assert.equal(actions.length, 2);
  controller.update(90, [pad({ axes: [0.8, 0.8] })]);
  assert.deepEqual(actions.at(-1), { name: 'down', repeated: true });
  controller.update(170, [pad({ axes: [0.8, 0.8] })]);
  assert.ok(actions.some(action => action.name === 'right' && action.repeated));
});

test('handles blocked APIs, disconnects and hidden tabs without stuck input', () => {
  let hidden = false;
  const { controller, actions, statuses } = load({
    navigator: { getGamepads() { throw new Error('blocked'); } },
    isHidden: () => hidden
  });
  assert.doesNotThrow(() => controller.update(0));
  controller.update(10, [pad({ buttons: [0] })]);
  controller.update(20, []);
  controller.update(30, [pad({ buttons: [0] })]);
  assert.equal(actions.filter(action => action.name === 'accept').length, 2);
  assert.deepEqual(statuses.map(status => status.connected), [true, false, true]);
  hidden = true;
  controller.update(40, [pad({ buttons: [0] })]);
  hidden = false;
  controller.update(50, [pad({ buttons: [0] })]);
  assert.equal(actions.filter(action => action.name === 'accept').length, 3);
});

test('rejects audio devices but accepts capable legacy-mapped controllers', () => {
  const { controller, actions } = load();
  const audioDevice = pad({ id: 'Wireless Headset Audio', buttons: [0] });
  controller.update(0, [audioDevice]);
  assert.equal(actions.length, 0);
  controller.update(1, [pad({ mapping: '', buttons: [0], id: 'Legacy USB Gamepad' })]);
  assert.deepEqual(actions, [{ name: 'accept', repeated: false }]);
});

test('BlockStorm page exposes controller guidance and Big Picture includes the game', () => {
  const page = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  const bigPicture = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'big-picture', 'app.js'), 'utf8');
  assert.match(page, /src\/js\/gamepad\.js/);
  assert.match(page, /D-pad \/ Left stick/);
  assert.match(page, /Menu \/ Options/);
  assert.match(bigPicture, /id: 'blockstorm'/);
});
