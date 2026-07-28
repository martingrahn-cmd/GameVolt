-- ============================================================
-- Play streaks
--
-- profiles.current_streak and profiles.longest_streak have existed since the
-- first schema and nothing has ever written to them — same for last_seen. This
-- is the write path.
--
-- A streak day is a day the player actually played something, on any of the 21
-- games. Not "opened the site": the SDK call sits behind the same signal that
-- fires game_start, so a bounce does not count.
--
-- Days are UTC, matching golden-glyphs/src/js/daily.js, which is what every
-- existing per-game daily already uses. A second definition of "a day" on the
-- same site would be a bug waiting to happen.
--
-- SECURITY DEFINER and auth.uid(): a player can only ever move their own
-- streak, and never needs write access to the profiles table to do it.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- The streak counters need to know which day was last counted. last_seen is a
-- timestamp touched on any visit, so it cannot answer that question.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_play_date DATE;

-- Count today for the signed-in player and return the new totals.
-- Calling it more than once a day is harmless: the first call moves the
-- streak, the rest are no-ops that report the same numbers.
CREATE OR REPLACE FUNCTION record_play_day()
RETURNS TABLE (streak_current INT, streak_longest INT, streak_last_day DATE) AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::date;
  v_last  DATE;
  v_cur   INT;
  v_max   INT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;                      -- guests keep their streak in localStorage
  END IF;

  SELECT p.last_play_date, COALESCE(p.current_streak, 0), COALESCE(p.longest_streak, 0)
    INTO v_last, v_cur, v_max
    FROM profiles p
   WHERE p.id = v_uid;

  IF NOT FOUND THEN
    RETURN;                      -- no profile row yet; nothing to count
  END IF;

  IF v_last = v_today THEN
    NULL;                        -- already counted today
  ELSIF v_last = v_today - 1 THEN
    v_cur := v_cur + 1;          -- consecutive day
  ELSE
    v_cur := 1;                  -- first ever, or the chain broke
  END IF;

  v_max := GREATEST(v_max, v_cur);

  UPDATE profiles
     SET current_streak = v_cur,
         longest_streak = v_max,
         last_play_date = v_today,
         last_seen      = NOW()
   WHERE id = v_uid;

  RETURN QUERY SELECT v_cur, v_max, v_today;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Read without writing, for the profile page.
--
-- Reports a stale streak as 0 rather than repeating the stored number: a chain
-- whose last day is older than yesterday is already broken, and showing "7 day
-- streak" to someone who last played in March would be a lie. The stored value
-- is left alone — record_play_day() resets it on the next play.
CREATE OR REPLACE FUNCTION get_my_streak()
RETURNS TABLE (streak_current INT, streak_longest INT, streak_last_day DATE) AS $$
  SELECT CASE
           WHEN p.last_play_date >= (NOW() AT TIME ZONE 'UTC')::date - 1
           THEN COALESCE(p.current_streak, 0)
           ELSE 0
         END,
         COALESCE(p.longest_streak, 0),
         p.last_play_date
    FROM profiles p
   WHERE p.id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Granting to `authenticated` does not, on its own, keep anon out. Two separate
-- defaults hand it access:
--   * Postgres grants EXECUTE on any new function to PUBLIC;
--   * Supabase additionally runs ALTER DEFAULT PRIVILEGES ... GRANT EXECUTE ON
--     FUNCTIONS TO anon, so anon lands in the ACL by name — revoking PUBLIC
--     alone leaves `anon=X/postgres` sitting there untouched.
--
-- Both functions are no-ops without auth.uid(), so this is not a hole today.
-- But they run SECURITY DEFINER, and the day a branch gets added that forgets
-- the uid check, anon is already holding the key. Take both defaults away.
REVOKE EXECUTE ON FUNCTION record_play_day() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_my_streak()   FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION record_play_day() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_streak()   TO authenticated;
