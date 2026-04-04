export const TROPHY_TIER_ORDER = ["bronze", "silver", "gold", "platinum"];

export const TROPHY_TIER_META = {
  bronze: { label: "Bronze", total: 15 },
  silver: { label: "Silver", total: 10 },
  gold: { label: "Gold", total: 5 },
  platinum: { label: "Platinum", total: 1 },
};

export function createTrophyCatalog(campaignTotalLevels) {
  const catalog = [
    // ── Bronze (15) ──
    {
      id: "b01",
      tier: "bronze",
      icon: "👣",
      name: "First Step",
      description: "Solve 1 campaign level.",
      check: (metrics) => metrics.campaignSolvedCount >= 1,
    },
    {
      id: "b02",
      tier: "bronze",
      icon: "✋",
      name: "High Five",
      description: "Solve 5 campaign levels.",
      check: (metrics) => metrics.campaignSolvedCount >= 5,
    },
    {
      id: "b03",
      tier: "bronze",
      icon: "🔟",
      name: "Ten Down",
      description: "Solve 10 campaign levels.",
      check: (metrics) => metrics.campaignSolvedCount >= 10,
    },
    {
      id: "b04",
      tier: "bronze",
      icon: "📊",
      name: "Twenty Down",
      description: "Solve 20 campaign levels.",
      check: (metrics) => metrics.campaignSolvedCount >= 20,
    },
    {
      id: "b05",
      tier: "bronze",
      icon: "📈",
      name: "Thirty Down",
      description: "Solve 30 campaign levels.",
      check: (metrics) => metrics.campaignSolvedCount >= 30,
    },
    {
      id: "b06",
      tier: "bronze",
      icon: "🎮",
      name: "Getting Started",
      description: "Play 10 campaign level attempts.",
      check: (metrics) => metrics.campaignPlayedCount >= 10,
    },
    {
      id: "b07",
      tier: "bronze",
      icon: "🕹️",
      name: "Warming Up",
      description: "Play 25 campaign level attempts.",
      check: (metrics) => metrics.campaignPlayedCount >= 25,
    },
    {
      id: "b08",
      tier: "bronze",
      icon: "⚡",
      name: "Challenger",
      description: "Complete your first challenge run.",
      check: (metrics) => metrics.challengeRunCount >= 1,
    },
    {
      id: "b09",
      tier: "bronze",
      icon: "🏁",
      name: "Full Run",
      description: "Complete an entire challenge.",
      check: (metrics) => metrics.completedChallengeCount >= 1,
    },
    {
      id: "b10",
      tier: "bronze",
      icon: "💎",
      name: "Score 3K",
      description: "Reach 3,000 points in a challenge run.",
      check: (metrics) => metrics.bestChallengeScore >= 3000,
    },
    {
      id: "b11",
      tier: "bronze",
      icon: "💠",
      name: "Score 5K",
      description: "Reach 5,000 points in a challenge run.",
      check: (metrics) => metrics.bestChallengeScore >= 5000,
    },
    {
      id: "b12",
      tier: "bronze",
      icon: "🧠",
      name: "No Hints",
      description: "Complete a challenge run without using hints.",
      check: (metrics) => metrics.noHintCompletedCount >= 1,
    },
    {
      id: "b13",
      tier: "bronze",
      icon: "🔒",
      name: "No Resets",
      description: "Complete a challenge run without resetting.",
      check: (metrics) => metrics.noResetCompletedCount >= 1,
    },
    {
      id: "b14",
      tier: "bronze",
      icon: "🎯",
      name: "Steady Hand",
      description: "Complete a challenge run with 20 undos or less.",
      check: (metrics) => metrics.lowUndoCompletedCount >= 1,
    },
    {
      id: "b15",
      tier: "bronze",
      icon: "🏋️",
      name: "Dedicated",
      description: "Play 50 campaign level attempts.",
      check: (metrics) => metrics.campaignPlayedCount >= 50,
    },

    // ── Silver (10) ──
    {
      id: "s01",
      tier: "silver",
      icon: "⭐",
      name: "Halfway There",
      description: "Solve 50 campaign levels.",
      check: (metrics) => metrics.campaignSolvedCount >= 50,
    },
    {
      id: "s02",
      tier: "silver",
      icon: "🌟",
      name: "75 Club",
      description: "Solve 75 campaign levels.",
      check: (metrics) => metrics.campaignSolvedCount >= 75,
    },
    {
      id: "s03",
      tier: "silver",
      icon: "💫",
      name: "Century",
      description: "Solve 100 campaign levels.",
      check: (metrics) => metrics.campaignSolvedCount >= 100,
    },
    {
      id: "s04",
      tier: "silver",
      icon: "✨",
      name: "150 Strong",
      description: "Solve 150 campaign levels.",
      check: (metrics) => metrics.campaignSolvedCount >= 150,
    },
    {
      id: "s05",
      tier: "silver",
      icon: "🏅",
      name: "Hat Trick",
      description: "Complete 3 full challenge runs.",
      check: (metrics) => metrics.completedChallengeCount >= 3,
    },
    {
      id: "s06",
      tier: "silver",
      icon: "🎖️",
      name: "Veteran",
      description: "Complete 5 full challenge runs.",
      check: (metrics) => metrics.completedChallengeCount >= 5,
    },
    {
      id: "s07",
      tier: "silver",
      icon: "🔥",
      name: "Score 8K",
      description: "Reach 8,000 points in a challenge run.",
      check: (metrics) => metrics.bestChallengeScore >= 8000,
    },
    {
      id: "s08",
      tier: "silver",
      icon: "💰",
      name: "Score 10K",
      description: "Reach 10,000 points in a challenge run.",
      check: (metrics) => metrics.bestChallengeScore >= 10000,
    },
    {
      id: "s09",
      tier: "silver",
      icon: "⏱️",
      name: "Speed Runner",
      description: "Complete a challenge run in under 6:00.",
      check: (metrics) => Number.isFinite(metrics.bestChallengeTimeMs) && metrics.bestChallengeTimeMs <= 360_000,
    },
    {
      id: "s10",
      tier: "silver",
      icon: "🪂",
      name: "No Safety Net",
      description: "Complete a challenge run with no hints and no resets.",
      check: (metrics) => metrics.noHintNoResetCompletedCount >= 1,
    },

    // ── Gold (5) ──
    {
      id: "g01",
      tier: "gold",
      icon: "👑",
      name: "Campaign Master",
      description: "Solve all 200 campaign levels.",
      check: (metrics) => metrics.campaignSolvedCount >= campaignTotalLevels,
    },
    {
      id: "g02",
      tier: "gold",
      icon: "🏆",
      name: "Challenge Legend",
      description: "Complete 10 full challenge runs.",
      check: (metrics) => metrics.completedChallengeCount >= 10,
    },
    {
      id: "g03",
      tier: "gold",
      icon: "💎",
      name: "Score 12K",
      description: "Reach 12,000 points in a challenge run.",
      check: (metrics) => metrics.bestChallengeScore >= 12000,
    },
    {
      id: "g04",
      tier: "gold",
      icon: "⚡",
      name: "Elite Pace",
      description: "Complete a challenge run in under 4:30.",
      check: (metrics) => Number.isFinite(metrics.bestChallengeTimeMs) && metrics.bestChallengeTimeMs <= 270_000,
    },
    {
      id: "g05",
      tier: "gold",
      icon: "🌈",
      name: "Perfect Run",
      description: "Complete a challenge run with 0 hints, 0 resets and 0 undos.",
      check: (metrics) => metrics.perfectCompletedCount >= 1,
    },

    // ── Platinum (1) ──
    {
      id: "p01",
      tier: "platinum",
      icon: "👑",
      name: "Platinum Path",
      description: "Unlock all 30 other trophies.",
      check: null,
    },
  ];

  // Validate trophy distribution matches tier metadata
  const trophyDistribution = catalog.reduce((acc, trophy) => {
    acc[trophy.tier] = (acc[trophy.tier] ?? 0) + 1;
    return acc;
  }, {});
  if (
    trophyDistribution.bronze !== TROPHY_TIER_META.bronze.total ||
    trophyDistribution.silver !== TROPHY_TIER_META.silver.total ||
    trophyDistribution.gold !== TROPHY_TIER_META.gold.total ||
    trophyDistribution.platinum !== TROPHY_TIER_META.platinum.total
  ) {
    throw new Error("Trophy catalog must contain 15 bronze, 10 silver, 5 gold and 1 platinum.");
  }

  return catalog;
}
