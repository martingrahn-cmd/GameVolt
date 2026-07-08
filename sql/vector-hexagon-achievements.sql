-- ============================================================
-- Vector Hexagon: game row + achievement definitions (English)
-- Run in Supabase SQL Editor.
-- IDs match GameVolt.achievements.unlock(trophyId) -> 'vector-hexagon-<id>'.
-- Idempotent: safe to re-run.
-- ============================================================

-- Game row (required — scores/achievements FK to games.id)
INSERT INTO games (id, title, thumbnail_url) VALUES
  ('vector-hexagon', 'Vector Hexagon', '/vector-hexagon/og-image.png')
ON CONFLICT (id) DO NOTHING;

-- Achievement definitions (the 11 the game actually unlocks)
DELETE FROM achievement_defs WHERE game_id = 'vector-hexagon';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  -- Bronze
  ('vector-hexagon-first',   'vector-hexagon', 'First Contact',  'Finish your first run',            '👋', 'bronze', 1),
  ('vector-hexagon-s15',     'vector-hexagon', 'Warmed Up',      'Survive 15 seconds',               '🔥', 'bronze', 2),
  ('vector-hexagon-s30',     'vector-hexagon', 'In the Zone',    'Survive 30 seconds',               '🎯', 'bronze', 3),
  ('vector-hexagon-endless', 'vector-hexagon', 'No Finish Line', 'Play an Endless run',              '♾️', 'bronze', 4),
  ('vector-hexagon-close',   'vector-hexagon', 'Daredevil',      '5 close calls in one run',         '😬', 'bronze', 5),
  ('vector-hexagon-runs',    'vector-hexagon', 'Hooked',         'Play 25 runs',                     '🎮', 'bronze', 6),
  -- Silver
  ('vector-hexagon-shapes',  'vector-hexagon', 'Shapeshifter',   'See all 3 shapes in one run',      '🔷', 'silver', 7),
  ('vector-hexagon-clear',   'vector-hexagon', 'Survivor',       'Clear a tier (survive 60s)',       '🛡️', 'silver', 8),
  ('vector-hexagon-e60',     'vector-hexagon', 'Endurance',      'Survive 60s in Endless',           '⏱️', 'silver', 9),
  -- Gold
  ('vector-hexagon-climb',   'vector-hexagon', 'Climber',        'Reach Hexagonest in one run',      '🧗', 'gold', 10),
  ('vector-hexagon-win',     'vector-hexagon', 'Apex',           'Win — clear Hexagonest',           '👑', 'gold', 11)
ON CONFLICT (id) DO NOTHING;
