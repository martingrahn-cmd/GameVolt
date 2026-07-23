const STORAGE_KEYS = {
  campaignProgress: "one-stroke-campaign-progress-v2",
  challengeRunHistory: "one-stroke-challenge-run-history-v1",
  achievementUnlocks: "one-stroke-achievement-unlocks-v1",
  dailyProgress: "one-stroke-daily-progress-v1",
};

export const CLOUD_SAVE_VERSION = 2;

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeSolvedEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  return {
    bestTimeMs: finiteNonNegative(entry.bestTimeMs),
    bestUndoCount: finiteNonNegative(entry.bestUndoCount),
    bestResetCount: finiteNonNegative(entry.bestResetCount),
    bestHintCount: finiteNonNegative(entry.bestHintCount),
    playedCount: Math.max(1, Math.floor(finiteNonNegative(entry.playedCount, 1))),
  };
}

export function normalizeCampaignProgress(progress, defaultUnlockedLevel = 1) {
  const source = progress && typeof progress === "object" ? progress : {};
  const solvedLevels = {};
  if (source.solvedLevels && typeof source.solvedLevels === "object") {
    for (const [levelId, entry] of Object.entries(source.solvedLevels)) {
      const normalized = normalizeSolvedEntry(entry);
      if (levelId && normalized) solvedLevels[levelId] = normalized;
    }
  }
  const unlocked = Number(source.unlockedLevel);
  return {
    unlockedLevel: Number.isInteger(unlocked) && unlocked >= 1 ? unlocked : defaultUnlockedLevel,
    solvedLevels,
  };
}

function bestLower(localValue, cloudValue) {
  const local = finiteNonNegative(localValue, Infinity);
  const cloud = finiteNonNegative(cloudValue, Infinity);
  const best = Math.min(local, cloud);
  return Number.isFinite(best) ? best : 0;
}

export function mergeCampaignProgress(localProgress, cloudProgress) {
  const local = normalizeCampaignProgress(localProgress);
  const cloud = normalizeCampaignProgress(cloudProgress);
  const solvedLevels = {};
  const ids = new Set([...Object.keys(local.solvedLevels), ...Object.keys(cloud.solvedLevels)]);
  for (const id of ids) {
    const a = local.solvedLevels[id];
    const b = cloud.solvedLevels[id];
    if (!a) solvedLevels[id] = b;
    else if (!b) solvedLevels[id] = a;
    else {
      solvedLevels[id] = {
        bestTimeMs: bestLower(a.bestTimeMs, b.bestTimeMs),
        bestUndoCount: bestLower(a.bestUndoCount, b.bestUndoCount),
        bestResetCount: bestLower(a.bestResetCount, b.bestResetCount),
        bestHintCount: bestLower(a.bestHintCount, b.bestHintCount),
        playedCount: Math.max(a.playedCount, b.playedCount),
      };
    }
  }
  return {
    unlockedLevel: Math.max(local.unlockedLevel, cloud.unlockedLevel),
    solvedLevels,
  };
}

export function campaignProgressFromCloudSave(save) {
  if (!save || typeof save !== "object") return normalizeCampaignProgress(null);
  if (save.campaign && typeof save.campaign === "object") return normalizeCampaignProgress(save.campaign);
  if (save.campaignProgress && typeof save.campaignProgress === "object") {
    return normalizeCampaignProgress(save.campaignProgress);
  }
  return normalizeCampaignProgress(save);
}

export function normalizeDailyProgress(progress) {
  const source = progress && typeof progress === "object" ? progress : {};
  const results = {};
  if (source.results && typeof source.results === "object") {
    for (const [dayId, result] of Object.entries(source.results)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dayId) || !result || typeof result !== "object") continue;
      results[dayId] = {
        score: finiteNonNegative(result.score),
        timeMs: finiteNonNegative(result.timeMs),
        completedCount: finiteNonNegative(result.completedCount),
        totalCount: finiteNonNegative(result.totalCount),
      };
    }
  }
  return {
    results,
    currentStreak: Math.floor(finiteNonNegative(source.currentStreak)),
    longestStreak: Math.floor(finiteNonNegative(source.longestStreak)),
  };
}

export function mergeDailyProgress(localProgress, cloudProgress) {
  const local = normalizeDailyProgress(localProgress);
  const cloud = normalizeDailyProgress(cloudProgress);
  const results = { ...cloud.results };
  for (const [dayId, localResult] of Object.entries(local.results)) {
    const cloudResult = results[dayId];
    if (!cloudResult || localResult.score > cloudResult.score
      || (localResult.score === cloudResult.score && localResult.timeMs < cloudResult.timeMs)) {
      results[dayId] = localResult;
    }
  }
  return {
    results,
    currentStreak: Math.max(local.currentStreak, cloud.currentStreak),
    longestStreak: Math.max(local.longestStreak, cloud.longestStreak),
  };
}

