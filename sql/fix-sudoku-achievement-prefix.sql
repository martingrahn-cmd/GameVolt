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
