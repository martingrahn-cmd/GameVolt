import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const progressionSource = await readFile(new URL('js/progression.js', root), 'utf8');
const progressionUrl = `data:text/javascript;base64,${Buffer.from(progressionSource).toString('base64')}`;
const {
  RUN_TYPES,
  createDefaultSave,
  isFullCampaignRun,
  isWorldUnlocked,
  leaderboardMode,
  mergeSaves,
  recordCampaignScore,
  recordWorldClear,
} = await import(progressionUrl);

assert.equal(leaderboardMode(RUN_TYPES.CAMPAIGN, 0), 'campaign-easy');
assert.equal(leaderboardMode(RUN_TYPES.CAMPAIGN, 1), 'campaign-medium');
assert.equal(leaderboardMode(RUN_TYPES.CAMPAIGN, 2), 'campaign-hard');
assert.equal(leaderboardMode(RUN_TYPES.PRACTICE, 2), null);

const initial = createDefaultSave();
assert.equal(isWorldUnlocked(initial, 0), true);
assert.equal(isWorldUnlocked(initial, 1), false);

const afterWorldOne = recordWorldClear(initial, 0, 1);
assert.equal(isWorldUnlocked(afterWorldOne, 1), true);
assert.deepEqual(afterWorldOne.campaign.clearsByDifficulty.medium, [0]);

const afterWorldTwo = recordWorldClear(afterWorldOne, 1, 2);
const merged = mergeSaves(afterWorldOne, afterWorldTwo);
assert.equal(merged.campaign.highestUnlockedWorld, 2);
assert.deepEqual(merged.campaign.clearsByDifficulty.medium, [0]);
assert.deepEqual(merged.campaign.clearsByDifficulty.hard, [1]);

const scored = recordCampaignScore(initial, 2, 123456);
assert.equal(scored.records.campaignHard, 123456);
assert.equal(recordCampaignScore(scored, 2, 100).records.campaignHard, 123456);

assert.equal(isFullCampaignRun({
  type: RUN_TYPES.CAMPAIGN,
  startWorld: 0,
  worldsCleared: [0, 1, 2, 3, 4],
}), true);
assert.equal(isFullCampaignRun({
  type: RUN_TYPES.PRACTICE,
  startWorld: 4,
  worldsCleared: [4],
}), false);
assert.equal(isFullCampaignRun({
  type: RUN_TYPES.CAMPAIGN,
  startWorld: 0,
  worldsCleared: [0, 1, 2, 4],
}), false);

const gameSource = await readFile(new URL('js/game.js', root), 'utf8');
assert.doesNotMatch(gameSource, /DEBUG: MAX POWER START/);
assert.doesNotMatch(gameSource, /leaderboard\.submit\(this\.score,\s*\{\s*mode:\s*['"]default['"]/);
assert.match(gameSource, /if \(!isFullCampaignRun\(this\.run\)\) return;/);
assert.match(gameSource, /if \(this\._isRankedRun\(\)\)/);

const serviceWorkerSource = await readFile(new URL('sw.js', root), 'utf8');
assert.match(serviceWorkerSource, /\.\/js\/progression\.js/);
assert.match(serviceWorkerSource, /axeluga-v8/);

console.log('Axeluga P0 contracts verified.');