export function buildCloudSave(progress, dailyProgress = null) {
  return {
    version: CLOUD_SAVE_VERSION,
    campaign: normalizeCampaignProgress(progress),
    daily: normalizeDailyProgress(dailyProgress),
    updatedAt: new Date().toISOString(),
  };
}

export function mergeOneStrokeCloudSave(localProgress, cloudSave, localDailyProgress = null) {
  return buildCloudSave(
    mergeCampaignProgress(localProgress, campaignProgressFromCloudSave(cloudSave)),
    mergeDailyProgress(localDailyProgress, cloudSave?.daily),
  );
}

export function loadCampaignProgress(defaultUnlockedLevel = 1) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.campaignProgress);
    if (!raw) {
      return { unlockedLevel: defaultUnlockedLevel, solvedLevels: {} };
    }
    return normalizeCampaignProgress(JSON.parse(raw), defaultUnlockedLevel);
  } catch {
    return { unlockedLevel: defaultUnlockedLevel, solvedLevels: {} };
  }
}

export function saveCampaignProgress(progress) {
  localStorage.setItem(STORAGE_KEYS.campaignProgress, JSON.stringify(progress));
}

export function loadDailyProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.dailyProgress);
    return raw ? normalizeDailyProgress(JSON.parse(raw)) : normalizeDailyProgress(null);
  } catch {
    return normalizeDailyProgress(null);
  }
}

export function saveDailyProgress(progress) {
  localStorage.setItem(STORAGE_KEYS.dailyProgress, JSON.stringify(normalizeDailyProgress(progress)));
}

function sanitizeChallengeRunEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const safeSplits = Array.isArray(entry.splits)
    ? entry.splits
        .map((split) => ({
          index: Number(split?.index) || 0,
          levelId: String(split?.levelId ?? ""),
          levelName: String(split?.levelName ?? ""),
          difficulty: String(split?.difficulty ?? ""),
          completed: Boolean(split?.completed),
          timeMs: Number.isFinite(split?.timeMs) ? Number(split.timeMs) : null,
          undoCount: Number(split?.undoCount) || 0,
          resetCount: Number(split?.resetCount) || 0,
          hintCount: Number(split?.hintCount) || 0,
          score: Number(split?.score) || 0,
        }))
        .filter((split) => split.levelId.length > 0)
    : [];

  return {
    id: String(entry.id ?? ""),
    seed: String(entry.seed ?? ""),
    mode: ["daily", "weekly", "bonus", "friend", "challenge"].includes(entry.mode)
      ? entry.mode
      : String(entry.seed ?? "").startsWith("daily-")
        ? "daily"
        : String(entry.seed ?? "").startsWith("weekly-")
          ? "weekly"
          : String(entry.seed ?? "").startsWith("bonus-")
            ? "bonus"
            : String(entry.seed ?? "").startsWith("friend-")
              ? "friend"
              : "challenge",
    startedAt: String(entry.startedAt ?? ""),
    finishedAt: String(entry.finishedAt ?? ""),
    completedCount: Number(entry.completedCount) || 0,
    totalLevels: Number(entry.totalLevels) || 0,
    totalScore: Number(entry.totalScore) || 0,
    totalTimeMs: Number(entry.totalTimeMs) || 0,
    averageSplitMs: Number.isFinite(entry.averageSplitMs) ? Number(entry.averageSplitMs) : null,
    undoCount: Number(entry.undoCount) || 0,
    resetCount: Number(entry.resetCount) || 0,
    hintCount: Number(entry.hintCount) || 0,
    ranked: entry.ranked !== false,
    splits: safeSplits,
  };
}

export function loadChallengeRunHistory(limit = 20) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.challengeRunHistory);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => sanitizeChallengeRunEntry(entry))
      .filter(Boolean)
      .slice(0, Math.max(1, limit));
  } catch {
    return [];
  }
}

export function saveChallengeRunHistory(entries, limit = 20) {
  const sanitized = Array.isArray(entries)
    ? entries
        .map((entry) => sanitizeChallengeRunEntry(entry))
        .filter(Boolean)
        .slice(0, Math.max(1, limit))
    : [];
  localStorage.setItem(STORAGE_KEYS.challengeRunHistory, JSON.stringify(sanitized));
}

export function loadAchievementUnlocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.achievementUnlocks);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(([key, value]) => typeof key === "string" && Boolean(value)),
    );
  } catch {
    return {};
  }
}

export function saveAchievementUnlocks(unlocks) {
  const safeUnlocks = unlocks && typeof unlocks === "object"
    ? Object.fromEntries(
        Object.entries(unlocks).filter(([key, value]) => typeof key === "string" && Boolean(value)),
      )
    : {};
  localStorage.setItem(STORAGE_KEYS.achievementUnlocks, JSON.stringify(safeUnlocks));
}
