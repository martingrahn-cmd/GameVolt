import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const progressionSource = await readFile(new URL('js/progression.js', root), 'utf8');
const progressionUrl = `data:text/javascript;base64,${Buffer.from(progressionSource).toString('base64')}`;
const {
    RUN_TYPES,
    challengeWorld,
    checkpointWorld,
    createDefaultSave,
    dailyChallengeId,
    hasRankedChallengeAttempt,
    leaderboardMode,
    mergeSaves,
    recordChallengeAttempt,
    recordWorldClear,
    seedFromString,
    weeklyChallengeId,
} = await import(progressionUrl);

const date = new Date('2026-07-26T12:00:00Z');
assert.equal(dailyChallengeId(date), '2026-07-26');
assert.match(weeklyChallengeId(date), /^2026-W\d{2}$/);
assert.equal(challengeWorld('2026-07-26'), challengeWorld('2026-07-26'));
assert.equal(seedFromString('daily:2026-07-26'), seedFromString('daily:2026-07-26'));
assert.notEqual(seedFromString('daily:2026-07-26'), seedFromString('daily:2026-07-27'));
assert.ok(challengeWorld('2026-07-26') >= 0 && challengeWorld('2026-07-26') < 5);
assert.equal(leaderboardMode(RUN_TYPES.DAILY, 1, '2026-07-26'), 'daily-2026-07-26');
assert.match(leaderboardMode(RUN_TYPES.WEEKLY, 1, weeklyChallengeId(date)), /^weekly-2026-W\d{2}$/);
assert.equal(leaderboardMode(RUN_TYPES.CONTINUE, 1), null);

const initial = createDefaultSave();
assert.equal(checkpointWorld(initial), 0);
const cleared = recordWorldClear(initial, 1, 1);
assert.equal(checkpointWorld(cleared), 2);

const attempted = recordChallengeAttempt(initial, RUN_TYPES.DAILY, '2026-07-26');
assert.equal(hasRankedChallengeAttempt(attempted, RUN_TYPES.DAILY, '2026-07-26'), true);
assert.equal(hasRankedChallengeAttempt(attempted, RUN_TYPES.WEEKLY, '2026-W30'), false);
const merged = mergeSaves(initial, attempted);
assert.equal(hasRankedChallengeAttempt(merged, RUN_TYPES.DAILY, '2026-07-26'), true);

const gameSource = await readFile(new URL('js/game.js', root), 'utf8');
const configSource = await readFile(new URL('js/config.js', root), 'utf8');
const audioSource = await readFile(new URL('js/audio.js', root), 'utf8');
const serviceWorkerSource = await readFile(new URL('sw.js', root), 'utf8');

assert.match(configSource, /export const WORLD_RULES/);
assert.match(configSource, /ASTEROID FIELD/);
assert.match(configSource, /SHIELD GRID/);
assert.match(gameSource, /formationDelay = 34 \+ Math\.floor\(this\._random/);
assert.match(gameSource, /seedFromString/);
assert.match(gameSource, /telegraphTimer/);
assert.match(gameSource, /GRID DOWN/);
assert.match(gameSource, /BOSS .*DAMAGE .*3 PHASES/);
assert.match(gameSource, /selectedType/);

assert.match(gameSource, /CONTINUE WORLD/);
assert.match(gameSource, /RUN_TYPES\.CONTINUE/);
assert.match(gameSource, /DAILY SECTOR/);
assert.match(gameSource, /WEEKLY BOSS/);
assert.match(gameSource, /ONE RANKED ATTEMPT/);

assert.match(gameSource, /reducedMotion/);
assert.match(gameSource, /colorblindMode/);
assert.match(gameSource, /this\.shake\.disabled/);
assert.match(gameSource, /ctx\.rect\(b\.x - bulletRadius/);

assert.match(audioSource, /loadTrack\(track\)/);
assert.match(audioSource, /resp\.body\.getReader/);
assert.match(audioSource, /preloadWorld\(worldIndex\)/);
assert.doesNotMatch(audioSource, /await this\.bgmPlayer\.loadAll\(\)/);
assert.match(serviceWorkerSource, /axeluga-v8/);

console.log('Axeluga P2 contracts verified.');
