-- INK — trophy definitions for the GameVolt portal.
-- 31 in the standard ladder: 15 bronze / 10 silver / 5 gold / 1 platinum.
-- Mirrors the LIST in index.html; the ids here are '{game_id}-{trophy id}',
-- which is exactly what GameVolt.achievements.unlock('<trophy id>') writes.
-- Idempotent — safe to re-run in the Supabase SQL editor.
-- Applied and verified on GameVolt production 2026-09-06.

BEGIN;

INSERT INTO games (id, title, thumbnail_url) VALUES
  ('ink', 'INK', '/assets/thumbnails/ink.webp')
ON CONFLICT (id) DO NOTHING;

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  ('ink-first-stroke', 'ink', 'First Stroke', 'Draw your first line', '✏️', 'bronze', 1),
  ('ink-contact', 'ink', 'Contact', 'Bounce the ball off a stroke', '✒️', 'bronze', 2),
  ('ink-blotter', 'ink', 'Blotter', 'Soak up an ink blot', '💧', 'bronze', 3),
  ('ink-off-the-margin', 'ink', 'Off the Margin', 'Climb 100 m in one run', '📏', 'bronze', 4),
  ('ink-page-two', 'ink', 'Page Two', 'Climb 200 m in one run', '📄', 'bronze', 5),
  ('ink-breaking-ruled', 'ink', 'Breaking Ruled', 'Break 25 blocks', '🧱', 'bronze', 6),
  ('ink-ping', 'ink', 'Ping', 'Score off 20 bumpers', '🔶', 'bronze', 7),
  ('ink-stargazer', 'ink', 'Stargazer', 'Collect 25 stars', '⭐', 'bronze', 8),
  ('ink-chain-of-thought', 'ink', 'Chain of Thought', 'Reach a ×5 combo', '🔗', 'bronze', 9),
  ('ink-well-marked', 'ink', 'Well Marked', 'Score 2,500 points in one run', '🧮', 'bronze', 10),
  ('ink-warm-pen', 'ink', 'Warm Pen', 'Draw 250 m of line in total', '🖊️', 'bronze', 11),
  ('ink-point-taken', 'ink', 'Point Taken', 'Find out what the red spikes do', '📌', 'bronze', 12),
  ('ink-bookmark', 'ink', 'Bookmark', 'Continue a climb from a checkpoint', '🔖', 'bronze', 13),
  ('ink-doodler', 'ink', 'Doodler', 'Play 10 runs', '🌀', 'bronze', 14),
  ('ink-homework', 'ink', 'Homework', 'Take on the daily challenge', '📅', 'bronze', 15),
  ('ink-page-four', 'ink', 'Page Four', 'Climb 400 m in one run', '📚', 'silver', 16),
  ('ink-train-of-thought', 'ink', 'Train of Thought', 'Reach a ×12 combo', '🚂', 'silver', 17),
  ('ink-straight-as', 'ink', 'Straight A''s', 'Score 10,000 points in one run', '🅰️', 'silver', 18),
  ('ink-gilded', 'ink', 'Gilded', 'Break 10 gold blocks', '🟨', 'silver', 19),
  ('ink-star-pupil', 'ink', 'Star Pupil', 'Collect 150 stars', '🌟', 'silver', 20),
  ('ink-kilometre-of-ink', 'ink', 'A Kilometre of Ink', 'Draw 1 km of line in total', '🖋️', 'silver', 21),
  ('ink-deadline-met', 'ink', 'Deadline Met', 'Finish the daily challenge', '✅', 'silver', 22),
  ('ink-three-days-running', 'ink', 'Three Days Running', 'Keep a 3-day daily streak', '🔥', 'silver', 23),
  ('ink-frugal-hand', 'ink', 'Frugal Hand', 'Reach 200 m on 8 strokes or fewer', '🤏', 'silver', 24),
  ('ink-notebook-filled', 'ink', 'Notebook Filled', 'Play 50 runs', '📓', 'silver', 25),
  ('ink-fan-mail', 'ink', 'Fan Mail', 'Climb 600 m in one run', '🌬️', 'gold', 26),
  ('ink-gold-star', 'ink', 'The Gold Star', 'Catch the big gold star', '🏅', 'gold', 27),
  ('ink-runaway-chain', 'ink', 'Runaway Chain', 'Reach a ×20 combo', '⛓️', 'gold', 28),
  ('ink-top-of-the-class', 'ink', 'Top of the Class', 'Score 25,000 points in one run', '🏆', 'gold', 29),
  ('ink-full-marks', 'ink', 'Full Marks', 'Clear the daily under all five rules', '🎓', 'gold', 30),
  ('ink-ink-master', 'ink', 'INK Master', 'Unlock the other 30 trophies', '👑', 'platinum', 31)
ON CONFLICT (id) DO NOTHING;

COMMIT;
