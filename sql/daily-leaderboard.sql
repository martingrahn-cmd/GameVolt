-- ============================================================
-- Daily challenge leaderboard (best score per player)
-- Run this in Supabase SQL Editor after challenges.sql
-- ============================================================

CREATE OR REPLACE FUNCTION get_daily_leaderboard(
    p_game_id TEXT,
    p_seed TEXT,
    p_limit INT DEFAULT 50
)
RETURNS TABLE(
    rank BIGINT,
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    score INT,
    time_ms INT,
    completed_count INT,
    total_count INT,
    completed_at TIMESTAMPTZ
) AS $$
    SELECT
        ROW_NUMBER() OVER (ORDER BY best.score DESC, best.time_ms ASC) AS rank,
        best.user_id,
        p.username,
        p.avatar_url,
        best.score,
        best.time_ms,
        best.completed_count,
        best.total_count,
        best.completed_at
    FROM (
        SELECT DISTINCT ON (cr.user_id)
            cr.user_id,
            cr.score,
            cr.time_ms,
            cr.completed_count,
            cr.total_count,
            cr.completed_at
        FROM challenge_runs cr
        JOIN challenges c ON c.id = cr.challenge_id
        WHERE c.game_id = p_game_id
          AND c.seed = p_seed
        ORDER BY cr.user_id, cr.score DESC, cr.time_ms ASC
    ) best
    JOIN profiles p ON p.id = best.user_id
    ORDER BY best.score DESC, best.time_ms ASC
    LIMIT p_limit;
$$ LANGUAGE sql STABLE;
