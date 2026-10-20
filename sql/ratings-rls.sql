-- ============================================================
-- Lock down the raw `ratings` rows
--
-- Anonymous visitors can currently SELECT every row of `ratings`, which means
-- anyone can enumerate which user rated which game:
--
--   GET /rest/v1/ratings?select=user_id,game_id,rating
--   -> [{"user_id":"e544102c-…","game_id":"asteroid-storm","rating":5}, …]
--
-- That access existed because the card badge had no other way to compute an
-- average. get_rating_aggregates() replaced that (sql/rating-aggregates.sql),
-- and it is SECURITY DEFINER, so the public numbers keep working with no read
-- access to the table at all.
--
-- After this file:
--   anon           may call the aggregate RPCs; cannot read the table
--   authenticated  may read and write ONLY its own rows
--
-- Nothing in the SDK needs more than that: rating.get() and rating.submit()
-- only ever touch the signed-in user's own row, and the averages come from the
-- RPCs. The one thing this does retire is the SDK's pre-migration fallback,
-- which scanned the table client-side — so run sql/rating-aggregates.sql FIRST
-- and confirm the RPCs answer before running this.
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Read your own rating (so the star widget can show what you already picked).
DROP POLICY IF EXISTS ratings_select_own ON ratings;
CREATE POLICY ratings_select_own ON ratings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Cast a rating.
DROP POLICY IF EXISTS ratings_insert_own ON ratings;
CREATE POLICY ratings_insert_own ON ratings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Change a rating you already cast (the SDK upserts on user_id,game_id).
DROP POLICY IF EXISTS ratings_update_own ON ratings;
CREATE POLICY ratings_update_own ON ratings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Belt and braces: with no policy for anon, RLS already denies it, but the
-- table-level grant is what shows up in the API surface.
REVOKE ALL ON ratings FROM anon;

-- The three policies above need a table-level grant to sit on. Until now that
-- came from Supabase granting every new `public` table automatically, which
-- stops on 30 October 2026 — so a rebuilt database would apply these policies
-- to a table `authenticated` could not open at all, and the star widget would
-- fail with 42501 rather than showing a rating. Stated explicitly:
GRANT SELECT, INSERT, UPDATE ON ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ratings TO service_role;

-- The aggregate functions are SECURITY DEFINER and keep working regardless.
GRANT EXECUTE ON FUNCTION get_rating_aggregates() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_rating_aggregate(TEXT) TO anon, authenticated;
