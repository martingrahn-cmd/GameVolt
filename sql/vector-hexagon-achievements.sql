-- ============================================================
-- Vector Hexagon: game row + 31 achievement definitions (English)
-- 15 bronze, 10 silver, 5 gold, 1 platinum (unlocks with all others).
-- Run in Supabase SQL Editor.
-- IDs match GameVolt.achievements.unlock(trophyId) -> 'vector-hexagon-<id>'.
-- Idempotent: safe to re-run.
-- ============================================================

-- Game row (required — scores/achievements FK to games.id)
INSERT INTO games (id, title, thumbnail_url) VALUES
  ('vector-hexagon', 'Vector Hexagon', '/vector-hexagon/og-image.png')
ON CONFLICT (id) DO NOTHING;

-- Achievement definitions
DELETE FROM achievement_defs WHERE game_id = 'vector-hexagon';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  -- Bronze (15)
  ('vector-hexagon-first',    'vector-hexagon', 'First Contact', 'Finish your first run',            '👋', 'bronze', 1),
  ('vector-hexagon-s10',      'vector-hexagon', 'Ten Seconds',   'Survive 10 seconds',               '⏱️', 'bronze', 2),
  ('vector-hexagon-s15',      'vector-hexagon', 'Warmed Up',     'Survive 15 seconds',               '🔥', 'bronze', 3),
  ('vector-hexagon-s20',      'vector-hexagon', 'Steady',        'Survive 20 seconds',               '🎯', 'bronze', 4),
  ('vector-hexagon-s30',      'vector-hexagon', 'In the Zone',   'Survive 30 seconds',               '🌀', 'bronze', 5),
  ('vector-hexagon-s40',      'vector-hexagon', 'Forty',         'Survive 40 seconds',               '⏳', 'bronze', 6),
  ('vector-hexagon-sq',       'vector-hexagon', 'Squared',       'Ride the field as a square',       '⬛', 'bronze', 7),
  ('vector-hexagon-pent',     'vector-hexagon', 'Pentagon',      'Ride the field as a pentagon',     '⬠', 'bronze', 8),
  ('vector-hexagon-near',     'vector-hexagon', 'Near Miss',     'Thread a wall by a hair',          '😬', 'bronze', 9),
  ('vector-hexagon-close5',   'vector-hexagon', 'Daredevil',     '5 close calls in one run',         '😈', 'bronze', 10),
  ('vector-hexagon-shapes',   'vector-hexagon', 'Shapeshifter',  'See all 3 shapes in one run',      '🔷', 'bronze', 11),
  ('vector-hexagon-endless',  'vector-hexagon', 'No Finish Line','Play an Endless run',              '♾️', 'bronze', 12),
  ('vector-hexagon-clear',    'vector-hexagon', 'Survivor',      'Clear a tier (survive 60s)',       '🛡️', 'bronze', 13),
  ('vector-hexagon-dj',       'vector-hexagon', 'DJ',            'Load your own music track',        '🎵', 'bronze', 14),
  ('vector-hexagon-runs10',   'vector-hexagon', 'Regular',       'Play 10 runs',                     '🎮', 'bronze', 15),
  -- Silver (10)
  ('vector-hexagon-s50',      'vector-hexagon', 'Nearly There',  'Survive 50 seconds',               '⏰', 'silver', 16),
  ('vector-hexagon-climber',  'vector-hexagon', 'Climber',       'Reach Hexagonest in one run',      '🧗', 'silver', 17),
  ('vector-hexagon-clear2',   'vector-hexagon', 'Double Clear',  'Clear two tiers in one run',       '🏅', 'silver', 18),
  ('vector-hexagon-e30',      'vector-hexagon', 'Enduring',      'Survive 30s in Endless',           '💪', 'silver', 19),
  ('vector-hexagon-e60',      'vector-hexagon', 'Endurance',     'Survive 60s in Endless',           '⏱️', 'silver', 20),
  ('vector-hexagon-close10',  'vector-hexagon', 'Reckless',      '10 close calls in one run',        '🤪', 'silver', 21),
  ('vector-hexagon-expert',   'vector-hexagon', 'Bravado',       'Start a run on Hexagonest',        '🔥', 'silver', 22),
  ('vector-hexagon-total5',   'vector-hexagon', 'Time Served',   '5 minutes of total survival',      '🕰️', 'silver', 23),
  ('vector-hexagon-runs25',   'vector-hexagon', 'Hooked',        'Play 25 runs',                     '🎯', 'silver', 24),
  ('vector-hexagon-runs50',   'vector-hexagon', 'Committed',     'Play 50 runs',                     '🏋️', 'silver', 25),
  -- Gold (5)
  ('vector-hexagon-win',      'vector-hexagon', 'Apex',          'Win — clear Hexagonest',           '👑', 'gold', 26),
  ('vector-hexagon-fullclimb','vector-hexagon', 'The Long Climb','Win a run started on Hexagon',     '🏔️', 'gold', 27),
  ('vector-hexagon-e90',      'vector-hexagon', 'Ironman',       'Survive 90s in Endless',           '🦾', 'gold', 28),
  ('vector-hexagon-close20',  'vector-hexagon', 'Untouchable',   '20 close calls in one run',        '🥷', 'gold', 29),
  ('vector-hexagon-runs100',  'vector-hexagon', 'Devoted',       'Play 100 runs',                    '💯', 'gold', 30),
  -- Platinum (1)
  ('vector-hexagon-platinum', 'vector-hexagon', 'Vector Master', 'Unlock every other trophy',        '💎', 'platinum', 31)
ON CONFLICT (id) DO NOTHING;
