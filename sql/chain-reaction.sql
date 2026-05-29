-- Chain Reaction — game row + achievement definitions for the GameVolt
-- cloud trophy case and leaderboard.
--
-- Apply in the GameVolt Supabase SQL editor (project nwkjayseuhvvpkdgpivm).
-- Chain Reaction uses the standard shared `scores` table via
-- GameVolt.leaderboard.submit(), so no custom leaderboard table is needed —
-- just the game row (FK target) and its 31 trophies.
--
-- The achievement_defs id MUST be "<game_id>-<localId>", the form the SDK
-- writes when the game calls GameVolt.achievements.unlock(localId)
-- (stored as user_achievements.achievement_id = 'chain-reaction-' + localId).
-- These 31 trophies mirror games/chain-reaction/meta.js exactly.
-- Idempotent: safe to re-run.

-- Register the game (no-op if it already exists).
INSERT INTO games (id, title, thumbnail_url) VALUES
  ('chain-reaction', 'Chain Reaction', '/assets/thumbnails/chain-reaction.webp')
ON CONFLICT (id) DO NOTHING;

-- Trophy definitions (15 bronze / 10 silver / 5 gold / 1 platinum).
DELETE FROM achievement_defs WHERE game_id = 'chain-reaction';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  -- Bronze (15) — natural early play
  ('chain-reaction-power_on',    'chain-reaction', 'Power On',        'Make your first move',          '🔌', 'bronze',  1),
  ('chain-reaction-t32',         'chain-reaction', 'Ignition',        'Create a 32 tile',              '🟡', 'bronze',  2),
  ('chain-reaction-t64',         'chain-reaction', 'Kindling',        'Create a 64 tile',              '🟠', 'bronze',  3),
  ('chain-reaction-t128',        'chain-reaction', 'Warm Up',         'Create a 128 tile',             '🔆', 'bronze',  4),
  ('chain-reaction-t256',        'chain-reaction', 'Heating Up',      'Create a 256 tile',             '🔥', 'bronze',  5),
  ('chain-reaction-first_chain', 'chain-reaction', 'Reaction',        'Trigger your first chain',      '⚡', 'bronze',  6),
  ('chain-reaction-score500',    'chain-reaction', 'First Sparks',    'Score 500 in a run',            '✨', 'bronze',  7),
  ('chain-reaction-score1k',     'chain-reaction', 'Charged',         'Score 1,000 in a run',          '🔋', 'bronze',  8),
  ('chain-reaction-score2k',     'chain-reaction', 'Spark',           'Score 2,000 in a run',          '💡', 'bronze',  9),
  ('chain-reaction-score3k',     'chain-reaction', 'Reactor Online',  'Score 3,000 in a run',          '📈', 'bronze', 10),
  ('chain-reaction-moves25',     'chain-reaction', 'Tinkerer',        'Make 25 moves in a game',       '🛠️', 'bronze', 11),
  ('chain-reaction-moves50',     'chain-reaction', 'Operator',        'Make 50 moves in a game',       '⚙️', 'bronze', 12),
  ('chain-reaction-chains3',     'chain-reaction', 'Cascader',        'Trigger 3 chains in a game',    '🌊', 'bronze', 13),
  ('chain-reaction-games1',      'chain-reaction', 'First Game',      'Finish your first game',        '🎮', 'bronze', 14),
  ('chain-reaction-games5',      'chain-reaction', 'Getting Started', 'Play 5 games',                  '🕹️', 'bronze', 15),
  -- Silver (10) — committed play
  ('chain-reaction-chain3',      'chain-reaction', 'Chain Master',    'Pull off a 3-chain',            '⛓️', 'silver', 16),
  ('chain-reaction-t512',        'chain-reaction', 'Critical Mass',   'Create a 512 tile',             '☢️', 'silver', 17),
  ('chain-reaction-t1024',       'chain-reaction', 'Meltdown',        'Create a 1024 tile',            '🌋', 'silver', 18),
  ('chain-reaction-score5k',     'chain-reaction', 'High Voltage',    'Score 5,000 in a run',          '⚡', 'silver', 19),
  ('chain-reaction-score10k',    'chain-reaction', 'Overload',        'Score 10,000 in a run',         '💥', 'silver', 20),
  ('chain-reaction-chains10',    'chain-reaction', 'Chain Reactor',   'Trigger 10 chains in a game',   '🔗', 'silver', 21),
  ('chain-reaction-moves150',    'chain-reaction', 'Marathon',        'Make 150 moves in a game',      '🏃', 'silver', 22),
  ('chain-reaction-games15',     'chain-reaction', 'Regular',         'Play 15 games',                 '🎯', 'silver', 23),
  ('chain-reaction-games25',     'chain-reaction', 'Persistent',      'Play 25 games',                 '📅', 'silver', 24),
  ('chain-reaction-moves1k',     'chain-reaction', 'Workhorse',       'Make 1,000 moves all-time',     '🧰', 'silver', 25),
  -- Gold (5) — mastery
  ('chain-reaction-t2048',       'chain-reaction', 'Breakthrough',    'Reach the 2048 tile',           '🏆', 'gold',   26),
  ('chain-reaction-t4096',       'chain-reaction', 'Singularity',     'Reach the 4096 tile',           '🌀', 'gold',   27),
  ('chain-reaction-score25k',    'chain-reaction', 'Overdrive',       'Score 25,000 in a run',         '🔋', 'gold',   28),
  ('chain-reaction-score50k',    'chain-reaction', 'Legend',          'Score 50,000 in a run',         '👑', 'gold',   29),
  ('chain-reaction-chains25',    'chain-reaction', 'Chain Storm',     'Trigger 25 chains in a game',   '🌪️', 'gold',   30),
  -- Platinum (1) — the cap
  ('chain-reaction-platinum',    'chain-reaction', 'Reactor Core',    'Unlock every other trophy',     '💎', 'platinum', 31);

-- Verify: should return 31.
-- SELECT count(*) FROM achievement_defs WHERE game_id = 'chain-reaction';
