/**
 * Verify UTC/ISO identifiers and seeded Daily/Weekly challenge determinism.
 * Run: node tools/verify_competition_determinism.mjs
 * Test: node tools/verify_competition_determinism.mjs --self-test
 */

import { pathToFileURL } from "node:url";
import { CAMPAIGN_LEVELS } from "../src/data/campaign.js";
import { createBonusChallenge, createMixedChallenge } from "../src/game/challenge-pool.js";
import { todaySeed, utcDaySeed, utcWeekInfo } from "../src/game/formatting.js";

const SNAPSHOTS = [
  {
    seed: "daily-2026-07-23",
    count: 5,
    ids: ["level_015", "level_081", "level_129", "level_107", "level_176"],
    difficulties: ["easy", "medium", "hard", "medium", "very-hard"],
  },
  {
    seed: "weekly-2026-W30",
    count: 10,
    ids: [
      "level_031", "level_112", "level_049", "level_135", "level_100",
      "level_187", "level_101", "level_134", "level_044", "level_197",
    ],
    difficulties: [
      "easy", "medium", "easy", "hard", "medium",
      "very-hard", "medium", "hard", "easy", "very-hard",
    ],
  },
];

function sameValues(actual, expected) {
  return actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

export function compareSelection(challenge, expected) {
  const errors = [];
  const ids = challenge.levels.map((level) => level.id);
  const difficulties = challenge.levels.map((level) => level.difficulty);
  if (!sameValues(ids, expected.ids)) {
    errors.push(`${expected.seed}: level snapshot changed (${ids.join(", ")})`);
  }
  if (!sameValues(difficulties, expected.difficulties)) {
    errors.push(`${expected.seed}: difficulty template changed (${difficulties.join(", ")})`);
  }
  if (new Set(ids).size !== expected.count) {
    errors.push(`${expected.seed}: expected ${expected.count} distinct levels`);
  }
  return errors;
}

export function verifyCompetitionDeterminism() {
  const errors = [];
  const utcCases = [
    ["2026-07-23T00:00:00.000Z", "2026-07-23"],
    ["2026-07-23T23:59:59.999Z", "2026-07-23"],
    ["2026-07-24T00:00:00.000Z", "2026-07-24"],
    ["2027-01-01T00:15:00.000Z", "2027-01-01"],
  ];
  for (const [iso, expected] of utcCases) {
    const actual = todaySeed(new Date(iso));
    if (actual !== expected) errors.push(`UTC day mismatch for ${iso}: ${actual}`);
  }
  if (utcDaySeed(1, new Date("2027-01-01T00:15:00.000Z")) !== "2026-12-31") {
    errors.push("utcDaySeed failed across a year boundary");
  }

  const weekCases = [
    ["2020-12-31T12:00:00.000Z", "2020-W53", "2020-12-28", "2021-01-03"],
    ["2021-01-01T12:00:00.000Z", "2020-W53", "2020-12-28", "2021-01-03"],
    ["2021-01-04T00:00:00.000Z", "2021-W01", "2021-01-04", "2021-01-10"],
    ["2024-12-30T00:00:00.000Z", "2025-W01", "2024-12-30", "2025-01-05"],
  ];
  for (const [iso, id, startDay, endDay] of weekCases) {
    const actual = utcWeekInfo(new Date(iso));
    if (actual.id !== id || actual.startDay !== startDay || actual.endDay !== endDay) {
      errors.push(
        `ISO week mismatch for ${iso}: ${actual.id} ${actual.startDay}–${actual.endDay}`,
      );
    }
    if (actual.seed !== `weekly-${id}`) errors.push(`${id}: weekly seed mismatch`);
  }

  const reversedCampaign = [...CAMPAIGN_LEVELS].reverse();
  for (const snapshot of SNAPSHOTS) {
    const first = createMixedChallenge(CAMPAIGN_LEVELS, snapshot.seed, snapshot.count);
    const second = createMixedChallenge(CAMPAIGN_LEVELS, snapshot.seed, snapshot.count);
    const reversed = createMixedChallenge(reversedCampaign, snapshot.seed, snapshot.count);
    errors.push(...compareSelection(first, snapshot));
    if (!sameValues(first.levels.map((level) => level.id), second.levels.map((level) => level.id))) {
      errors.push(`${snapshot.seed}: repeated generation is not deterministic`);
    }
    if (!sameValues(first.levels.map((level) => level.id), reversed.levels.map((level) => level.id))) {
      errors.push(`${snapshot.seed}: selection depends on campaign presentation order`);
    }
  }

  const bonus = createBonusChallenge(CAMPAIGN_LEVELS, "bonus-2026-W30");
  if (bonus.levels.length !== 5
    || bonus.levels.some((level) => level.endMode !== "fixed" || !Array.isArray(level.end))) {
    errors.push("Bonus challenge fixed-end contract changed");
  }
  if (!sameValues(bonus.levels.map((level) => level.undoLimit), [2, 2, 1, 1, 1])) {
    errors.push("Bonus challenge undo limits changed");
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      utcCases: utcCases.length,
      isoWeekCases: weekCases.length,
      challengeSnapshots: SNAPSHOTS.length,
      bonusLevels: bonus.levels.length,
    },
  };
}

function printResult(result) {
  if (!result.ok) {
    console.error("❌ Competition determinism verification failed:");
    result.errors.forEach((error) => console.error(`  - ${error}`));
    return;
  }
  console.log("✅ Competition determinism verification passed");
  console.log(`   UTC boundary cases: ${result.summary.utcCases}`);
  console.log(`   ISO week cases: ${result.summary.isoWeekCases}`);
  console.log(`   Seed snapshots: ${result.summary.challengeSnapshots}`);
  console.log(`   Bonus levels: ${result.summary.bonusLevels}`);
}

async function main() {
  if (process.argv.includes("--self-test")) {
    const challenge = createMixedChallenge(CAMPAIGN_LEVELS, SNAPSHOTS[0].seed, SNAPSHOTS[0].count);
    const broken = { ...SNAPSHOTS[0], ids: ["wrong-level", ...SNAPSHOTS[0].ids.slice(1)] };
    const errors = compareSelection(challenge, broken);
    if (!errors.some((error) => error.includes("snapshot changed"))) {
      console.error("❌ Verifier self-test failed to catch a changed seed snapshot");
      process.exitCode = 1;
      return;
    }
    console.log("✅ Verifier self-test caught a changed seed snapshot");
    return;
  }

  const result = verifyCompetitionDeterminism();
  printResult(result);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
