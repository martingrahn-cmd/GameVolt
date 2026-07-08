-- ============================================================
-- Windowed leaderboard helpers (generic — works for every game).
-- Adds OFFSET paging, a total-players count, and a single-user rank,
-- so a game can show "around me", "jump to rank N", leaders and last place.
-- Run in Supabase SQL Editor. Idempotent (CREATE OR REPLACE).
-- ============================================================

-- Ranked window with OFFSET (best score per player, ties broken by earliest).
CREATE OR REPLACE FUNCTION get_leaderboard_page(
  p_game_id TEXT,
  p_mode    TEXT DEFAULT 'default',
  p_offset  INT  DEFAULT 0,
  p_limit   INT  DEFAULT 20
)
RETURNS TABLE(
  rank BIGINT, user_id UUID, username TEXT, avatar_url TEXT, score INT, created_at TIMESTAMPTZ
) AS $$
  SELECT rank, user_id, username, avatar_url, score, created_at FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY s.score DESC, s.created_at ASC) AS rank,
      s.user_id, p.username, p.avatar_url, s.score, s.created_at
    FROM (
      SELECT DISTINCT ON (user_id) user_id, score, created_at
      FROM scores
      WHERE game_id = p_game_id AND mode = p_mode
      ORDER BY user_id, score DESC, created_at ASC
    ) s
    JOIN profiles p ON p.id = s.user_id
  ) ranked
  ORDER BY rank
  OFFSET GREATEST(p_offset, 0)
  LIMIT  GREATEST(p_limit, 1);
$$ LANGUAGE sql STABLE;

-- Total distinct players on a board.
CREATE OR REPLACE FUNCTION get_leaderboard_count(
  p_game_id TEXT,
  p_mode    TEXT DEFAULT 'default'
)
RETURNS BIGINT AS $$
  SELECT COUNT(DISTINCT user_id)
  FROM scores
  WHERE game_id = p_game_id AND mode = p_mode;
$$ LANGUAGE sql STABLE;

-- A single player's rank + best score on a board.
CREATE OR REPLACE FUNCTION get_user_rank(
  p_game_id TEXT,
  p_mode    TEXT DEFAULT 'default',
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(rank BIGINT, score INT) AS $$
  SELECT rank, score FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY s.score DESC, s.created_at ASC) AS rank,
      s.user_id, s.score
    FROM (
      SELECT DISTINCT ON (user_id) user_id, score, created_at
      FROM scores
      WHERE game_id = p_game_id AND mode = p_mode
      ORDER BY user_id, score DESC, created_at ASC
    ) s
  ) ranked
  WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION get_leaderboard_page(TEXT, TEXT, INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard_count(TEXT, TEXT)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_rank(TEXT, TEXT, UUID)            TO anon, authenticated;
