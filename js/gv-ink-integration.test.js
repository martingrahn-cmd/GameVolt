const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// A game PWA and the portal share one origin, but must retain each other's saves/cache.
test('portal and INK service workers only remove their own older caches', async () => {
  for (const [file, removed] of [['sw.js', 'gamevolt-old'], ['ink/sw.js', 'ink-old']]) {
    const handlers = {}, deleted = [];
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const directCache = source.match(/const CACHE_NAME = ["']([^"']+)/);
    const inkVersion = source.match(/const VERSION = ["']([^"']+)/);
    const currentCache = directCache ? directCache[1] : 'ink-' + inkVersion[1];
    const scope = {
      self: { addEventListener: (name, fn) => handlers[name] = fn, clients: {claim() {}} },
      caches: {
        keys: async () => [currentCache, 'gamevolt-old', 'ink-old', 'another-game'],
        delete: async key => deleted.push(key)
      }
    };
    vm.runInNewContext(source, scope);
    let work;
    handlers.activate({waitUntil: promise => work = promise});
    await work;
    assert.deepEqual(deleted, [removed]);
  }
});
