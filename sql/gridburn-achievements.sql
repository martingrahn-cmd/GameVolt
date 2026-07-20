-- ============================================================
-- Gridburn: game row + 31 achievement definitions (English)
-- 15 bronze, 10 silver, 5 gold, 1 platinum (unlocks with all others).
-- Run in Supabase SQL Editor.
-- IDs match GameVolt.achievements.unlock(trophyId) -> 'gridburn-<id>'.
-- Idempotent: safe to re-run.
-- ============================================================

-- Game row (required — scores/achievements FK to games.id)
INSERT INTO games (id, title, thumbnail_url) VALUES
  ('gridburn', 'Gridburn', '/gridburn/og-image.png')
ON CONFLICT (id) DO NOTHING;

-- Achievement definitions
DELETE FROM achievement_defs WHERE game_id = 'gridburn';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  -- Bronze (15)
  ('gridburn-first-ride',     'gridburn', 'First Ride',      'Finish your first match',                 '🏁', 'bronze', 1),
  ('gridburn-first-crash',    'gridburn', 'Derezzed',        'Crash for the first time',                '💥', 'bronze', 2),
  ('gridburn-first-blood',    'gridburn', 'First Blood',     'Win a round against the AI',              '⚔️', 'bronze', 3),
  ('gridburn-easy-rider',     'gridburn', 'Easy Rider',      'Win a match vs the Easy AI',              '🎮', 'bronze', 4),
  ('gridburn-double-trouble', 'gridburn', 'Double Trouble',  'Be part of a double crash',               '🤝', 'bronze', 5),
  ('gridburn-local-hero',     'gridburn', 'Local Hero',      'Finish a 2-player local match',           '👥', 'bronze', 6),
  ('gridburn-solo-debut',     'gridburn', 'Solo Debut',      'Finish a solo practice run',              '🚦', 'bronze', 7),
  ('gridburn-survivor-30',    'gridburn', 'Half Minute',     'Survive 30 seconds in one solo run',      '⏱️', 'bronze', 8),
  ('gridburn-rounds-10',      'gridburn', 'Warmed Up',       'Play 10 rounds',                          '🔄', 'bronze', 9),
  ('gridburn-matches-5',      'gridburn', 'Night Shift',     'Play 5 matches',                          '🌙', 'bronze', 10),
  ('gridburn-road-trip',      'gridburn', 'Road Trip',       'Ride 2,500 cells in total',               '🛣️', 'bronze', 11),
  ('gridburn-crash-course',   'gridburn', 'Crash Course',    'Crash 10 times',                          '🧨', 'bronze', 12),
  ('gridburn-ai-rounds-5',    'gridburn', 'Round Winner',    'Win 5 rounds against the AI',             '🎖️', 'bronze', 13),
  ('gridburn-streak-2',       'gridburn', 'Back to Back',    'Win 2 AI rounds in a row',                '✌️', 'bronze', 14),
  ('gridburn-quick-round',    'gridburn', 'Lightning Lap',   'Win an AI round in under 15 seconds',     '⚡', 'bronze', 15),
  -- Silver (10)
  ('gridburn-medium-well',    'gridburn', 'Medium Well',     'Win a match vs the Medium AI',            '🎯', 'silver', 16),
  ('gridburn-streak-4',       'gridburn', 'On Fire',         'Win 4 AI rounds in a row',                '🔥', 'silver', 17),
  ('gridburn-survivor-60',    'gridburn', 'Full Minute',     'Survive 60 seconds in one solo run',      '⏳', 'silver', 18),
  ('gridburn-marathon',       'gridburn', 'Marathon Rider',  'Ride 10,000 cells in total',              '🚴', 'silver', 19),
  ('gridburn-ai-rounds-25',   'gridburn', 'Round Collector', 'Win 25 rounds against the AI',            '🏅', 'silver', 20),
  ('gridburn-rounds-100',     'gridburn', 'Veteran',         'Play 100 rounds',                         '📀', 'silver', 21),
  ('gridburn-endurance',      'gridburn', 'War of Nerves',   'Win an AI round lasting 45+ seconds',     '🕰️', 'silver', 22),
  ('gridburn-flawless',       'gridburn', 'Flawless',        'Beat any AI 3–0',                         '✨', 'silver', 23),
  ('gridburn-comeback-kid',   'gridburn', 'Comeback Kid',    'Win a match after trailing 0–2',          '💪', 'silver', 24),
  ('gridburn-matches-25',     'gridburn', 'Regular',         'Play 25 matches',                         '🎪', 'silver', 25),
  -- Gold (5)
  ('gridburn-hard-boiled',    'gridburn', 'Hard Boiled',     'Win a match vs the Hard AI',              '💀', 'gold', 26),
  ('gridburn-survivor-150',   'gridburn', 'Iron Rider',      'Survive 150 seconds in one solo run',     '⌛', 'gold', 27),
  ('gridburn-streak-8',       'gridburn', 'Unstoppable',     'Win 8 AI rounds in a row',                '🌋', 'gold', 28),
  ('gridburn-hard-flawless',  'gridburn', 'Perfect Circuit', 'Beat the Hard AI 3–0',                    '👑', 'gold', 29),
  ('gridburn-globetrotter',   'gridburn', 'Globetrotter',    'Ride 100,000 cells in total',             '🌍', 'gold', 30),
  -- Platinum (1)
  ('gridburn-neon-legend',    'gridburn', 'Neon Legend',     'Unlock all other 30 trophies',            '🌟', 'platinum', 31);
