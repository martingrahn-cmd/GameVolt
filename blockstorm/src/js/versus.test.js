// versus.test.js — two matches wired to each other, no network.
//
// VersusMatch takes its transport and its clock as arguments, so a whole
// exchange can be played out in-process: A clears, B's board rises, B
// cancels, A's board rises. That is the part worth testing before any of
// it touches Supabase, where a wrong rule looks like a connection bug.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const url = require('node:url');

const VERSUS = url.pathToFileURL(path.join(__dirname, 'versus.js')).href;
const GRID = url.pathToFileURL(path.join(__dirname, 'grid.js')).href;

let mods;
async function load() {
  if (!mods) mods = { v: await import(VERSUS), g: await import(GRID) };
  return mods;
}

// A clock the test moves by hand, so the garbage window is exact and the
// suite never sleeps.
function makeClock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

// Two matches whose sends land in each other's receive().
//
// `residue` leaves one block sitting on each board. Without it every grid
// is empty, so every clear reads as a perfect clear and the whole attack
// table collapses to 10 — which is exactly what the first run of this
// suite did. A real board almost always has a stack on it.
async function makePair({ delay = 500, hole = 0, residue = true } = {}) {
  const { v, g } = await load();
  const clock = makeClock();
  const made = {};
  const mk = (name, other) => {
    const grid = new g.Grid();
    if (residue) grid.cells[grid.rows - 1][0] = { color: '#fff' };
    return new v.VersusMatch({
      grid,
      now: clock.now,
      garbageDelayMs: delay,
      randomHole: () => hole,
      send: (type, payload) => made[other] && made[other].receive(type, payload),
    });
  };
  made.a = mk('a', 'b');
  made.b = mk('b', 'a');
  return { a: made.a, b: made.b, clock };
}

// Count only garbage rows: the residue block would otherwise be counted too.
const garbageRows = (grid) =>
  grid.cells.filter((row) => row.some((c) => c && c.garbage)).length;

test('a tetris sends four lines to the opponent', async () => {
  const { a, b, clock } = await makePair();
  a.handleLock({ lines: 4, combo: 1 });
  assert.equal(b.pendingLines, 4, 'B should have four lines queued');
  assert.equal(garbageRows(b.grid), 0, 'but nothing on the board yet');

  clock.advance(600);
  b.handleLock({ lines: 0 });           // B locks a piece; the window has passed
  assert.equal(garbageRows(b.grid), 4, 'now the garbage is standing');
  assert.equal(b.pendingLines, 0);
});

test('garbage waits out its window before rising', async () => {
  const { a, b, clock } = await makePair({ delay: 500 });
  a.handleLock({ lines: 4, combo: 1 });

  clock.advance(100);
  b.handleLock({ lines: 0 });
  assert.equal(garbageRows(b.grid), 0, 'too early — it should still be queued');
  assert.equal(b.pendingLines, 4);

  clock.advance(500);
  b.handleLock({ lines: 0 });
  assert.equal(garbageRows(b.grid), 4);
});

test('an answering clear cancels incoming instead of stacking', async () => {
  const { a, b } = await makePair();
  a.handleLock({ lines: 4, combo: 1 });        // four at B
  assert.equal(b.pendingLines, 4);

  const r = b.handleLock({ lines: 4, combo: 1 }); // B answers with a tetris
  assert.equal(r.sent, 0, 'the answer should be spent cancelling, not sent on');
  assert.equal(b.pendingLines, 0, 'B is clean');
  assert.equal(a.pendingLines, 0, 'and A receives nothing');
  assert.equal(garbageRows(b.grid), 0);
});

test('only the surplus travels', async () => {
  const { a, b } = await makePair();
  a.handleLock({ lines: 2, combo: 1 });        // a double: one line
  assert.equal(b.pendingLines, 1);

  const r = b.handleLock({ lines: 4, combo: 1 }); // four, minus the one pending
  assert.equal(r.sent, 3);
  assert.equal(a.pendingLines, 3);
  assert.equal(b.pendingLines, 0);
});

