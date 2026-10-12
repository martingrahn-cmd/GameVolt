-- Chrome Circuit — GameVolt game registration and 31 trophy definitions.
-- Idempotent: safe to run again in the Supabase SQL editor.
-- Generated from the game's own list (src/achievements.js in
-- martingrahn-cmd/chrome-circuit, via tools/gamevolt/export.mjs there).

BEGIN;

INSERT INTO games (id, title, description, thumbnail_url) VALUES
  ('chrome-circuit', 'Chrome Circuit', 'Isometric arcade racing across twelve circuits and four worlds.', '/assets/thumbnails/chrome-circuit.webp')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  thumbnail_url = EXCLUDED.thumbnail_url;

DELETE FROM achievement_defs WHERE game_id = 'chrome-circuit';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  ('chrome-circuit-first_race', 'chrome-circuit', 'Green Light', 'Finish your first race', '🚦', 'bronze', 1),
  ('chrome-circuit-first_podium', 'chrome-circuit', 'On the Box', 'Finish a race in the top three', '🥉', 'bronze', 2),
  ('chrome-circuit-first_win', 'chrome-circuit', 'Chequered Flag', 'Win a race', '🏁', 'bronze', 3),
  ('chrome-circuit-rocket_start', 'chrome-circuit', 'Rocket Start', 'Hit the gas as the lights go green', '🚀', 'bronze', 4),
  ('chrome-circuit-drift_boost', 'chrome-circuit', 'Sideways', 'Earn a drift boost', '💨', 'bronze', 5),
  ('chrome-circuit-orange_sparks', 'chrome-circuit', 'Orange Sparks', 'Hold a drift long enough for an orange boost', '🔥', 'bronze', 6),
  ('chrome-circuit-big_air', 'chrome-circuit', 'Big Air', 'Fly for more than half a second', '🪂', 'bronze', 7),
  ('chrome-circuit-direct_hit', 'chrome-circuit', 'Direct Hit', 'Hit a rival with a rocket', '🎯', 'bronze', 8),
  ('chrome-circuit-slippery', 'chrome-circuit', 'Slippery', 'Spin a rival with your oil drum', '🛢️', 'bronze', 9),
  ('chrome-circuit-close_call', 'chrome-circuit', 'Close Call', 'Shave past a rival without touching', '😬', 'bronze', 10),
  ('chrome-circuit-overtakes_25', 'chrome-circuit', 'Through the Field', 'Overtake 25 cars', '⏩', 'bronze', 11),
  ('chrome-circuit-ghost_rider', 'chrome-circuit', 'Ghost Rider', 'Set a lap in time trial', '👻', 'bronze', 12),
  ('chrome-circuit-bronze_medal', 'chrome-circuit', 'Medalist', 'Earn a time trial medal', '🎖️', 'bronze', 13),
  ('chrome-circuit-snow_chains', 'chrome-circuit', 'Snow Chains', 'Finish a race in Alpine Winter', '❄️', 'bronze', 14),
  ('chrome-circuit-red_dust', 'chrome-circuit', 'Red Dust', 'Finish a race in Red Rock Canyon', '🌵', 'bronze', 15),
  ('chrome-circuit-wins_10', 'chrome-circuit', 'Winning Habit', 'Win 10 races', '🏆', 'silver', 16),
  ('chrome-circuit-hat_trick', 'chrome-circuit', 'Hat Trick', 'Win 3 races in a row', '🎩', 'silver', 17),
  ('chrome-circuit-runaway', 'chrome-circuit', 'Runaway', 'Win a race by 5 seconds or more', '🏃', 'silver', 18),
  ('chrome-circuit-ace_win', 'chrome-circuit', 'Ace Driver', 'Win a race on Ace or Legend', '♠️', 'silver', 19),
  ('chrome-circuit-champion', 'chrome-circuit', 'Champion', 'Win a championship', '🥇', 'silver', 20),
  ('chrome-circuit-gold_medal', 'chrome-circuit', 'Gold Standard', 'Earn a gold medal in time trial', '🌟', 'silver', 21),
  ('chrome-circuit-medal_every', 'chrome-circuit', 'Full Set', 'Earn a medal on every circuit', '🗺️', 'silver', 22),
  ('chrome-circuit-full_garage', 'chrome-circuit', 'Full Garage', 'Unlock every car', '🚗', 'silver', 23),
  ('chrome-circuit-open_road', 'chrome-circuit', 'Open Road', 'Open every world in the career', '🛣️', 'silver', 24),
  ('chrome-circuit-drift_king', 'chrome-circuit', 'Drift King', 'Earn 100 drift boosts', '👑', 'silver', 25),
  ('chrome-circuit-grand_champion', 'chrome-circuit', 'Grand Champion', 'Win every world''s championship on Pro or harder', '🏆', 'gold', 26),
  ('chrome-circuit-clean_sweep', 'chrome-circuit', 'Clean Sweep', 'Win every round of a championship on Pro or harder', '🧹', 'gold', 27),
  ('chrome-circuit-legend_title', 'chrome-circuit', 'Living Legend', 'Win a championship on Legend', '🔱', 'gold', 28),
  ('chrome-circuit-gold_rush', 'chrome-circuit', 'Gold Rush', 'Earn gold on every circuit', '💰', 'gold', 29),
  ('chrome-circuit-legend_tour', 'chrome-circuit', 'Legend of the Road', 'Win on Legend on every circuit', '🛞', 'gold', 30),
  ('chrome-circuit-master', 'chrome-circuit', 'Chrome Circuit Master', 'Unlock all 30 other trophies', '💎', 'platinum', 31);

COMMIT;
