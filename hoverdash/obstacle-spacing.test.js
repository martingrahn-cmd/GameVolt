const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

test('the first center wall tunnel has a clear exit before the next phrase', () => {
  const redCanyon = source.match(/name:'RED CANYON',steps:\[([\s\S]*?)\]\s*}/);
  assert.ok(redCanyon, 'RED CANYON phrase is present');

  const wallGaps = Array.from(
    redCanyon[1].matchAll(/type:OT\.WALL_GATE[^}]*gap:([\d.]+)/g),
    match => Number(match[1])
  );
  assert.deepEqual(wallGaps, [2.35, 2.35, 2.35]);

  const speed = Number(source.match(/const SPD0=([\d.]+)/)[1]);
  const wallDepth = Number(source.match(/const WALL_GATE_DEPTH=([\d.]+)/)[1]);
  const followingHazardHalfDepth = 1.5;
  const clearExitSeconds = (
    (wallGaps.at(-1) * speed) - (wallDepth / 2) - followingHazardHalfDepth
  ) / speed;

  assert.ok(
    clearExitSeconds >= 1.4,
    `expected at least 1.4s after the tunnel exit, got ${clearExitSeconds.toFixed(2)}s`
  );
});

test('phrase scheduling honours the final configured gap', () => {
  assert.match(
    source,
    /phraseCooldown=template\.steps\.reduce\(\(sum,step\)=>sum\+\(step\.gap\|\|1\.05\),0\)/
  );
  assert.doesNotMatch(source, /template\.steps\.slice\(0,-1\).*phraseCooldown/);
});
