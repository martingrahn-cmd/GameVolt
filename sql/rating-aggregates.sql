-- ============================================================
-- Rating aggregates
--
-- The card badge used to be front-page-only, so the SDK could get away with
-- selecting every row of `ratings` and averaging in the browser. It now runs on
-- seven listing pages, and the payload grows with every rating ever cast — so
-- the averaging moves to the database, which returns one row per game instead.
--
-- SECURITY DEFINER so anonymous visitors get the numbers without needing read
-- access to the raw rows. That is the second win here: the aggregate is all a
-- visitor ever needed, and this stops handing out per-user rating rows to
-- satisfy a badge.
--
-- The SDK falls back to the old client-side scan when these functions are
-- absent, so deploying the site before running this file is safe — it just
-- keeps the old behaviour until you do.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- The primary key is (user_id, game_id), so filtering or grouping by game_id
-- alone had no index to use.
CREATE INDEX IF NOT EXISTS ratings_game_id_idx ON ratings (game_id);

-- Every game at once — what the listing pages need.
CREATE OR REPLACE FUNCTION get_rating_aggregates()
RETURNS TABLE (game_id TEXT, avg_rating NUMERIC, rating_count BIGINT) AS $$
  SELECT r.game_id,
         ROUND(AVG(r.rating)::numeric, 2),
         COUNT(*)
  FROM ratings r
  WHERE r.rating IS NOT NULL
  GROUP BY r.game_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- One game — what a game page needs for its own badge.
CREATE OR REPLACE FUNCTION get_rating_aggregate(p_game_id TEXT)
RETURNS TABLE (avg_rating NUMERIC, rating_count BIGINT) AS $$
  SELECT COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0),
         COUNT(*)
  FROM ratings r
  WHERE r.game_id = p_game_id AND r.rating IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_rating_aggregates() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_rating_aggregate(TEXT) TO anon, authenticated;
