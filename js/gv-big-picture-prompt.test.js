const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'gv-big-picture-prompt.js'), 'utf8');

function button(pressed = false) {
  return { pressed, value: pressed ? 1 : 0 };
}

function gamepad(options = {}) {
  const buttons = Array.from({ length: options.buttonCount || 16 }, () => button(false));
  if (options.accept) buttons[0] = button(true);
  if (options.back) buttons[1] = button(true);
  return {
    connected: options.connected !== false,
    mapping: options.mapping === undefined ? 'standard' : options.mapping,
    buttons,
    axes: Array.from({ length: options.axisCount || 4 }, () => 0)
  };
}

class FakeElement {
  constructor(props = {}) {
    this.hidden = props.hidden === undefined ? false : props.hidden;
    this.href = props.href || '';
    this.listeners = {};
    this.clickCount = 0;
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  click() {
    this.clickCount += 1;
    if (this.listeners.click) this.listeners.click({ currentTarget: this });
  }
}

function boot(initialPads = [], stored = {}) {
  const prompt = new FakeElement({ hidden: true });
  const open = new FakeElement({ href: '/big-picture/?from=gamepad_prompt' });
  const dismiss = new FakeElement();
  const elements = {
    gamepadBpPrompt: prompt,
    gamepadBpOpen: open,
    gamepadBpDismiss: dismiss
  };
  const frames = [];
  const windowEvents = {};
  const storage = new Map(Object.entries(stored));
  let pads = initialPads;

  const document = {
    readyState: 'complete',
    getElementById(id) { return elements[id] || null; },
    querySelector() { return null; }
  };
  const window = {
    document,
    navigator: { getGamepads: () => pads },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, value); }
    },
    location: { href: '' },
    requestAnimationFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    addEventListener(type, handler) { windowEvents[type] = handler; },
    gtag() {}
  };
  window.window = window;
  window.globalThis = window;

  vm.runInNewContext(source, window, { filename: 'gv-big-picture-prompt.js' });

  return {
    api: window.GameVoltBigPicturePrompt,
    prompt,
    open,
    dismiss,
    storage,
    windowEvents,
    setPads(next) { pads = next; },
    nextFrame() {
      const callback = frames.shift();
      assert.ok(callback, 'expected a queued animation frame');
      callback();
    }
  };
}

test('shows the Big Picture invitation only for standard gamepads', () => {
  const unsupported = boot([gamepad({ mapping: '' })]);
  assert.equal(unsupported.prompt.hidden, true);
  assert.equal(unsupported.api.isStandardGamepad(gamepad({ mapping: '' })), false);

  const supported = boot([gamepad()]);
  assert.equal(supported.prompt.hidden, false);
  assert.equal(supported.api.isStandardGamepad(gamepad()), true);
});

test('requires release and a fresh A press before opening Big Picture', () => {
  const pressed = gamepad({ accept: true });
  const app = boot([pressed]);

  assert.equal(app.prompt.hidden, false);
  assert.equal(app.open.clickCount, 0, 'the connection press must not launch the page');

  pressed.buttons[0] = button(false);
  app.nextFrame();
  pressed.buttons[0] = button(true);
  app.nextFrame();

  assert.equal(app.open.clickCount, 1);
});

test('B hides the invitation and remembers the choice for seven days', () => {
  const pad = gamepad();
  const app = boot([pad]);
  pad.buttons[1] = button(true);
  app.nextFrame();

  assert.equal(app.prompt.hidden, true);
  const until = Number(app.storage.get(app.api.DISMISS_KEY));
  assert.ok(until > Date.now() + (6 * 24 * 60 * 60 * 1000));

  const nextVisit = boot([gamepad()], { [app.api.DISMISS_KEY]: String(until) });
  assert.equal(nextVisit.prompt.hidden, true);
});

test('hides the invitation when the last controller disconnects', () => {
  const app = boot([gamepad()]);
  assert.equal(app.prompt.hidden, false);
  app.setPads([]);
  app.nextFrame();
  assert.equal(app.prompt.hidden, true);
});
