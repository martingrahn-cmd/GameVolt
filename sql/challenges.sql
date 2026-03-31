-- ============================================================
-- GameVolt Challenges Schema (async multiplayer)
-- Run this in Supabase SQL Editor after the base schema.
-- ============================================================

-- Challenges: a seeded set of levels two players can compare
CREATE TABLE IF NOT EXISTS challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id TEXT REFERENCES games(id) NOT NULL,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    seed TEXT NOT NULL,
    level_count INT NOT NULL DEFAULT 10,
    config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'complete')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge runs: each player's result for a challenge
CREATE TABLE IF NOT EXISTS challenge_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_id UUID REFERENCES challenges(id) NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    score INT NOT NULL,
    time_ms INT NOT NULL,
    completed_count INT NOT NULL DEFAULT 0,
    total_count INT NOT NULL DEFAULT 0,
    splits JSONB DEFAULT '[]',
    stats JSONB DEFAULT '{}',
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (challenge_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenges_game ON challenges(game_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_created_by ON challenges(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_runs_challenge ON challenge_runs(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_runs_user ON challenge_runs(user_id, completed_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_runs ENABLE ROW LEVEL SECURITY;

-- challenges: public read, authenticated insert
DROP POLICY IF EXISTS "challenges_select" ON challenges;
DROP POLICY IF EXISTS "challenges_insert" ON challenges;
DROP POLICY IF EXISTS "challenges_update" ON challenges;
CREATE POLICY "challenges_select" ON challenges FOR SELECT USING (true);
CREATE POLICY "challenges_insert" ON challenges FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "challenges_update" ON challenges FOR UPDATE USING (auth.uid() = created_by);

-- challenge_runs: public read (so opponent can see result), own insert
DROP POLICY IF EXISTS "challenge_runs_select" ON challenge_runs;
DROP POLICY IF EXISTS "challenge_runs_insert" ON challenge_runs;
CREATE POLICY "challenge_runs_select" ON challenge_runs FOR SELECT USING (true);
CREATE POLICY "challenge_runs_insert" ON challenge_runs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Get challenge with all runs (for result comparison)
-- ============================================================
CREATE OR REPLACE FUNCTION get_challenge(p_challenge_id UUID)
RETURNS TABLE(
    challenge_id UUID,
    game_id TEXT,
    seed TEXT,
    level_count INT,
    config JSONB,
    status TEXT,
    created_at TIMESTAMPTZ,
    created_by UUID,
    creator_username TEXT,
    run_user_id UUID,
    run_username TEXT,
    run_avatar_url TEXT,
    run_score INT,
    run_time_ms INT,
    run_completed_count INT,
    run_total_count INT,
    run_splits JSONB,
    run_stats JSONB,
    run_completed_at TIMESTAMPTZ
) AS $$
    SELECT
        c.id AS challenge_id,
        c.game_id,
        c.seed,
        c.level_count,
        c.config,
        c.status,
        c.created_at,
        c.created_by,
        cp.username AS creator_username,
        cr.user_id AS run_user_id,
        rp.username AS run_username,
        rp.avatar_url AS run_avatar_url,
        cr.score AS run_score,
        cr.time_ms AS run_time_ms,
        cr.completed_count AS run_completed_count,
        cr.total_count AS run_total_count,
        cr.splits AS run_splits,
        cr.stats AS run_stats,
        cr.completed_at AS run_completed_at
    FROM challenges c
    JOIN profiles cp ON cp.id = c.created_by
    LEFT JOIN challenge_runs cr ON cr.challenge_id = c.id
    LEFT JOIN profiles rp ON rp.id = cr.user_id
    WHERE c.id = p_challenge_id
    ORDER BY cr.score DESC NULLS LAST;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- List challenges for a user (created + participated)
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_challenges(
    p_user_id UUID,
    p_game_id TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS TABLE(
    challenge_id UUID,
    game_id TEXT,
    seed TEXT,
    level_count INT,
    status TEXT,
    created_at TIMESTAMPTZ,
    creator_username TEXT,
    my_score INT,
    my_time_ms INT,
    opponent_username TEXT,
    opponent_score INT,
    opponent_time_ms INT,
    run_count BIGINT
) AS $$
    SELECT
        c.id AS challenge_id,
        c.game_id,
        c.seed,
        c.level_count,
        c.status,
        c.created_at,
        cp.username AS creator_username,
        my.score AS my_score,
        my.time_ms AS my_time_ms,
        op_profile.username AS opponent_username,
        op.score AS opponent_score,
        op.time_ms AS opponent_time_ms,
        (SELECT COUNT(*) FROM challenge_runs WHERE challenge_id = c.id) AS run_count
    FROM challenges c
    JOIN profiles cp ON cp.id = c.created_by
    LEFT JOIN challenge_runs my ON my.challenge_id = c.id AND my.user_id = p_user_id
    LEFT JOIN challenge_runs op ON op.challenge_id = c.id AND op.user_id != p_user_id
    LEFT JOIN profiles op_profile ON op_profile.id = op.user_id
    WHERE
        (c.created_by = p_user_id OR my.user_id IS NOT NULL)
        AND (p_game_id IS NULL OR c.game_id = p_game_id)
    ORDER BY c.created_at DESC
    LIMIT p_limit;
$$ LANGUAGE sql STABLE;
