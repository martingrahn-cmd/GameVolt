-- ============================================================
-- TapRush Supabase seed — run once in Supabase SQL Editor
-- Safe to re-run (uses ON CONFLICT DO NOTHING).
-- ============================================================

-- 1. Games registry row
--    The SDK uses game_id='taprush' everywhere (scores, user_achievements,
--    saves, favorites, ratings). Without this row, any INSERT referencing
--    it will fail the foreign-key check and silently no-op.
INSERT INTO games (id, title, thumbnail_url) VALUES
  ('taprush', 'Tap Rush', '/assets/thumbnails/taprush.webp')
ON CONFLICT (id) DO NOTHING;

-- Optional: remove the legacy 'clickrush' row (old name for the same game).
-- Uncomment if no historical data references it — safe because there's no
-- data for it in scores/user_achievements/saves.
-- DELETE FROM games WHERE id = 'clickrush';

-- 2. Achievement definitions (for the profile trophy catalog)
--    These are NOT required for unlocks to work — user_achievements has no
--    FK to this table (trophies are defined client-side). They exist so
--    the profile page can show title/description/tier for trophies that
--    the player has not yet unlocked.
INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  -- Bronze (15) — natural play
  ('taprush-first-play',    'taprush', 'First Run',        'Play your first Tap Rush game',       '🎯', 'bronze',  1),
  ('taprush-first-tap',     'taprush', 'First Tap',        'Hit your first target',               '👆', 'bronze',  2),
  ('taprush-score-25',      'taprush', 'Warming Up',       'Score 25 points in one game',         '🔥', 'bronze',  3),
  ('taprush-score-50',      'taprush', 'Finding Rhythm',   'Score 50 points in one game',         '🎵', 'bronze',  4),
  ('taprush-score-100',     'taprush', 'Century',          'Score 100 points in one game',        '💯', 'bronze',  5),
  ('taprush-level-2',       'taprush', 'Level Up',         'Reach level 2',                       '🆙', 'bronze',  6),
  ('taprush-level-3',       'taprush', 'Climbing',         'Reach level 3',                       '🧗', 'bronze',  7),
  ('taprush-first-power',   'taprush', 'Power Hungry',     'Grab a power-up (+3)',                '⚡', 'bronze',  8),
  ('taprush-first-life',    'taprush', 'Extra Life',       'Grab a life heart',                   '❤️', 'bronze',  9),
  ('taprush-first-dual',    'taprush', 'Dual Hit',         'Land your first DUAL HIT bonus',      '✌️', 'bronze', 10),
  ('taprush-first-combo',   'taprush', 'In the Zone',      'Land a COMBO x2',                     '🎶', 'bronze', 11),
  ('taprush-combo-5',       'taprush', 'Hot Streak',       'Land a COMBO x5',                     '🔥', 'bronze', 12),
  ('taprush-games-5',       'taprush', 'Regular',          'Play 5 games',                        '🎮', 'bronze', 13),
  ('taprush-games-10',      'taprush', 'Dedicated',        'Play 10 games',                       '🏅', 'bronze', 14),
  ('taprush-no-bomb-level', 'taprush', 'Clean Run',        'Complete a level without hitting a bomb', '💣', 'bronze', 15),

  -- Silver (10) — skill & dedication
  ('taprush-score-150',     'taprush', 'Hustler',          'Score 150 in one game',               '🥈', 'silver', 16),
  ('taprush-score-200',     'taprush', 'Marksman',         'Score 200 in one game',               '🎯', 'silver', 17),
  ('taprush-score-250',     'taprush', 'Sharpshooter',     'Score 250 in one game',               '🔫', 'silver', 18),
  ('taprush-level-5',       'taprush', 'Halfway There',    'Reach level 5',                       '🗻', 'silver', 19),
  ('taprush-level-7',       'taprush', 'Advanced',         'Reach level 7',                       '🏔️', 'silver', 20),
  ('taprush-combo-10',      'taprush', 'Unstoppable',      'Land a COMBO x10',                    '🚀', 'silver', 21),
  ('taprush-games-25',      'taprush', 'Tap Rush Fan',     'Play 25 games',                       '🎖️', 'silver', 22),
  ('taprush-react-500',     'taprush', 'Quick Fingers',    'Best reaction under 500 ms',          '✋', 'silver', 23),
  ('taprush-react-400',     'taprush', 'Reflexes',         'Best reaction under 400 ms',          '⚡', 'silver', 24),
  ('taprush-total-1000',    'taprush', 'Points Collector', '1,000 total points across all games', '💰', 'silver', 25),

  -- Gold (5) — hardcore
  ('taprush-score-300',     'taprush', 'Elite',            'Score 300 in one game',               '🥇', 'gold',   26),
  ('taprush-score-400',     'taprush', 'Legend',           'Score 400 in one game',               '👑', 'gold',   27),
  ('taprush-level-10',      'taprush', 'Level 10 Club',    'Reach level 10',                      '🏆', 'gold',   28),
  ('taprush-react-300',     'taprush', 'Lightning',        'Best reaction under 300 ms',          '⚡', 'gold',   29),
  ('taprush-combo-15',      'taprush', 'Combo King',       'Land a COMBO x15',                    '🎆', 'gold',   30),

  -- Platinum (1)
  ('taprush-taprush-master','taprush', 'Tap Rush Master',  'Unlock all other Tap Rush trophies',  '💎', 'platinum', 31)
ON CONFLICT (id) DO NOTHING;

-- Verify
-- SELECT count(*) FROM achievement_defs WHERE game_id = 'taprush';   -- should be 31
-- SELECT * FROM games WHERE id = 'taprush';
