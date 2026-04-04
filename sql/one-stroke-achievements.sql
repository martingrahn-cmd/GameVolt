-- ============================================================
-- One Stroke: 31 achievement definitions (English)
-- Run in Supabase SQL Editor
-- Deletes old entries first, then inserts fresh.
-- ============================================================

DELETE FROM achievement_defs WHERE game_id = 'one-stroke';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  -- Bronze (15)
  ('one-stroke-b01', 'one-stroke', 'First Step',      'Solve 1 campaign level',                          '👣', 'bronze', 1),
  ('one-stroke-b02', 'one-stroke', 'High Five',       'Solve 5 campaign levels',                         '✋', 'bronze', 2),
  ('one-stroke-b03', 'one-stroke', 'Ten Down',        'Solve 10 campaign levels',                        '🔟', 'bronze', 3),
  ('one-stroke-b04', 'one-stroke', 'Twenty Down',     'Solve 20 campaign levels',                        '📊', 'bronze', 4),
  ('one-stroke-b05', 'one-stroke', 'Thirty Down',     'Solve 30 campaign levels',                        '📈', 'bronze', 5),
  ('one-stroke-b06', 'one-stroke', 'Getting Started', 'Play 10 campaign level attempts',                 '🎮', 'bronze', 6),
  ('one-stroke-b07', 'one-stroke', 'Warming Up',      'Play 25 campaign level attempts',                 '🕹️', 'bronze', 7),
  ('one-stroke-b08', 'one-stroke', 'Challenger',      'Complete your first challenge run',                '⚡', 'bronze', 8),
  ('one-stroke-b09', 'one-stroke', 'Full Run',        'Complete an entire challenge',                    '🏁', 'bronze', 9),
  ('one-stroke-b10', 'one-stroke', 'Score 3K',        'Reach 3,000 points in a challenge run',           '💎', 'bronze', 10),
  ('one-stroke-b11', 'one-stroke', 'Score 5K',        'Reach 5,000 points in a challenge run',           '💠', 'bronze', 11),
  ('one-stroke-b12', 'one-stroke', 'No Hints',        'Complete a challenge run without using hints',     '🧠', 'bronze', 12),
  ('one-stroke-b13', 'one-stroke', 'No Resets',       'Complete a challenge run without resetting',       '🔒', 'bronze', 13),
  ('one-stroke-b14', 'one-stroke', 'Steady Hand',     'Complete a challenge run with 20 undos or less',   '🎯', 'bronze', 14),
  ('one-stroke-b15', 'one-stroke', 'Dedicated',       'Play 50 campaign level attempts',                 '🏋️', 'bronze', 15),

  -- Silver (10)
  ('one-stroke-s01', 'one-stroke', 'Halfway There',   'Solve 50 campaign levels',                        '⭐', 'silver', 16),
  ('one-stroke-s02', 'one-stroke', '75 Club',         'Solve 75 campaign levels',                        '🌟', 'silver', 17),
  ('one-stroke-s03', 'one-stroke', 'Century',         'Solve 100 campaign levels',                       '💫', 'silver', 18),
  ('one-stroke-s04', 'one-stroke', '150 Strong',      'Solve 150 campaign levels',                       '✨', 'silver', 19),
  ('one-stroke-s05', 'one-stroke', 'Hat Trick',       'Complete 3 full challenge runs',                   '🏅', 'silver', 20),
  ('one-stroke-s06', 'one-stroke', 'Veteran',         'Complete 5 full challenge runs',                   '🎖️', 'silver', 21),
  ('one-stroke-s07', 'one-stroke', 'Score 8K',        'Reach 8,000 points in a challenge run',           '🔥', 'silver', 22),
  ('one-stroke-s08', 'one-stroke', 'Score 10K',       'Reach 10,000 points in a challenge run',          '💰', 'silver', 23),
  ('one-stroke-s09', 'one-stroke', 'Speed Runner',    'Complete a challenge run in under 6:00',           '⏱️', 'silver', 24),
  ('one-stroke-s10', 'one-stroke', 'No Safety Net',   'Complete a challenge run with no hints and no resets', '🪂', 'silver', 25),

  -- Gold (5)
  ('one-stroke-g01', 'one-stroke', 'Campaign Master',  'Solve all 200 campaign levels',                  '👑', 'gold', 26),
  ('one-stroke-g02', 'one-stroke', 'Challenge Legend',  'Complete 10 full challenge runs',                '🏆', 'gold', 27),
  ('one-stroke-g03', 'one-stroke', 'Score 12K',        'Reach 12,000 points in a challenge run',         '💎', 'gold', 28),
  ('one-stroke-g04', 'one-stroke', 'Elite Pace',       'Complete a challenge run in under 4:30',          '⚡', 'gold', 29),
  ('one-stroke-g05', 'one-stroke', 'Perfect Run',      'Complete a challenge run with 0 hints, 0 resets, 0 undos', '🌈', 'gold', 30),

  -- Platinum (1)
  ('one-stroke-p01', 'one-stroke', 'Platinum Path',    'Unlock all 30 other trophies',                   '👑', 'platinum', 31);
