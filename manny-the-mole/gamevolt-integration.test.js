const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const sql = fs.readFileSync(path.join(root, 'sql/manny-the-mole-achievements.sql'), 'utf8');
const profile = fs.readFileSync(path.join(root, 'profile/index.html'), 'utf8');

function gameIds() {
  const block = html.slice(
    html.indexOf('const TROPHY_DEFINITIONS'),
    html.indexOf('const TROPHY_BY_ID'),
  );
  return [...block.matchAll(/\{ id: '([^']+)'/g)].map((match) => match[1]);
}

test('the database and profile mirror all 31 in-game trophies', () => {
  const ids = gameIds();
  const sqlIds = [...sql.matchAll(/\('manny-the-mole-([^']+)'/g)].map((match) => match[1]);
  assert.equal(ids.length, 31);
  assert.deepEqual(sqlIds, ids);
  for (const id of ids) {
    assert.match(profile, new RegExp(`id\\s*:\\s*['"]manny-the-mole-${id}['"]`));
  }
  assert.match(html, /src="\/sdk\/gamevolt\.js\?v=[^"]+" data-game="manny-the-mole"/);
});

test('every trophy has a real gameplay trigger', () => {
  const ids = gameIds();
  const literalTriggers = new Set(
    [...html.matchAll(/this\.award\('([^']+)'\)/g)].map((match) => match[1]),
  );
  for (let grade = 1; grade <= 6; grade += 1) literalTriggers.add(`grade-${grade}`);
  assert.deepEqual([...literalTriggers].sort(), [...ids].sort());
  assert.match(html, /const id = `grade-\$\{grade\}`;/);
});

test('new trophies persist, unlock in GameVolt and enter the FIFO toast queue', () => {
  const cabinet = html.slice(html.indexOf('class TrophyCabinet'), html.indexOf('// Game constants'));
  assert.match(cabinet, /if \(!definition \|\| this\.has\(id\)\) return false;/);
  assert.match(cabinet, /this\.pending\.push\(definition\);/);
  assert.match(cabinet, /GameVolt\.achievements\.unlock\(id\);/);
  assert.match(cabinet, /return this\.pending\.shift\(\) \?\? null;/);

  const toastStart = html.indexOf('updateTrophyToast(deltaTime)');
  const toast = html.slice(toastStart, html.indexOf('refreshGallery()', toastStart));
  assert.match(toast, /this\.trophyToast\.style\.animation = 'none';/);
  assert.match(toast, /void this\.trophyToast\.offsetWidth;/);
  assert.match(toast, /this\.trophyToastTimer = 2\.6;/);
});

test('cloud trophies backfill silently after an in-session QR sign-in', () => {
  const cabinet = html.slice(html.indexOf('class TrophyCabinet'), html.indexOf('// Game constants'));
  assert.match(cabinet, /GameVolt\.auth\?\.onStateChange\?\.\(user => \{ if \(user\) backfill\(\); \}\);/);
  assert.match(cabinet, /if \(TROPHY_BY_ID\[id\] && !this\.earned\[id\]\)/);
  assert.doesNotMatch(cabinet.slice(cabinet.indexOf('const backfill'), cabinet.indexOf('load()')), /pending\.push/);
});
