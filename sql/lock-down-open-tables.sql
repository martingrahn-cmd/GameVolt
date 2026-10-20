-- ============================================================
-- Close the three tables that anyone can still read
--
-- schema.sql creates ten tables but only enables RLS on six. `ratings` was
-- closed later in ratings-rls.sql. These three were never closed:
--
--     daily_challenges, daily_completions, favorites
--
-- Verified against production on 2026-10-20 with the site's own public anon
-- key, the same request any visitor's browser can make:
--
--   GET /rest/v1/favorites?select=*&limit=0   -> 200, Content-Range */0
--   GET /rest/v1/daily_completions?...        -> 200, Content-Range */0
--   GET /rest/v1/daily_challenges?...         -> 200, Content-Range */0
--   GET /rest/v1/ratings?...                  -> 401 permission denied
--
-- All three answered; all three are empty. Nothing has leaked, because the
-- features behind them were never built: no code reads or writes
-- daily_challenges or daily_completions, and favorites is only ever touched
-- for the signed-in user (sdk/gamevolt.js:1193-1245), with guests keeping
-- theirs in localStorage. So this closes a door before there is anything
-- behind it, which is the only comfortable time to do it.
--
-- Without RLS the automatic grant is the whole story: anon could also have
-- inserted and deleted rows. After 30 October 2026 new tables stop getting
-- that grant, but these three already have it — the change does not reach
-- backwards.
--
-- After this file:
--   daily_challenges   anyone may read (it is the published challenge of the
--                      day); only service_role writes
--   daily_completions  a signed-in user reads and inserts only their own rows
--   favorites          a signed-in user reads, adds and removes only their own
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ---------- daily_challenges: public reference data ----------
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

-- The day's challenge is meant to be visible to everyone, signed in or not.
DROP POLICY IF EXISTS daily_challenges_select ON daily_challenges;
CREATE POLICY daily_challenges_select ON daily_challenges
  FOR SELECT USING (true);

-- No write policy: inserts and updates are left to service_role, which
-- bypasses RLS. Challenges get published from the SQL editor or a job.
REVOKE INSERT, UPDATE, DELETE ON daily_challenges FROM anon, authenticated;
GRANT SELECT ON daily_challenges TO anon, authenticated;

-- ---------- daily_completions: your own completions ----------
ALTER TABLE daily_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_completions_select_own ON daily_completions;
CREATE POLICY daily_completions_select_own ON daily_completions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS daily_completions_insert_own ON daily_completions;
CREATE POLICY daily_completions_insert_own ON daily_completions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- A completion is a fact: once recorded it is not edited or withdrawn.
REVOKE ALL ON daily_completions FROM anon;
REVOKE UPDATE, DELETE ON daily_completions FROM authenticated;
GRANT SELECT, INSERT ON daily_completions TO authenticated;

-- NOTE: if a daily leaderboard later needs to show who finished today, do it
-- with a SECURITY DEFINER aggregate the way get_rating_aggregates() does
-- (sql/rating-aggregates.sql), not by opening SELECT to anon. Otherwise the
-- table becomes enumerable: user_id plus date for every player.

-- ---------- favorites: your own list ----------
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS favorites_select_own ON favorites;
CREATE POLICY favorites_select_own ON favorites
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- The SDK upserts on (user_id, game_id) when merging a guest's localStorage
-- favorites up to the cloud, so INSERT and UPDATE are both needed.
DROP POLICY IF EXISTS favorites_insert_own ON favorites;
CREATE POLICY favorites_insert_own ON favorites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS favorites_update_own ON favorites;
CREATE POLICY favorites_update_own ON favorites
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Un-favouriting is a delete (sdk/gamevolt.js:611).
DROP POLICY IF EXISTS favorites_delete_own ON favorites;
CREATE POLICY favorites_delete_own ON favorites
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON favorites FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON favorites TO authenticated;

-- ---------- check ----------
-- Re-run the probe above afterwards: favorites and daily_completions should
-- answer 401 for anon, daily_challenges should still answer 200.
