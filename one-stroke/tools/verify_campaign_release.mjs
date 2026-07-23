/**
 * Release guardrail for the curated One Stroke campaign.
 * Run: node tools/verify_campaign_release.mjs
 * Optional verifier smoke test: node tools/verify_campaign_release.mjs --self-test
 */

import { pathToFileURL } from "node:url";
import { CAMPAIGN_LEVELS } from "../src/data/campaign.js";
import { validateCampaignLevels } from "../src/core/level-integrity.js";

const EXPECTED_TOTAL = 200;
const EXPECTED_COUNTS = {
  easy: 60,
  medium: 60,
  hard: 50,
  "very-hard": 30,
};
const LOCKED_OPENING_IDS = [
  "level_001", "level_002", "level_003", "level_004", "level_005",
  "level_006", "level_007", "level_008", "level_012", "level_015",
  "level_010", "level_016", "level_018", "level_017", "level_011",
  "level_013", "level_009", "level_020", "level_014", "level_019",
];
const LARGE_BRANCH_JUMP = 0.15;
const MAX_CONSECUTIVE_JUMPS = 3;

function isInstructional(level) {
  return level.pathStyle === "tutorial" || level.pathStyle === "bridge";
}

export function verifyCampaignRelease(levels) {
  const errors = [];
  const integrity = validateCampaignLevels(levels);
  for (const issue of integrity.issues) {
    errors.push(`${issue.id}: ${issue.reason}`);
  }

  if (levels.length !== EXPECTED_TOTAL) {
    errors.push(`Expected ${EXPECTED_TOTAL} levels, found ${levels.length}`);
  }

  const actualOpening = levels.slice(0, LOCKED_OPENING_IDS.length).map((level) => level.id);
  if (actualOpening.join("|") !== LOCKED_OPENING_IDS.join("|")) {
    errors.push("The save-safe opening order (levels 1–20) changed");
  }

  if (!levels.every((level, index) => level.campaignIndex === index + 1)) {
    errors.push("Campaign indexes are not sequential");
  }

  for (const [difficulty, expectedCount] of Object.entries(EXPECTED_COUNTS)) {
    const band = levels.filter((level) => level.difficulty === difficulty);
    if (band.length !== expectedCount) {
      errors.push(`${difficulty}: expected ${expectedCount} levels, found ${band.length}`);
    }

    const curatedBand = band.filter((level) => level.campaignIndex > LOCKED_OPENING_IDS.length);
    for (let index = 1; index < curatedBand.length; index += 1) {
      if (curatedBand[index].par < curatedBand[index - 1].par) {
        errors.push(
          `${difficulty}: par decreases at ${curatedBand[index - 1].campaignIndex} → ` +
          `${curatedBand[index].campaignIndex}`,
        );
      }
    }
  }

  let consecutiveJumps = 0;
  for (const difficulty of Object.keys(EXPECTED_COUNTS)) {
    const band = levels.filter((level) => level.difficulty === difficulty);
    for (let index = 1; index < band.length; index += 1) {
      if (isInstructional(band[index])) continue;
      const delta = Math.abs(band[index].branchingRatio - band[index - 1].branchingRatio);
      if (delta > LARGE_BRANCH_JUMP) consecutiveJumps += 1;
    }
  }
  if (consecutiveJumps > MAX_CONSECUTIVE_JUMPS) {
    errors.push(
      `Consecutive branching jumps regressed: ${consecutiveJumps} > ${MAX_CONSECUTIVE_JUMPS}`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      levels: levels.length,
      openingLocked: actualOpening.join("|") === LOCKED_OPENING_IDS.join("|"),
      consecutiveJumps,
    },
  };
}

function printResult(result) {
  if (!result.ok) {
    console.error("❌ Campaign release verification failed:");
    result.errors.forEach((error) => console.error(`  - ${error}`));
    return;
  }
  console.log("✅ Campaign release verification passed");
  console.log(`   Levels: ${result.summary.levels}`);
  console.log(`   Save-safe opening locked: ${result.summary.openingLocked ? "yes" : "no"}`);
  console.log(`   Consecutive branching jumps: ${result.summary.consecutiveJumps}`);
}

async function main() {
  if (process.argv.includes("--self-test")) {
    const broken = CAMPAIGN_LEVELS.map((level) => ({ ...level }));
    broken[20].id = broken[19].id;
    const result = verifyCampaignRelease(broken);
    if (result.ok || !result.errors.some((error) => error.includes("Duplicate id"))) {
      console.error("❌ Verifier self-test failed to catch a duplicate level ID");
      process.exitCode = 1;
      return;
    }
    console.log("✅ Verifier self-test caught an injected duplicate level ID");
    return;
  }

  const result = verifyCampaignRelease(CAMPAIGN_LEVELS);
  printResult(result);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