test('cancellation eats the oldest attack first', async () => {
  const { a, b } = await makePair();
  a.handleLock({ lines: 2, combo: 1 });   // 1
  a.handleLock({ lines: 3, combo: 1 });   // 2  -> queue [1, 2]
  assert.equal(b.pendingLines, 3);

  b.handleLock({ lines: 2, combo: 1 });   // 1 cancels the head exactly
  assert.equal(b.pendingLines, 2);
  assert.equal(b.incoming.length, 1, 'the spent entry should be gone');
});

test('back-to-back builds across locks and breaks on an easy clear', async () => {
  const { a, b } = await makePair();
  a.handleLock({ lines: 4, combo: 1 });                  // 4, starts the chain
  assert.equal(a.backToBack, true);
  assert.equal(b.pendingLines, 4);

  a.handleLock({ lines: 4, combo: 1 });                  // 4 + 1 for b2b
  assert.equal(b.pendingLines, 9);

  a.handleLock({ lines: 2, combo: 1 });                  // a double breaks it
  assert.equal(a.backToBack, false);
  assert.equal(b.pendingLines, 10);
});

test('a placement with no clear keeps the streak', async () => {
  const { a } = await makePair();
  a.handleLock({ lines: 4, combo: 1 });
  a.handleLock({ lines: 0 });
  assert.equal(a.backToBack, true);
});

test('a perfect clear sends ten', async () => {
  const { a, b } = await makePair({ residue: false });
  // A's board is empty after the clear, which is what isPerfectClear sees.
  a.handleLock({ lines: 4, combo: 1 });
  assert.equal(b.pendingLines, 10);
});

test('garbage that reaches the ceiling ends the match', async () => {
  const { a, b, clock } = await makePair();
  // Put a block at the top of B's board, then bury them.
  b.grid.cells[0][5] = { color: '#fff' };
  a.handleLock({ lines: 4, combo: 1 });
  clock.advance(600);
  b.handleLock({ lines: 0 });

  assert.equal(b.finished, true, 'B is out');
  assert.equal(b.won, false);
  assert.equal(a.finished, true, 'and A was told');
  assert.equal(a.won, true);
});

test('a finished match stops sending and receiving', async () => {
  const { a, b } = await makePair();
  a.lose('topout');
  assert.equal(b.won, true);

  const before = b.pendingLines;
  a.handleLock({ lines: 4, combo: 1 });
  assert.equal(b.pendingLines, before, 'a dead match must not keep attacking');

  b.receiveAttack({ lines: 4, hole: 0 });
  assert.equal(b.pendingLines, before, 'nor keep receiving');
});

test('dying at the same moment is a draw, not two winners', async () => {
  const { v, g } = await load();
  // The default pair delivers synchronously, which is precisely what a
  // simultaneous death is not: both topouts are already in flight before
  // either arrives. So hold the messages and release them afterwards.
  const wire = [];
  const made = {};
  const mk = (other) => new v.VersusMatch({
    grid: new g.Grid(),
    send: (type, payload) => wire.push([other, type, payload]),
  });
  made.a = mk('b');
  made.b = mk('a');

  made.a.lose('topout');
  made.b.lose('topout');
  wire.splice(0).forEach(([to, type, payload]) => made[to].receive(type, payload));

  assert.equal(made.a.won, false, 'neither of them won');
  assert.equal(made.b.won, false);
  assert.equal(made.a.drew, true, 'and both know it was a draw');
  assert.equal(made.b.drew, true);
});

test('an ordinary win is not a draw', async () => {
  const { a, b } = await makePair();
  a.lose('topout');
  assert.equal(b.won, true);
  assert.equal(b.drew, false);
  assert.equal(a.drew, false);
});

test('a late topout cannot overturn a win', async () => {
  const { a, b } = await makePair();
  a.lose('topout');                 // B is told they won
  b.receive('topout', {});          // a stray second message
  assert.equal(b.won, true, 'B still won');
  assert.equal(b.drew, false, 'and it is not a draw');
});

test('a malformed attack is ignored rather than trusted', async () => {
  const { b } = await makePair();
  b.receive('attack', { lines: 0, hole: 3 });
  b.receive('attack', { lines: -5, hole: 3 });
  b.receive('attack', {});
  assert.equal(b.pendingLines, 0);
});

test('singles send nothing but still cancel nothing', async () => {
  const { a, b } = await makePair();
  const r = a.handleLock({ lines: 1, combo: 1 });
  assert.equal(r.sent, 0);
  assert.equal(b.pendingLines, 0);
});
