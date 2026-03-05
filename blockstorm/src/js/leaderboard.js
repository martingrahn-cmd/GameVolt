/**
 * BlockStorm - Leaderboard Module
 * GameVolt SDK leaderboard (replaces Firebase)
 */

// ============================================================
// Player Name (SDK-aware)
// ============================================================

function getPlayerName() {
  if (window.GameVolt) {
    var user = GameVolt.auth.getUser();
    if (user) return user.username || user.email || 'Player';
  }
  return 'Guest';
}

function regeneratePlayerName() {
  // No-op with SDK — name comes from account
  return getPlayerName();
}

// ============================================================
// Leaderboard Functions
// ============================================================

/**
 * Submit a score to the leaderboard
 * @param {string} mode - 'marathon', 'sprint', or 'ultra'
 * @param {object} data - { score, level, lines, time }
 */
async function submitScore(mode, data) {
  if (!window.GameVolt) return null;

  try {
    await GameVolt.leaderboard.submit(data.score || 0, { mode: mode });
    console.log('Score submitted via SDK:', mode, data.score);
    return { score: data.score, mode: mode };
  } catch (error) {
    console.error('Failed to submit score:', error);
    return null;
  }
}

/**
 * Get top scores for a game mode
 * @param {string} mode - 'marathon', 'sprint', or 'ultra'
 * @param {number} limit - Number of scores to fetch (default 50)
 */
async function getLeaderboard(mode, limit = 50) {
  if (!window.GameVolt) return [];

  try {
    var rows = await GameVolt.leaderboard.get({ mode: mode, limit: limit });
    return (rows || []).map(function(r, i) {
      return {
        rank: r.rank || (i + 1),
        name: r.username || 'Player',
        score: r.score || 0,
        user_id: r.user_id
      };
    });
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return [];
  }
}

// ============================================================
// Exports
// ============================================================

export {
  getPlayerName,
  regeneratePlayerName,
  submitScore,
  getLeaderboard
};
