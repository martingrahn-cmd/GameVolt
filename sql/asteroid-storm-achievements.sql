-- ============================================================
-- Asteroid Storm: game row + 31 achievement definitions (English)
-- 15 bronze, 10 silver, 5 gold, 1 platinum (unlocks with all others).
-- Run in Supabase SQL Editor.
-- IDs match GameVolt.achievements.unlock(trophyId) -> 'asteroid-storm-<id>'.
-- Idempotent: safe to re-run.
--
-- Why this file exists: Asteroid Storm's definitions live in schema.sql but,
-- unlike every other game, it never had its own seed file — so on databases
-- seeded before those rows were added, the defs are missing. get_recent_activity
-- inner-joins achievement_defs, so unlocks with no matching definition are
-- silently dropped from the activity feed (scores still show; trophies don't),
-- and they land in no tier bucket on the profile. Running this fixes both.
-- ============================================================

-- Game row (required — scores/achievements FK to games.id)
INSERT INTO games (id, title, thumbnail_url) VALUES
  ('asteroid-storm', 'Asteroid Storm', '/assets/thumbnails/asteroid-storm.webp')
ON CONFLICT (id) DO NOTHING;

-- Achievement definitions
DELETE FROM achievement_defs WHERE game_id = 'asteroid-storm';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  -- Bronze (15)
  ('asteroid-storm-first_kill',       'asteroid-storm', 'First Blood',       'Destroy your first asteroid',              '☄️', 'bronze', 1),
  ('asteroid-storm-score_1000',       'asteroid-storm', 'Getting Started',   'Reach 1,000 points',                       '🎯', 'bronze', 2),
  ('asteroid-storm-score_5000',       'asteroid-storm', 'Marksman',          'Reach 5,000 points',                       '🎯', 'bronze', 3),
  ('asteroid-storm-combo_5',          'asteroid-storm', 'Combo Rookie',      'Reach a 5x combo',                         '🔥', 'bronze', 4),
  ('asteroid-storm-first_teleport',   'asteroid-storm', 'Blink',             'Use teleport for the first time',          '⚡', 'bronze', 5),
  ('asteroid-storm-first_powerup',    'asteroid-storm', 'Power Up',          'Pick up your first power-up',              '⬆️', 'bronze', 6),
  ('asteroid-storm-survive_60',       'asteroid-storm', 'Survivor',          'Survive 60 seconds in campaign',           '🛡️', 'bronze', 7),
  ('asteroid-storm-ufo_kill',         'asteroid-storm', 'UFO Down',          'Destroy your first hostile UFO',           '🛸', 'bronze', 8),
  ('asteroid-storm-shield_save',      'asteroid-storm', 'Close Call',        'Shield absorbs a hit',                     '💠', 'bronze', 9),
  ('asteroid-storm-bomb_5',           'asteroid-storm', 'Blast Zone',        'Destroy 5+ asteroids with one bomb',       '💣', 'bronze', 10),
  ('asteroid-storm-mission_1',        'asteroid-storm', 'Enlisted',          'Complete your first challenge mission',    '📋', 'bronze', 11),
  ('asteroid-storm-mission_5',        'asteroid-storm', 'Recruit',           'Complete 5 challenge missions',            '📋', 'bronze', 12),
  ('asteroid-storm-spread_kills_10',  'asteroid-storm', 'Fan Favorite',      'Destroy 10 asteroids with spread shot',   '🔫', 'bronze', 13),
  ('asteroid-storm-homing_kills_10',  'asteroid-storm', 'Lock On',           'Destroy 10 asteroids with homing',        '🔫', 'bronze', 14),
  ('asteroid-storm-railgun_kills_10', 'asteroid-storm', 'Railgunner',        'Destroy 10 asteroids with railgun',       '🔫', 'bronze', 15),
  -- Silver (10)
  ('asteroid-storm-score_25000',      'asteroid-storm', 'Sharpshooter',      'Reach 25,000 points',                      '⭐', 'silver', 16),
  ('asteroid-storm-combo_15',         'asteroid-storm', 'Combo Master',      'Reach a 20x combo',                        '🔥', 'silver', 17),
  ('asteroid-storm-survive_180',      'asteroid-storm', 'Iron Will',         'Survive 5 minutes in campaign',            '🛡️', 'silver', 18),
  ('asteroid-storm-ufo_kills_10',     'asteroid-storm', 'Saucer Slayer',     'Destroy 10 hostile UFOs (career)',         '🛸', 'silver', 19),
  ('asteroid-storm-boss_kill',        'asteroid-storm', 'Titan Slayer',      'Defeat a boss asteroid',                   '👑', 'silver', 20),
  ('asteroid-storm-mission_15',       'asteroid-storm', 'Veteran',           'Complete 15 challenge missions',           '🎖️', 'silver', 21),
  ('asteroid-storm-no_damage_60',     'asteroid-storm', 'Untouchable',       'Survive 90s without taking damage',        '✨', 'silver', 22),
  ('asteroid-storm-asteroids_500',    'asteroid-storm', 'Rock Crusher',      'Destroy 1,000 asteroids (career)',         '💎', 'silver', 23),
  ('asteroid-storm-all_ships',        'asteroid-storm', 'Fleet Commander',   'Play campaign with all 6 ships',           '🚀', 'silver', 24),
  ('asteroid-storm-speed_run',        'asteroid-storm', 'Speed Demon',       'Reach 10,000 points in under 60 seconds', '⏱️', 'silver', 25),
  -- Gold (5)
  ('asteroid-storm-score_100000',     'asteroid-storm', 'Legend',            'Reach 200,000 points',                     '🏆', 'gold', 26),
  ('asteroid-storm-combo_25',         'asteroid-storm', 'Combo God',         'Reach a 35x combo',                        '🔥', 'gold', 27),
  ('asteroid-storm-mission_30',       'asteroid-storm', 'Mission Complete',  'Complete all 30 challenge missions',       '🏅', 'gold', 28),
  ('asteroid-storm-survive_300',      'asteroid-storm', 'Endurance',         'Survive 8 minutes in campaign',            '🛡️', 'gold', 29),
  ('asteroid-storm-asteroids_2000',   'asteroid-storm', 'Asteroid Annihilator','Destroy 5,000 asteroids (career)',       '💎', 'gold', 30),
  -- Platinum (1)
  ('asteroid-storm-platinum',         'asteroid-storm', 'Storm Chaser',      'Unlock all 30 trophies',                   '🌟', 'platinum', 31);

-- Verify: should return 31.
-- SELECT count(*) FROM achievement_defs WHERE game_id = 'asteroid-storm';

-- Already-earned unlocks are preserved in user_achievements; once the defs
-- above exist, they immediately show in the activity feed and bucket into the
-- correct tier on the profile — no replay needed.
