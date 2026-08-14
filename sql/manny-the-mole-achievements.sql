-- ============================================================
-- Manny the Mole: game row + 31 achievement definitions (English)
-- 15 bronze, 10 silver, 5 gold, 1 platinum.
-- Run in Supabase SQL Editor.
-- IDs match GameVolt.achievements.unlock(trophyId) -> 'manny-the-mole-<id>'.
-- Idempotent: safe to re-run.
--
-- The game shipped with exactly 31 trophies, so the mapping is 1:1 with
-- the in-game cabinet. One deliberate deviation from the house pattern:
-- the platinum is 'Twelve Golds' (gold medal on every campaign level)
-- rather than an unlock-all-others meta trophy — it is the cabinet's
-- natural completionist peak and already has its own trigger.
--
-- Leaderboard modes (rows land in scores via the SDK):
--   'score'        — best run score, higher is better, submitted raw
--   'daily-streak' — daily-lock streak in days, higher is better
-- ============================================================

-- Game row (required — scores/achievements FK to games.id)
INSERT INTO games (id, title, thumbnail_url) VALUES
  ('manny-the-mole', 'Manny the Mole', '/manny-the-mole/og-image.png')
ON CONFLICT (id) DO NOTHING;

-- Achievement definitions
DELETE FROM achievement_defs WHERE game_id = 'manny-the-mole';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  -- The descent
  ('manny-the-mole-first-bite',   'manny-the-mole', 'First Bite',            'Dig your first shaft',                        '⛏️', 'bronze',   1),
  ('manny-the-mole-three-down',   'manny-the-mole', 'Three Down',            'Clear three levels',                          '🕳️', 'bronze',   2),
  ('manny-the-mole-halfway',      'manny-the-mole', 'Halfway',               'Clear six levels — the easy half',            '🪜', 'silver',   3),
  ('manny-the-mole-nine-deep',    'manny-the-mole', 'Nine Deep',             'Clear nine levels, three to go',              '⬇️', 'silver',   4),
  ('manny-the-mole-all-twelve',   'manny-the-mole', 'All Twelve',            'Open every safe on the way down',             '🏦', 'gold',     5),
  ('manny-the-mole-the-key',      'manny-the-mole', 'The Next Safe Down',    'See what was in the last one',                '🗝️', 'gold',     6),
  -- Metal
  ('manny-the-mole-first-medal',  'manny-the-mole', 'Something To Show',     'Earn your first medal',                       '🎖️', 'bronze',   7),
  ('manny-the-mole-first-gold',   'manny-the-mole', 'Gold',                  'Clear a level under gold time',               '🥇', 'silver',   8),
  ('manny-the-mole-six-golds',    'manny-the-mole', 'Six Golds',             'Gold on half the campaign',                   '🏅', 'gold',     9),
  ('manny-the-mole-all-golds',    'manny-the-mole', 'Twelve Golds',          'Gold on every level — nothing left to shave', '👑', 'platinum', 10),
  ('manny-the-mole-own-record',   'manny-the-mole', 'Faster Than Yesterday', 'Beat your own best time',                     '⏱️', 'bronze',   11),
  -- Air
  ('manny-the-mole-deep-breath',  'manny-the-mole', 'Deep Breath',           'Finish a level with 80% air to spare',        '💨', 'bronze',   12),
  ('manny-the-mole-on-fumes',     'manny-the-mole', 'On Fumes',              'Finish on the last few percent of air',       '😮‍💨', 'bronze', 13),
  ('manny-the-mole-held-breath',  'manny-the-mole', 'Held Breath',           'Clear a whole level without a top-up',        '🫁', 'silver',   14),
  ('manny-the-mole-out-of-air',   'manny-the-mole', 'Out Of Air',            'Run out. It happens. It happened to you',     '💀', 'bronze',   15),
  -- The drill
  ('manny-the-mole-first-cut',    'manny-the-mole', 'First Cut',             'Dig your first block',                        '🔨', 'bronze',   16),
  ('manny-the-mole-handful',      'manny-the-mole', 'A Handful',             'Break five blocks in one bite',               '🧱', 'bronze',   17),
  ('manny-the-mole-armful',       'manny-the-mole', 'An Armful',             'Break eight blocks in one bite',              '💪', 'silver',   18),
  ('manny-the-mole-whole-wall',   'manny-the-mole', 'The Whole Wall',        'Break twelve blocks in one bite',             '🧨', 'gold',     19),
  ('manny-the-mole-thousand',     'manny-the-mole', 'A Thousand Blocks',     'Dig a thousand blocks across every run',      '🔢', 'silver',   20),
  -- Gravity
  ('manny-the-mole-flattened',    'manny-the-mole', 'Flattened',             'Something heavy found you',                   '🪨', 'bronze',   21),
  ('manny-the-mole-ten-times',    'manny-the-mole', 'Ten Times Flattened',   'Get crushed ten times. Not learning quickly', '😵', 'silver',   22),
  ('manny-the-mole-long-drop',    'manny-the-mole', 'The Long Drop',         'Fall a very long way and live',               '🪂', 'bronze',   23),
  -- The locks
  ('manny-the-mole-grade-1',      'manny-the-mole', 'Grade One',             'Restore your first circuit',                  '🔌', 'bronze',   24),
  ('manny-the-mole-grade-2',      'manny-the-mole', 'Grade Two',             'Crack a grade-two lock',                      '⚡', 'bronze',   25),
  ('manny-the-mole-grade-3',      'manny-the-mole', 'Grade Three',           'Crack a grade-three lock',                    '🔋', 'silver',   26),
  ('manny-the-mole-grade-4',      'manny-the-mole', 'Grade Four',            'Crack a lock with welded anchors',            '🧲', 'silver',   27),
  ('manny-the-mole-grade-5',      'manny-the-mole', 'Grade Five',            'Crack a grade-five lock',                     '💡', 'silver',   28),
  ('manny-the-mole-grade-6',      'manny-the-mole', 'Grade Six',             'Solve the branching one',                     '🔀', 'gold',     29),
  -- Odds and ends
  ('manny-the-mole-curator',      'manny-the-mole', 'Curator',               'Go and look at the trophy shelf',             '🖼️', 'bronze',   30),
  ('manny-the-mole-quiet',        'manny-the-mole', 'Quiet Mole',            'Turn the sound off',                          '🔇', 'bronze',   31)
ON CONFLICT (id) DO NOTHING;
