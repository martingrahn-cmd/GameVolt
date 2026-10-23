// attack.test.js — the versus attack table.
//
// Pure functions with no callers yet, so these tests are the only thing
// holding the numbers in place. They are written as a table because that
// is how the numbers will be argued about once people actually play: the
// question "should a single send anything?" should be a one-line diff
// with a failing test next to it.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const url = require('node:url');

const MODULE = url.pathToFileURL(path.join(__dirname, 'attack.js')).href;
let mod;
const load = async () => (mod ||= await import(MODULE));

test('the attack table', async () => {
  const { attackFor } = await load();
  const cases = [
    // [name,                        args,                                          expected]
    ['single sends nothing',         { lines: 1, combo: 1 },                        0],
    ['double',                       { lines: 2, combo: 1 },                        1],
    ['triple',                       { lines: 3, combo: 1 },                        2],
    ['tetris',                       { lines: 4, combo: 1 },                        4],
    ['t-spin single',                { lines: 1, tSpin: 'full', combo: 1 },         2],
    ['t-spin double',                { lines: 2, tSpin: 'full', combo: 1 },         4],
    ['t-spin triple',                { lines: 3, tSpin: 'full', combo: 1 },         6],
    ['mini t-spin single',           { lines: 1, tSpin: 'mini', combo: 1 },         1],
    ['tetris, back-to-back',         { lines: 4, combo: 1, backToBack: true },      5],
    ['t-spin double, back-to-back',  { lines: 2, tSpin: 'full', combo: 1, backToBack: true }, 5],
    ['double at combo 4',            { lines: 2, combo: 4 },                        3],
    ['tetris at combo 8',            { lines: 4, combo: 8 },                        8],
    ['perfect clear overrides',      { lines: 4, combo: 8, backToBack: true, perfectClear: true }, 10],
  ];
  for (const [name, args, want] of cases) {
    assert.equal(attackFor(args), want, `${name}: expected ${want}, got ${attackFor(args)}`);
  }
});

test('a placement that clears nothing sends nothing', async () => {
  const { attackFor } = await load();
  // A T-spin with no lines is a real event in the game and scores points,
  // but it must not be an attack — otherwise spinning in place is a weapon.
  assert.equal(attackFor({ lines: 0, tSpin: 'full', combo: 0 }), 0);
  assert.equal(attackFor({ lines: 0, combo: 5, backToBack: true }), 0);
  assert.equal(attackFor({ lines: 0, perfectClear: true }), 0);
});

test('back-to-back only rewards difficult clears', async () => {
  const { attackFor } = await load();
  // The flag can be true while the current clear is an ordinary double;
  // the bonus belongs to the clear, not to the streak.
  assert.equal(attackFor({ lines: 2, combo: 1, backToBack: true }), 1);
  assert.equal(attackFor({ lines: 3, combo: 1, backToBack: true }), 2);
  assert.equal(attackFor({ lines: 4, combo: 1, backToBack: true }), 5);
});

test('the combo bonus is capped rather than unbounded', async () => {
  const { attackFor } = await load();
  // A long combo should not become an instant win.
  assert.equal(attackFor({ lines: 4, combo: 20 }), attackFor({ lines: 4, combo: 8 }));
  assert.equal(attackFor({ lines: 4, combo: 1000 }), 8);
});

test('odd input does not produce odd attacks', async () => {
  const { attackFor } = await load();
  assert.equal(attackFor(), 0);
  assert.equal(attackFor({}), 0);
  assert.equal(attackFor({ lines: -3, combo: 2 }), 0);
  assert.equal(attackFor({ lines: 2, combo: -5 }), 1, 'a negative combo must not subtract');

  // More than four lines cannot happen with one piece, and the check has to
  // hold at any combo — testing it only at combo 1 passes for the wrong
  // reason, since the bonus there is zero anyway.
  for (const combo of [1, 4, 8, 50]) {
    assert.equal(attackFor({ lines: 99, combo }), 0, `impossible line count at combo ${combo}`);
    assert.equal(attackFor({ lines: 5, combo, backToBack: true }), 0, `five lines at combo ${combo}`);
  }
});

test('back-to-back state transitions', async () => {
  const { nextBackToBack, isDifficultClear } = await load();

  assert.equal(isDifficultClear(4, null), true, 'tetris is difficult');
  assert.equal(isDifficultClear(2, 'full'), true, 't-spin double is difficult');
  assert.equal(isDifficultClear(2, null), false, 'a plain double is not');
  assert.equal(isDifficultClear(1, 'mini'), false, 'a mini t-spin is not');
  assert.equal(isDifficultClear(0, 'full'), false, 'no lines, no streak');

  assert.equal(nextBackToBack(false, 4, null), true, 'a tetris starts the chain');
  assert.equal(nextBackToBack(true, 4, null), true, 'and keeps it');
  assert.equal(nextBackToBack(true, 2, null), false, 'a plain double breaks it');
  assert.equal(nextBackToBack(true, 0, null), true, 'a placement with no clear leaves it alone');
  assert.equal(nextBackToBack(false, 0, null), false);
});

test('perfect clear detection', async () => {
  const { isPerfectClear } = await load();
  const empty = Array.from({ length: 4 }, () => new Array(10).fill(null));
  assert.equal(isPerfectClear(empty), true);

  const oneBlock = Array.from({ length: 4 }, () => new Array(10).fill(null));
  oneBlock[3][7] = { color: '#fff' };
  assert.equal(isPerfectClear(oneBlock), false);
});
