-- ============================================================
-- Explicit Data API grants for every table in `public`
--
-- From 30 October 2026 Supabase stops granting Data API access to new tables
-- in `public` automatically. Existing tables keep what they have, so
-- production is unaffected and nothing here changes it.
--
-- What this file is for is the rebuild case: `supabase db reset`, a preview
-- branch, or standing the project up again from sql/. Today those come out
-- working because Supabase grants behind our backs. After 30 October they come
-- out dead — every call returning 42501 "permission denied" — because none of
-- the files that CREATE TABLE ever granted anything. This file is the missing
-- half, kept in one place rather than scattered, since these files are applied
-- by hand in the SQL editor and not by a migration tool.
--
-- Grants are not RLS. A grant decides whether a role may touch the table at
-- all; RLS decides which rows. PostgREST checks the grant first and rejects
-- the request before any policy is evaluated, so both are needed.
--
-- Run AFTER schema.sql, challenges.sql and type-or-die.sql, and after
-- lock-down-open-tables.sql and ratings-rls.sql, which narrow three of these
-- tables further. Idempotent — safe to re-run.
--
-- device_auth_requests is deliberately absent: device-auth.sql already grants
-- it correctly (service_role only).
-- ============================================================

-- service_role is the backend identity and bypasses RLS. It gets everything.
GRANT SELECT, INSERT, UPDATE, DELETE ON
    profiles, games, saves, scores, achievement_defs, user_achievements,
    daily_challenges, daily_completions, ratings, favorites,
    challenges, challenge_runs, tod_runs, tod_leaderboard
  TO service_role;

-- ---------- public reads ----------
-- Visible without signing in, because the leaderboards, trophy lists and game
-- catalogue all render for guests. RLS policies on each of these are
-- FOR SELECT USING (true).
GRANT SELECT ON
    profiles, games, scores, achievement_defs, user_achievements,
    daily_challenges, challenges, challenge_runs, tod_runs, tod_leaderboard
  TO anon, authenticated;

-- ---------- signed-in writes ----------
-- Every one of these is gated by a policy requiring auth.uid() = user_id,
-- so the grant opens the table and the policy picks the rows.
GRANT INSERT ON scores, user_achievements, challenge_runs, tod_runs TO authenticated;
GRANT UPDATE ON user_achievements, challenge_runs, profiles TO authenticated;
GRANT INSERT, UPDATE ON challenges TO authenticated;
GRANT SELECT, INSERT, UPDATE ON saves TO authenticated;

-- No INSERT on profiles for anyone: rows are created by the on_auth_user_created
-- trigger (schema.sql), which runs as its owner. The profiles_insert policy
-- checks `true`, so granting INSERT would let any signed-in user write rows for
-- other ids. Supabase's own advice for the new regime is to grant only what the
-- role needs, and the client needs UPDATE on its own row and nothing more.

-- `scores.id` is SERIAL, so an INSERT also needs the sequence. (Identity
-- columns would not; serial ones do, and this is the one table using it.)
GRANT USAGE, SELECT ON SEQUENCE scores_id_seq TO authenticated, service_role;

-- ---------- private tables ----------
-- ratings, favorites and daily_completions are reachable only by the signed-in
-- owner, and anon gets nothing. Their grants live with the policies that
-- justify them, in ratings-rls.sql and lock-down-open-tables.sql, so that
-- reading either file shows the whole rule rather than half of it.
