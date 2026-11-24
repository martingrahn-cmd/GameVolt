-- ============================================================
-- Color Gate: game row + 31 achievement definitions (English)
-- 15 bronze, 10 silver, 5 gold, 1 platinum (unlock-all-others).
-- Run in Supabase SQL Editor at GameVolt release time.
-- IDs match GameVolt.achievements.unlock(trophyId) -> 'color-gate-<id>'.
-- Idempotent: safe to re-run.
--
-- Leaderboard modes (rows land in scores via the SDK):
--   'default' — stars and run time packed into one INT, higher is better:
--               stars * 100000 + (99999 - tenths of a second)
--               More stars always win; equal stars -> faster run ranks higher.
--               Decoded for display in js/gv-leaderboard-config.js.
-- ============================================================

-- Game row (required — scores/achievements FK to games.id)
INSERT INTO games (id, title, thumbnail_url) VALUES
  ('color-gate', 'Color Gate', '/assets/thumbnails/color-gate.webp')
ON CONFLICT (id) DO NOTHING;

-- Achievement definitions
DELETE FROM achievement_defs WHERE game_id = 'color-gate';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  -- bronze (15)
  ('color-gate-first-star',     'color-gate', 'First Spark',        'Collect your first star',              '⭐',   'bronze',    1),
  ('color-gate-score10',        'color-gate', 'Warming Up',         'Score 10 stars in one run',            '🔟',  'bronze',    2),
  ('color-gate-ring',           'color-gate', 'Ring Runner',        'Clear a ring',                         '⭕',   'bronze',    3),
  ('color-gate-bar',            'color-gate', 'Bar Hopper',         'Clear a color bar',                    '➖',   'bronze',    4),
  ('color-gate-cross',          'color-gate', 'Crossing Guard',     'Clear a spinning cross',               '➕',   'bronze',    5),
  ('color-gate-dring',          'color-gate', 'Double Trouble',     'Clear a double ring',                  '🎯',  'bronze',    6),
  ('color-gate-twin',           'color-gate', 'Figure Eight',       'Clear stacked rings',                  '♾️',  'bronze',    7),
  ('color-gate-dbar',           'color-gate', 'Rail Rider',         'Clear double bars',                    '🚥',  'bronze',    8),
  ('color-gate-checkpoint',     'color-gate', 'Safe Harbor',        'Reach a checkpoint',                   '🚩',  'bronze',    9),
  ('color-gate-combo5',         'color-gate', 'On A Roll',          'Hit a x5 combo',                       '🔥',  'bronze',   10),
  ('color-gate-zone2',          'color-gate', 'Liftoff',            'Reach Deep Space (zone 2)',            '🪐',  'bronze',   11),
  ('color-gate-life',           'color-gate', 'Second Wind',        'Earn an extra life',                   '❤️',  'bronze',   12),
  ('color-gate-runs10',         'color-gate', 'Regular',            'Play 10 runs',                         '🎮',  'bronze',   13),
  ('color-gate-switch50',       'color-gate', 'Chameleon',          'Change color 50 times',                '🦎',  'bronze',   14),
  ('color-gate-time60',         'color-gate', 'One Minute',         'Last 60 seconds in one run',           '⏱️',  'bronze',   15),
  -- silver (10)
  ('color-gate-score25',        'color-gate', 'Getting Good',       'Score 25 stars in one run',            '🎖️', 'silver',   16),
  ('color-gate-zone3',          'color-gate', 'Northern Lights',    'Reach Aurora (zone 3)',                '🌌',  'silver',   17),
  ('color-gate-zone4',          'color-gate', 'Into The Core',      'Reach The Core (zone 4)',              '🌋',  'silver',   18),
  ('color-gate-combo10',        'color-gate', 'In The Zone',        'Hit a x10 combo',                      '⚡',   'silver',   19),
  ('color-gate-clean20',        'color-gate', 'Clean Start',        'Score 20 without losing a life',       '🛡️', 'silver',   20),
  ('color-gate-stars250',       'color-gate', 'Stargazer',          'Collect 250 stars in total',           '✨',   'silver',   21),
  ('color-gate-passes200',      'color-gate', 'Gatekeeper',         'Clear 200 obstacles in total',         '⛩️',  'silver',   22),
  ('color-gate-runs50',         'color-gate', 'Hooked',             'Play 50 runs',                         '🔁',  'silver',   23),
  ('color-gate-time180',        'color-gate', 'Endurance',          'Last 3 minutes in one run',            '⌛',   'silver',   24),
  ('color-gate-full-hearts',    'color-gate', 'Full Heart',         'Hold 5 lives at once',                 '💗',  'silver',   25),
  -- gold (5)
  ('color-gate-zone5',          'color-gate', 'Cyber City',         'Reach Cyber City (zone 5)',            '🌃',  'gold',     26),
  ('color-gate-score50',        'color-gate', 'Full Circle',        'Score 50 — loop every zone',           '🌈',  'gold',     27),
  ('color-gate-combo25',        'color-gate', 'Perfect Flow',       'Hit a x25 combo',                      '🌀',  'gold',     28),
  ('color-gate-clean40',        'color-gate', 'Untouchable',        'Score 40 without losing a life',       '🥷',  'gold',     29),
  ('color-gate-stars1000',      'color-gate', 'Constellation',      'Collect 1,000 stars in total',         '🌟',  'gold',     30),
  -- platinum (1)
  ('color-gate-platinum',       'color-gate', 'Color Gate Master',  'Unlock every other trophy',            '👑',  'platinum', 31);
