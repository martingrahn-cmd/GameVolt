-- Mini Mayhem — GameVolt game registration and 31 trophy definitions
-- (15 bronze, 10 silver, 5 gold, 1 platinum). Idempotent: safe to run again
-- in the Supabase SQL editor.
-- Generated from the game's own list (src/trophies.js in martingrahn-cmd/minigolf-3d,
-- via scripts/gamevolt-export.mjs there); regenerate there, do not edit by hand.

BEGIN;

INSERT INTO games (id, title, description, thumbnail_url) VALUES
  ('mini-mayhem', 'Mini Mayhem', '3D mini golf across four worlds: Clockwork City, Cloud Forest, Moon Carnival and Haunted Harbour.', '/assets/thumbnails/mini-mayhem.webp')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  thumbnail_url = EXCLUDED.thumbnail_url;

DELETE FROM achievement_defs WHERE game_id = 'mini-mayhem';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  ('mini-mayhem-first_hole', 'mini-mayhem', 'Holed Out!', 'Sink the ball for the first time', '⛳', 'bronze', 1),
  ('mini-mayhem-first_par', 'mini-mayhem', 'On Par', 'Finish a hole on par or better', '🏌️', 'bronze', 2),
  ('mini-mayhem-first_birdie', 'mini-mayhem', 'Birdie!', 'Make a birdie, one under par', '🐦', 'bronze', 3),
  ('mini-mayhem-perfect_hit', 'mini-mayhem', 'Bullseye', 'Hit the middle of the green zone', '🎯', 'bronze', 4),
  ('mini-mayhem-putt_in', 'mini-mayhem', 'The Short Putt', 'Sink the ball with a short putt', '🕳️', 'bronze', 5),
  ('mini-mayhem-cannon', 'mini-mayhem', 'Cannonball', 'Fly out of a cannon', '💥', 'bronze', 6),
  ('mini-mayhem-tube', 'mini-mayhem', 'Tube Mail', 'Ride through a tube', '📮', 'bronze', 7),
  ('mini-mayhem-root_loop', 'mini-mayhem', 'Round the Root', 'Make it all the way round the Root Loop', '🌀', 'bronze', 8),
  ('mini-mayhem-ferris', 'mini-mayhem', 'Gondolier', 'Ride the Ferris wheel up to the green', '🎡', 'bronze', 9),
  ('mini-mayhem-rescue', 'mini-mayhem', 'A Helping Paw', 'Get the ball tapped in from the lip', '🐾', 'bronze', 10),
  ('mini-mayhem-splash', 'mini-mayhem', 'Splash!', 'Take your first penalty stroke', '💦', 'bronze', 11),
  ('mini-mayhem-strokes_100', 'mini-mayhem', 'A Hundred Strokes', 'Take 100 strokes', '💯', 'bronze', 12),
  ('mini-mayhem-clockwork_done', 'mini-mayhem', 'Clockmaker''s Apprentice', 'Clear every hole in Clockwork City', '⚙️', 'bronze', 13),
  ('mini-mayhem-forest_done', 'mini-mayhem', 'Forest Wanderer', 'Clear every hole in Cloud Forest', '🌳', 'bronze', 14),
  ('mini-mayhem-friends', 'mini-mayhem', 'Party Game', 'Play a hole in a match with friends', '👋', 'bronze', 15),
  ('mini-mayhem-moon_done', 'mini-mayhem', 'Space Tourist', 'Clear every hole in Moon Carnival', '🚀', 'silver', 16),
  ('mini-mayhem-halloween_done', 'mini-mayhem', 'Ghost Hunter', 'Clear every hole in Haunted Harbour', '🎃', 'silver', 17),
  ('mini-mayhem-eagle', 'mini-mayhem', 'Eagle Eye', 'Make an eagle, two under par', '🦅', 'silver', 18),
  ('mini-mayhem-birdies_10', 'mini-mayhem', 'Birdwatcher', 'Make 10 birdies', '🔭', 'silver', 19),
  ('mini-mayhem-hat_trick', 'mini-mayhem', 'Hat Trick', 'Birdie or better on three holes in a row', '🎩', 'silver', 20),
  ('mini-mayhem-strike', 'mini-mayhem', 'Strike!', 'Knock down every pin in Sky Bowling', '🎳', 'silver', 21),
  ('mini-mayhem-under_par_run', 'mini-mayhem', 'Under Par', 'Play a whole world in a row under par', '📉', 'silver', 22),
  ('mini-mayhem-world_stars', 'mini-mayhem', 'Star World', 'Three stars on every hole in a world', '🌟', 'silver', 23),
  ('mini-mayhem-stars_36', 'mini-mayhem', 'Halfway to Heaven', 'Collect 36 stars', '⭐', 'silver', 24),
  ('mini-mayhem-match_win', 'mini-mayhem', 'Match Winner', 'Win a match against friends', '🥇', 'silver', 25),
  ('mini-mayhem-hole_in_one', 'mini-mayhem', 'Hole in One', 'Sink the ball with your first stroke', '💫', 'gold', 26),
  ('mini-mayhem-campaign', 'mini-mayhem', 'Tournament Champion', 'Clear all 18 holes of the campaign', '🏆', 'gold', 27),
  ('mini-mayhem-perfect_run', 'mini-mayhem', 'Flawless World', 'Play a whole world in a row with three stars on every hole', '✨', 'gold', 28),
  ('mini-mayhem-all_stars', 'mini-mayhem', 'Starry Sky', 'Collect all 72 stars', '🌌', 'gold', 29),
  ('mini-mayhem-eagles_3', 'mini-mayhem', 'King of the Eagles', 'Make three eagles', '👑', 'gold', 30),
  ('mini-mayhem-master', 'mini-mayhem', 'Mini Mayhem Master', 'Unlock all 30 other trophies', '💎', 'platinum', 31);

COMMIT;
