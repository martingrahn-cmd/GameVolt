// grid.test.js — garbage rows for versus.
//
// addGarbage() is not called from single-player; these tests exist so the
// method is known-good before anything calls it, and so the board
// invariants it has to preserve are written down rather than remembered.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const url = require('node:url');

const MODULE = url.pathToFileURL(path.join(__dirname, 'grid.js')).href;

let mod;
async function newGrid() {
  if (!mod) mod = await import(MODULE);
  return new mod.Grid();
}

// Render a board as text: '.' empty, '#' filled. Easier to assert against
// than nested arrays, and a failure prints something readable.
const render = (g) => g.cells.map((row) => row.map((c) => (c ? '#' : '.')).join('')).join('\n');
const bottom = (g, n = 1) => render(g).split('\n').slice(-n).join('\n');

test('garbage fills the bottom row except the hole', async () => {
  const g = await newGrid();
  g.addGarbage(1, 3);
  assert.equal(bottom(g), '###.######'.slice(0, g.cols));
});

test('several rows share the same hole column', async () => {
  const g = await newGrid();
  g.addGarbage(3, 0);
  const rows = render(g).split('\n').slice(-3);
  for (const r of rows) assert.equal(r[0], '.', `row should start with the hole: ${r}`);
  for (const r of rows) assert.equal(r.slice(1).includes('.'), false, `only one hole: ${r}`);
});

test('existing blocks are pushed up, not overwritten', async () => {
  const g = await newGrid();
  const last = g.rows - 1;
  g.cells[last][5] = { color: '#fff' };     // a lone block on the floor
  g.addGarbage(2, 0);
  assert.equal(g.cells[last - 2][5] !== null, true, 'the block should have risen two rows');
  assert.equal(g.cells[last][5] !== null, true, 'garbage should occupy the floor now');
});

test('the board keeps its dimensions', async () => {
  const g = await newGrid();
  g.addGarbage(4, 2);
  assert.equal(g.cells.length, g.rows);
  for (const row of g.cells) assert.equal(row.length, g.cols);
});

test('garbage cells are marked and coloured as garbage', async () => {
  const g = await newGrid();
  g.addGarbage(1, 0);
  const cell = g.cells[g.rows - 1][1];
  assert.equal(cell.garbage, true);
  assert.equal(typeof cell.color, 'string');
});

test('it reports a top out when blocks are pushed off the board', async () => {
  const g = await newGrid();
  g.cells[0][4] = { color: '#fff' };        // something already at the ceiling
  assert.equal(g.addGarbage(1, 0), true);
});

test('an empty board never tops out', async () => {
  const g = await newGrid();
  assert.equal(g.addGarbage(4, 0), false);
});

test('zero lines is a no-op', async () => {
  const g = await newGrid();
  const before = render(g);
  assert.equal(g.addGarbage(0, 3), false);
  assert.equal(render(g), before);
});

test('a hole outside the board wraps instead of vanishing', async () => {
  // A malformed or hostile message must not produce a solid, unclearable row.
  const g = await newGrid();
  g.addGarbage(1, g.cols + 2);
  assert.equal(bottom(g).includes('.'), true, 'the row has no hole at all');
});

test('a negative hole wraps too', async () => {
  const g = await newGrid();
  g.addGarbage(1, -1);
  assert.equal(bottom(g).includes('.'), true);
});

test('more lines than the board is clamped, not crashed', async () => {
  const g = await newGrid();
  g.addGarbage(g.rows + 50, 0);
  assert.equal(g.cells.length, g.rows);
});

test('garbage rows clear like any other row', async () => {
  // Filling the hole must complete the line — otherwise garbage would be
  // permanent and the mode unplayable.
  const g = await newGrid();
  g.addGarbage(1, 4);
  g.cells[g.rows - 1][4] = { color: '#fff' };
  const res = g.clearFullLines();
  assert.equal(res.count, 1);
  assert.equal(render(g).includes('#'), false, 'the board should be empty again');
});
