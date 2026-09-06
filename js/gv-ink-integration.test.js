const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// A game PWA and the portal share one origin, but must retain each other's saves/cache.
test('portal and INK service workers only remove their own older caches', async () => {
  for (const [file, removed] of [['sw.js', 'gamevolt-old'], ['ink/sw.js', 'ink-old']]) {
    const handlers = {}, deleted = [];
    const scope = {
      self: { addEventListener: (name, fn) => handlers[name] = fn, clients: {claim() {}} },
      caches: {
        keys: async () => ['gamevolt-v17', 'gamevolt-old', 'ink-v3', 'ink-old', 'another-game'],
        delete: async key => deleted.push(key)
      }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), scope);
    let work;
    handlers.activate({waitUntil: promise => work = promise});
    await work;
    assert.deepEqual(deleted, [removed]);
  }
});
