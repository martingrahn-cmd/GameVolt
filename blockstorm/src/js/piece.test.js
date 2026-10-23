// piece.test.js — the 7-bag, seeded and unseeded.
//
// The seed exists so two players in a versus room draw the same pieces.
// Most of what is pinned here is the other direction: that single-player,
// which is what people actually play today, stayed random. A bag that
// quietly became deterministic would still pass a "does it run" check and
// would ruin the game for everyone.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const url = require('node:url');

const MODULE = url.pathToFileURL(path.join(__dirname, 'piece.js')).href;

// piece.js is an ES module; import() once and reuse. resetPieceBag() clears
// the state each test needs, so the shared instance is not a problem.
let piece;
async function load() {
  if (!piece) piece = await import(MODULE);
  return piece;
}

// A sequence of piece types, e.g. "ZOTLSIJ..."
async function sequence(seed, count = 28) {
  const { createRandomPiece, resetPieceBag } = await load();
  resetPieceBag(seed);
  let out = '';
  for (let i = 0; i < count; i++) out += createRandomPiece().type;
  return out;
}

// Every group of seven must hold all seven distinct pieces — that is what
// makes it a 7-bag rather than a random stream, and it must survive seeding.
function isValidBagSequence(seq) {
  for (let i = 0; i + 7 <= seq.length; i += 7) {
    if (new Set(seq.slice(i, i + 7)).size !== 7) return false;
  }
  return true;
}

test('unseeded bags stay random — single-player must not become deterministic', async () => {
  const a = await sequence(undefined, 56);
  const b = await sequence(undefined, 56);
  assert.notEqual(a, b, 'two unseeded runs produced the identical sequence');
});

test('resetPieceBag() with no argument still works', async () => {
  const seq = await sequence(undefined, 14);
  assert.equal(seq.length, 14);
  assert.ok(isValidBagSequence(seq), `not a valid 7-bag: ${seq}`);
});

test('the same seed gives the same sequence', async () => {
  const a = await sequence(12345);
  const b = await sequence(12345);
  assert.equal(a, b);
});

test('different seeds give different sequences', async () => {
  assert.notEqual(await sequence(12345), await sequence(99999));
});

test('seeding does not break the 7-bag property', async () => {
  for (const seed of [1, 12345, 99999, 0xffffffff]) {
    const seq = await sequence(seed, 70);
    assert.ok(isValidBagSequence(seq), `seed ${seed} produced ${seq}`);
  }
});

test('a seeded match does not leave the next single-player game deterministic', async () => {
  // The realistic bug: play versus, go back to the menu, start a normal game
  // and get the same pieces every time. resetPieceBag() with no seed has to
  // put Math.random back.
  await sequence(12345);
  const a = await sequence(undefined, 56);
  const b = await sequence(undefined, 56);
  assert.notEqual(a, b, 'the bag stayed seeded after returning to single-player');
});

test('seed 0 counts as no seed', async () => {
  // `if (!seed)` treats 0 as absent, so a caller that computes a seed badly
  // gets randomness rather than every match sharing one sequence.
  const a = await sequence(0, 56);
  const b = await sequence(0, 56);
  assert.notEqual(a, b);
});
