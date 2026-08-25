-- ============================================================
-- Sudoku: Daily Challenge trophies (daily_first / daily_3 / daily_7 / daily_30)
-- ============================================================
-- The Daily Challenge shipped in sudoku/index.html with four new trophies,
-- taking Sudoku from 31 to 35. This seeds their achievement_defs rows so
-- unlocks render with a name and icon in feeds instead of as blank ghosts,
-- and updates the platinum description ("all 30" -> "all 34").
--
-- sort_order continues after the existing 1-31 block rather than renumbering
-- live rows; tier grouping is unaffected.
--
-- Run once in the Supabase SQL editor. Safe to re-run (ON CONFLICT DO NOTHING).

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  ('sudoku-daily_first', 'sudoku', 'Daily Debut',      'Complete your first Daily', '📅', 'bronze', 32),
  ('sudoku-daily_3',     'sudoku', 'Three-Peat',       '3-day Daily streak',        '📆', 'bronze', 33),
  ('sudoku-daily_7',     'sudoku', 'Weekly Ritual',    '7-day Daily streak',        '🗓️', 'silver', 34),
  ('sudoku-daily_30',    'sudoku', 'Monthly Devotion', '30-day Daily streak',       '📆', 'gold',   35)
ON CONFLICT (id) DO NOTHING;

UPDATE achievement_defs
SET description = 'Unlock all 34 other trophies'
WHERE id = 'sudoku-sudoku_master';

-- Verify: should return 5 rows (the four dailies + the updated platinum).
-- SELECT id, title, tier, description FROM achievement_defs
-- WHERE id IN ('sudoku-daily_first','sudoku-daily_3','sudoku-daily_7','sudoku-daily_30','sudoku-sudoku_master');
