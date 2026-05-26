-- ============================================================
-- Fix: Sudoku achievements were stored double-prefixed
-- ============================================================
-- The Sudoku client called GameVolt.achievements.unlock('sudoku-' + id),
-- but the SDK already prefixes with the game id. Unlocks were therefore
-- stored as 'sudoku-sudoku-<id>', which has no row in achievement_defs.
-- Effect: those trophies render blank in get_recent_activity and count in
-- the trophy total but in no tier bucket (the "139 vs 129" gap on TOP PLAYERS).
--
-- The client bug is fixed (sudoku/index.html now passes the bare id). This
-- script repairs the rows already written to the live database.
--
-- Run once in the Supabase SQL editor.

-- 1. Drop any double-prefixed row that would collide with an already-correct
--    one (so the rename below can't violate the (user_id, achievement_id)
--    unique constraint).
DELETE FROM user_achievements ua
WHERE ua.achievement_id LIKE 'sudoku-sudoku-%'
  AND EXISTS (
    SELECT 1 FROM user_achievements u2
    WHERE u2.user_id = ua.user_id
      AND u2.achievement_id = regexp_replace(ua.achievement_id, '^sudoku-sudoku-', 'sudoku-')
  );

-- 2. Rename the remaining double-prefixed unlocks to the correct id.
UPDATE user_achievements
SET achievement_id = regexp_replace(achievement_id, '^sudoku-sudoku-', 'sudoku-')
WHERE achievement_id LIKE 'sudoku-sudoku-%';

-- Verify: should return 0 rows after running.
-- SELECT achievement_id, count(*) FROM user_achievements
-- WHERE achievement_id LIKE 'sudoku-sudoku-%' GROUP BY achievement_id;

-- 3. Redeploy get_recent_activity with the hardened inner join, so any future
--    unlock that lacks a definition is skipped instead of rendered as a blank
--    "unlocked  in" ghost row. (Matches sql/schema.sql.)
CREATE OR REPLACE FUNCTION get_recent_activity(p_limit INT DEFAULT 20)
RETURNS TABLE(
  activity_type TEXT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  game_id TEXT,
  game_title TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ
) AS $$
  (
    SELECT
      'score'::TEXT AS activity_type,
      s.user_id, p.username, p.avatar_url,
      s.game_id, g.title AS game_title,
      s.score::TEXT AS detail,
      s.created_at
    FROM scores s
    JOIN profiles p ON p.id = s.user_id
    JOIN games g ON g.id = s.game_id
    ORDER BY s.created_at DESC
    LIMIT p_limit
  )
  UNION ALL
  (
    SELECT
      'achievement'::TEXT AS activity_type,
      ua.user_id, p.username, p.avatar_url,
      ad.game_id, g.title AS game_title,
      ad.title AS detail,
      ua.unlocked_at AS created_at
    FROM user_achievements ua
    JOIN profiles p ON p.id = ua.user_id
    -- Inner join: an unlock with no matching definition is skipped rather than
    -- rendered as a blank "unlocked  in" ghost row in the activity feed.
    JOIN achievement_defs ad ON ad.id = ua.achievement_id
    LEFT JOIN games g ON g.id = ad.game_id
    ORDER BY ua.unlocked_at DESC
    LIMIT p_limit
  )
  ORDER BY created_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;
