-- Slipstream Vector — GameVolt game registration and 31 trophy definitions.
-- Idempotent: safe to run again in the Supabase SQL editor.

BEGIN;

INSERT INTO games (id, title, description, thumbnail_url) VALUES
  ('slipstream-vector', 'Slipstream Vector', 'Complete anti-gravity racing across twelve circuits and four worlds.', '/assets/thumbnails/slipstream-vector.png')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  thumbnail_url = EXCLUDED.thumbnail_url;

DELETE FROM achievement_defs WHERE game_id = 'slipstream-vector';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  ('slipstream-vector-first_race', 'slipstream-vector', 'Off the Line', 'Finish your first race', '🏁', 'bronze', 1),
  ('slipstream-vector-first_win', 'slipstream-vector', 'Top Step', 'Win a race', '🥇', 'bronze', 2),
  ('slipstream-vector-first_boost', 'slipstream-vector', 'Pad Runner', 'Hit a boost pad', '⚡', 'bronze', 3),
  ('slipstream-vector-first_drift', 'slipstream-vector', 'Sideways', 'Land a drift mini-boost', '🌀', 'bronze', 4),
  ('slipstream-vector-airbrake', 'slipstream-vector', 'Air Brake', 'Use the airbrake', '✋', 'bronze', 5),
  ('slipstream-vector-perfect_start', 'slipstream-vector', 'Reflexes', 'Nail a PERFECT START', '🚦', 'bronze', 6),
  ('slipstream-vector-top_speed', 'slipstream-vector', 'Terminal Velocity', 'Reach top speed', '🚀', 'bronze', 7),
  ('slipstream-vector-pad_chain', 'slipstream-vector', 'Pad Chain', 'Hit 3 boost pads in one race', '🔗', 'bronze', 8),
  ('slipstream-vector-overtake', 'slipstream-vector', 'Overtake', 'Pass an opponent', '↗️', 'bronze', 9),
  ('slipstream-vector-loop', 'slipstream-vector', 'Gravity Optional', 'Clear a full loop', '🔄', 'bronze', 10),
  ('slipstream-vector-race_3', 'slipstream-vector', 'Regular', 'Finish three races', '🔂', 'bronze', 11),
  ('slipstream-vector-tt_play', 'slipstream-vector', 'Solo Run', 'Finish a time trial', '⏲️', 'bronze', 12),
  ('slipstream-vector-champ_play', 'slipstream-vector', 'Contender', 'Enter a championship', '🎟️', 'bronze', 13),
  ('slipstream-vector-all_tracks', 'slipstream-vector', 'Grand Tour', 'Race on all twelve circuits', '🗺️', 'bronze', 14),
  ('slipstream-vector-all_teams', 'slipstream-vector', 'Free Agent', 'Race for all four teams', '🛠️', 'bronze', 15),
  ('slipstream-vector-record', 'slipstream-vector', 'Record Holder', 'Set a track lap record', '⏱️', 'silver', 16),
  ('slipstream-vector-clean_win', 'slipstream-vector', 'Not a Scratch', 'Win without touching a wall', '✨', 'silver', 17),
  ('slipstream-vector-comeback', 'slipstream-vector', 'Through the Pack', 'Win after a wall hit', '💥', 'silver', 18),
  ('slipstream-vector-surge_win', 'slipstream-vector', 'Up to Speed', 'Win a race on SURGE', '🔵', 'silver', 19),
  ('slipstream-vector-cup', 'slipstream-vector', 'Silverware', 'Win a championship', '🏆', 'silver', 20),
  ('slipstream-vector-wins_5', 'slipstream-vector', 'On a Roll', 'Win five races', '🔥', 'silver', 21),
  ('slipstream-vector-wins_10', 'slipstream-vector', 'Veteran', 'Win ten races', '🎖️', 'silver', 22),
  ('slipstream-vector-record_3', 'slipstream-vector', 'Pace Setter', 'Hold the lap record on three circuits', '📊', 'silver', 23),
  ('slipstream-vector-loop_master', 'slipstream-vector', 'Loop the Loop', 'Clear both loop circuits', '🌐', 'silver', 24),
  ('slipstream-vector-clean_3', 'slipstream-vector', 'Spotless', 'Win three races without a wall hit', '🧼', 'silver', 25),
  ('slipstream-vector-overdrive_win', 'slipstream-vector', 'Redline', 'Win a race on OVERDRIVE', '🟣', 'gold', 26),
  ('slipstream-vector-overdrive_cup', 'slipstream-vector', 'Untamed', 'Win the OVERDRIVE championship', '👑', 'gold', 27),
  ('slipstream-vector-sweep', 'slipstream-vector', 'Clean Sweep', 'Win every round of a championship', '🧹', 'gold', 28),
  ('slipstream-vector-untouchable', 'slipstream-vector', 'Untouchable', 'Win with no wall or ship contact', '🛡️', 'gold', 29),
  ('slipstream-vector-all_records', 'slipstream-vector', 'Benchmark', 'Hold the lap record on every circuit', '📈', 'gold', 30),
  ('slipstream-vector-legend', 'slipstream-vector', 'Slipstream Legend', 'Unlock every other trophy', '💎', 'platinum', 31);

COMMIT;
