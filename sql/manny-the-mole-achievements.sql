-- ============================================================
-- Manny the Mole: game row + leaderboard registration.
-- Run in Supabase SQL Editor.
-- Idempotent: safe to re-run.
--
-- The games row is REQUIRED before anything else works: the scores
-- table (leaderboards) FKs to games.id. Manny submits two boards:
--   mode 'score'        — best run score (higher is better, raw)
--   mode 'daily-streak' — daily-lock streak in days (higher is better)
--
-- Achievement definitions are NOT registered yet. The game ships with
-- its own 38-trophy cabinet stored locally; mapping it onto the site's
-- 31-slot tier standard (15 bronze / 10 silver / 5 gold / 1 platinum)
-- is a follow-up. Until then the game never calls
-- GameVolt.achievements.unlock(), so nothing here can FK-fail.
-- ============================================================

-- Game row (required — scores/achievements FK to games.id)
INSERT INTO games (id, title, thumbnail_url) VALUES
  ('manny-the-mole', 'Manny the Mole', '/manny-the-mole/og-image.png')
ON CONFLICT (id) DO NOTHING;
