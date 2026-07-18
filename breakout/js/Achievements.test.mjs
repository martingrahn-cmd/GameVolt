import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  }
};

const { loadBOData } = await import('./Achievements.js');

store.set('bo_data', JSON.stringify({
  totalGames: 7,
  totalBricks: 321,
  bestScore: 123456,
  bestLevel: 8,
  scores: [{ score: 123456, level: 8, date: 1 }],
  unlocked: { first_blood: 1 }
}));

const migrated = loadBOData();
assert.equal(migrated.scoreVersion, 2);
assert.equal(migrated.bestScore, 0, 'legacy scores do not contaminate v2 best score');
assert.deepEqual(migrated.scores, [], 'legacy score rows do not mix with v2 rows');
assert.equal(migrated.legacyBestScore, 123456);
assert.equal(migrated.legacyScores[0].score, 123456);
assert.equal(migrated.totalGames, 7, 'non-score progression is preserved');
assert.equal(migrated.totalBricks, 321, 'lifetime brick progress is preserved');
assert.equal(migrated.unlocked.first_blood, 1, 'achievements are preserved');

const persisted = JSON.parse(store.get('bo_data'));
assert.equal(persisted.scoreVersion, 2, 'migration is persisted immediately');

console.log('✅ Breakout score migration passes');
