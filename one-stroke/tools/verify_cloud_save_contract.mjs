/**
 * Verify One Stroke cloud-save normalization and cross-device merge rules.
 * Run: node tools/verify_cloud_save_contract.mjs
 * Test: node tools/verify_cloud_save_contract.mjs --self-test
 */

import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import {
  CLOUD_SAVE_VERSION,
  buildCloudSave,
  campaignProgressFromCloudSave,
  mergeCampaignProgress,
  mergeDailyProgress,
  mergeOneStrokeCloudSave,
  normalizeCampaignProgress,
  normalizeDailyProgress,
} from "../src/game/storage.js";

function same(actual, expected) {
  return isDeepStrictEqual(actual, expected);
}

function expectEqual(errors, label, actual, expected) {
  if (!same(actual, expected)) {
    errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function verifyCloudSaveContract() {
  const errors = [];
  const localCampaign = {
    unlockedLevel: 12,
    solvedLevels: {
      level_001: {
        bestTimeMs: 9000,
        bestUndoCount: 1,
        bestResetCount: 0,
        bestHintCount: 2,
        playedCount: 3,
      },
      level_002: {
        bestTimeMs: 14000,
        bestUndoCount: 0,
        bestResetCount: 1,
        bestHintCount: 0,
        playedCount: 2,
      },
    },
  };
  const cloudCampaign = {
    unlockedLevel: 18,
    solvedLevels: {
      level_001: {
        bestTimeMs: 8000,
        bestUndoCount: 2,
        bestResetCount: 1,
        bestHintCount: 1,
        playedCount: 5,
      },
      level_003: {
        bestTimeMs: 20000,
        bestUndoCount: 3,
        bestResetCount: 2,
        bestHintCount: 1,
        playedCount: 1,
      },
    },
  };
  const mergedCampaign = mergeCampaignProgress(localCampaign, cloudCampaign);
  expectEqual(errors, "campaign unlocked max", mergedCampaign.unlockedLevel, 18);
  expectEqual(errors, "campaign solved union", Object.keys(mergedCampaign.solvedLevels).sort(), [
    "level_001", "level_002", "level_003",
  ]);
  expectEqual(errors, "campaign per-field best", mergedCampaign.solvedLevels.level_001, {
    bestTimeMs: 8000,
    bestUndoCount: 1,
    bestResetCount: 0,
    bestHintCount: 1,
    playedCount: 5,
  });
  expectEqual(
    errors,
    "campaign merge commutative",
    mergeCampaignProgress(localCampaign, cloudCampaign),
    mergeCampaignProgress(cloudCampaign, localCampaign),
  );

  const invalid = normalizeCampaignProgress({
    unlockedLevel: -4,
    solvedLevels: {
      level_bad: {
        bestTimeMs: -1,
        bestUndoCount: "invalid",
        playedCount: 0,
      },
      ignored: null,
    },
  });
  expectEqual(errors, "invalid campaign normalization", invalid, {
    unlockedLevel: 1,
    solvedLevels: {
      level_bad: {
        bestTimeMs: 0,
        bestUndoCount: 0,
        bestResetCount: 0,
        bestHintCount: 0,
        playedCount: 1,
      },
    },
  });

  const legacy = campaignProgressFromCloudSave({
    campaignProgress: cloudCampaign,
  });
  expectEqual(errors, "legacy campaignProgress migration", legacy, normalizeCampaignProgress(cloudCampaign));
  const rootLegacy = campaignProgressFromCloudSave(localCampaign);
  expectEqual(errors, "root legacy migration", rootLegacy, normalizeCampaignProgress(localCampaign));

  const dailyA = {
    results: {
      "2026-07-20": { score: 9000, timeMs: 60000, completedCount: 5, totalCount: 5 },
      "2026-07-21": { score: 8000, timeMs: 50000, completedCount: 4, totalCount: 5 },
      "2026-07-22": { score: 7000, timeMs: 45000, completedCount: 5, totalCount: 5 },
    },
    currentStreak: 2,
    longestStreak: 4,
  };
  const dailyB = {
    results: {
      "2026-07-20": { score: 9500, timeMs: 70000, completedCount: 5, totalCount: 5 },
      "2026-07-21": { score: 8000, timeMs: 48000, completedCount: 4, totalCount: 5 },
      "2026-07-22": { score: 7000, timeMs: 45000, completedCount: 4, totalCount: 5 },
    },
    currentStreak: 3,
    longestStreak: 3,
  };
  const mergedDaily = mergeDailyProgress(dailyA, dailyB);
  expectEqual(errors, "daily higher score wins", mergedDaily.results["2026-07-20"].score, 9500);
  expectEqual(errors, "daily tie uses lower time", mergedDaily.results["2026-07-21"].timeMs, 48000);
  expectEqual(
    errors,
    "daily exact score/time tie uses completion",
    mergedDaily.results["2026-07-22"].completedCount,
    5,
  );
  expectEqual(errors, "daily streak maxima", {
    currentStreak: mergedDaily.currentStreak,
    longestStreak: mergedDaily.longestStreak,
  }, {
    currentStreak: 3,
    longestStreak: 4,
  });
  expectEqual(
    errors,
    "daily merge commutative",
    mergeDailyProgress(dailyA, dailyB),
    mergeDailyProgress(dailyB, dailyA),
  );

  const cloudSave = buildCloudSave(localCampaign, dailyA);
  expectEqual(errors, "cloud save version", cloudSave.version, CLOUD_SAVE_VERSION);
  if (!Number.isFinite(Date.parse(cloudSave.updatedAt))) {
    errors.push("cloud save updatedAt is not a valid ISO timestamp");
  }
  const mergedSave = mergeOneStrokeCloudSave(
    localCampaign,
    { version: CLOUD_SAVE_VERSION, campaign: cloudCampaign, daily: dailyB },
    dailyA,
  );
  expectEqual(errors, "full save campaign merge", mergedSave.campaign, mergedCampaign);
  expectEqual(errors, "full save daily merge", mergedSave.daily, mergedDaily);
  expectEqual(errors, "daily invalid day IDs ignored", normalizeDailyProgress({
    results: {
      nope: { score: 100 },
      "2026-07-23": { score: -5, timeMs: -1, completedCount: 5, totalCount: 5 },
    },
  }).results, {
    "2026-07-23": { score: 0, timeMs: 0, completedCount: 5, totalCount: 5 },
  });

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      version: CLOUD_SAVE_VERSION,
      campaignLevelsMerged: Object.keys(mergedCampaign.solvedLevels).length,
      dailyResultsMerged: Object.keys(mergedDaily.results).length,
      legacyShapes: 2,
    },
  };
}

function printResult(result) {
  if (!result.ok) {
    console.error("❌ Cloud-save contract verification failed:");
    result.errors.forEach((error) => console.error(`  - ${error}`));
    return;
  }
  console.log("✅ Cloud-save contract verification passed");
  console.log(`   Schema version: ${result.summary.version}`);
  console.log(`   Campaign entries merged: ${result.summary.campaignLevelsMerged}`);
  console.log(`   Daily results merged: ${result.summary.dailyResultsMerged}`);
  console.log(`   Legacy save shapes: ${result.summary.legacyShapes}`);
}

async function main() {
  if (process.argv.includes("--self-test")) {
    const errors = [];
    expectEqual(errors, "injected mismatch", { version: 1 }, { version: 2 });
    if (!errors.some((error) => error.includes("injected mismatch"))) {
      console.error("❌ Verifier self-test failed to catch a contract mismatch");
      process.exitCode = 1;
      return;
    }
    console.log("✅ Verifier self-test caught an injected cloud-save mismatch");
    return;
  }

  const result = verifyCloudSaveContract();
  printResult(result);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
