const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('the GameVolt database and profile mirror all 31 in-game trophies', () => {
  const achievements = read('slipstream-vector/src/ui/achievements.js');
  const bareIds = [...achievements.matchAll(/\{ id: '([^']+)', name:/g)].map((m) => m[1]);
  assert.equal(bareIds.length, 31);

  const sql = read('sql/slipstream-vector-achievements.sql');
  const sqlIds = [...sql.matchAll(/\('slipstream-vector-([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(sqlIds, bareIds);

  const profile = read('profile/index.html');
  for (const id of bareIds) assert.match(profile, new RegExp(`"id": "slipstream-vector-${id}"`));
  assert.match(read('slipstream-vector/index.html'), /src="\/sdk\/gamevolt\.js[^\"]*"/);
});

test('cloud merge keeps earned trophies, career maxima and fastest records', () => {
  const source = read('slipstream-vector/src/core/portal.js');
  const classSource = source.slice(source.indexOf('class Portal'), source.indexOf('\nexport const portal'));
  const data = new Map();
  const localStorage = {
    get length() { return data.size; },
    key(i) { return [...data.keys()][i] ?? null; },
    getItem(k) { return data.has(k) ? data.get(k) : null; },
    setItem(k, v) { data.set(k, String(v)); },
  };
  const env = { window: {}, localStorage, console };
  vm.runInNewContext(`${classSource}\nthis.Portal = Portal;`, env);
  const portal = new env.Portal();
  const merged = portal.mergeSaves(
    { 'sv-ach': { first_race: 20 }, 'sv-achstats': { races: 3, trackSet: ['a'] }, 'sv-best-a': '41.5', 'sv-unlocked': '1' },
    { 'sv-ach': { first_win: 10 }, 'sv-achstats': { races: 8, trackSet: ['b'] }, 'sv-best-a': '39.2', 'sv-unlocked': '2' },
  );
  assert.deepEqual(Object.keys(merged['sv-ach']).sort(), ['first_race', 'first_win']);
  assert.equal(merged['sv-achstats'].races, 8);
  assert.deepEqual([...merged['sv-achstats'].trackSet].sort(), ['a', 'b']);
  assert.equal(merged['sv-best-a'], '39.2');
  assert.equal(merged['sv-unlocked'], '2');
  assert.equal(localStorage.getItem('sv-ach'), JSON.stringify(merged['sv-ach']));
});
