import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const progressionSource = await readFile(new URL('js/progression.js', root), 'utf8');
const progressionUrl = `data:text/javascript;base64,${Buffer.from(progressionSource).toString('base64')}`;
const { createDefaultSave } = await import(progressionUrl);
const gameSource = await readFile(new URL('js/game.js', root), 'utf8');
const htmlSource = await readFile(new URL('index.html', root), 'utf8');

assert.equal(createDefaultSave().settings.autofire, true);

assert.match(gameSource, /START CAMPAIGN/);
assert.match(gameSource, /PRACTICE/);
assert.match(gameSource, /const menuItems = 7/);
assert.match(gameSource, /this\.startGame\(0,\s*RUN_TYPES\.CAMPAIGN\)/);

assert.match(gameSource, /DRAG TO MOVE/);
assert.match(gameSource, /AUTO-FIRE ON/);
assert.match(gameSource, /DODGE BRIGHT ENEMY SHOTS/);
assert.match(gameSource, /tutorialComplete/);

assert.match(gameSource, /Precise collision point/);
assert.match(gameSource, /const bulletRadius = Math\.max\(5/);
assert.match(gameSource, /RANKED CAMPAIGN/);
assert.match(gameSource, /MAX COMBO/);
assert.match(gameSource, /_buildRunSummary/);

assert.match(gameSource, /GameVoltTracker\.start/);
assert.match(gameSource, /GameVoltTracker\.end/);
assert.match(gameSource, /_endTrackedRun\('win'\)/);
assert.match(gameSource, /_endTrackedRun\('lose'\)/);
assert.match(gameSource, /_endTrackedRun\('quit'\)/);
assert.doesNotMatch(htmlSource, /setInterval\(function\(\)\{\s*var g=window\.__axelugaGame/);

assert.doesNotMatch(gameSource, /SMARTPROC/i);
assert.doesNotMatch(htmlSource, /SMARTPROC/i);
assert.match(gameSource, /A GAMEVOLT ORIGINAL/);
assert.match(htmlSource, /box-sizing: border-box/);

console.log('Axeluga P1 contracts verified.');
