-- ============================================================
-- One Stroke ranked Daily / Weekly integrity
-- Run after challenges.sql and daily-leaderboard.sql.
--
-- The server owns the active UTC event and accepts exactly one
-- ranked run per authenticated player and event seed.
-- ============================================================

CREATE OR REPLACE FUNCTION get_one_stroke_competition_event(p_mode TEXT)
RETURNS TABLE(
    mode TEXT,
    event_id TEXT,
    seed TEXT,
    level_count INT,
    opens_at TIMESTAMPTZ,
    closes_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_day DATE := (v_now AT TIME ZONE 'UTC')::DATE;
    v_week_start DATE := date_trunc('week', v_now AT TIME ZONE 'UTC')::DATE;
BEGIN
    IF p_mode = 'daily' THEN
        RETURN QUERY SELECT
            'daily'::TEXT,
            to_char(v_day, 'YYYY-MM-DD'),
            'daily-' || to_char(v_day, 'YYYY-MM-DD'),
            5,
            v_day::TIMESTAMP AT TIME ZONE 'UTC',
            (v_day + 1)::TIMESTAMP AT TIME ZONE 'UTC';
    ELSIF p_mode = 'weekly' THEN
        RETURN QUERY SELECT
            'weekly'::TEXT,
            to_char(v_day, 'IYYY-"W"IW'),
            'weekly-' || to_char(v_day, 'IYYY-"W"IW'),
            10,
            v_week_start::TIMESTAMP AT TIME ZONE 'UTC',
            (v_week_start + 7)::TIMESTAMP AT TIME ZONE 'UTC';
    ELSE
        RAISE EXCEPTION 'Unsupported competition mode';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION submit_one_stroke_competition_run(
    p_game_id TEXT,
    p_mode TEXT,
    p_score INT,
    p_time_ms INT,
    p_completed_count INT,
    p_total_count INT,
    p_splits JSONB DEFAULT '[]'::JSONB,
    p_stats JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(
    accepted BOOLEAN,
    reason TEXT,
    challenge_id UUID,
    seed TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user UUID := auth.uid();
    v_event RECORD;
    v_challenge UUID;
    v_existing UUID;
    v_split JSONB;
    v_split_time BIGINT := 0;
    v_split_score BIGINT := 0;
    v_expected_count INT;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    IF p_game_id <> 'one-stroke' THEN
        RAISE EXCEPTION 'Invalid game';
    END IF;

    SELECT * INTO v_event FROM get_one_stroke_competition_event(p_mode);
    v_expected_count := v_event.level_count;

    IF p_completed_count <> v_expected_count
       OR p_total_count <> v_expected_count
       OR jsonb_typeof(p_splits) <> 'array'
       OR jsonb_array_length(p_splits) <> v_expected_count
       OR p_time_ms < 15000
       OR p_time_ms > 86400000
       OR p_score < v_expected_count * 60
       OR p_score > v_expected_count * 30000 THEN
        RETURN QUERY SELECT false, 'invalid_run'::TEXT, NULL::UUID, v_event.seed;
        RETURN;
    END IF;

    FOR v_split IN SELECT value FROM jsonb_array_elements(p_splits)
    LOOP
        IF COALESCE((v_split->>'time')::BIGINT, 0) < 800
           OR COALESCE((v_split->>'score')::BIGINT, 0) < 60
           OR COALESCE((v_split->>'undos')::INT, 0) < 0
           OR COALESCE((v_split->>'resets')::INT, 0) < 0
           OR COALESCE((v_split->>'hints')::INT, 0) < 0 THEN
            RETURN QUERY SELECT false, 'invalid_split'::TEXT, NULL::UUID, v_event.seed;
            RETURN;
        END IF;
        v_split_time := v_split_time + (v_split->>'time')::BIGINT;
        v_split_score := v_split_score + (v_split->>'score')::BIGINT;
    END LOOP;

    IF v_split_time <> p_time_ms OR v_split_score <> p_score THEN
        RETURN QUERY SELECT false, 'totals_mismatch'::TEXT, NULL::UUID, v_event.seed;
        RETURN;
    END IF;

    -- Serialize creation/submission for this game + event.
    PERFORM pg_advisory_xact_lock(hashtext(p_game_id || ':' || v_event.seed));

    SELECT cr.id INTO v_existing
    FROM challenge_runs cr
    JOIN challenges c ON c.id = cr.challenge_id
    WHERE c.game_id = p_game_id
      AND c.seed = v_event.seed
      AND cr.user_id = v_user
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
        RETURN QUERY SELECT false, 'already_submitted'::TEXT, NULL::UUID, v_event.seed;
        RETURN;
    END IF;

    SELECT c.id INTO v_challenge
    FROM challenges c
    WHERE c.game_id = p_game_id AND c.seed = v_event.seed
    ORDER BY c.created_at, c.id
    LIMIT 1;

    IF v_challenge IS NULL THEN
        INSERT INTO challenges(game_id, created_by, seed, level_count, config)
        VALUES (
            p_game_id,
            v_user,
            v_event.seed,
            v_expected_count,
            jsonb_build_object('mode', p_mode, 'serverManaged', true, 'eventId', v_event.event_id)
        )
        RETURNING id INTO v_challenge;
    END IF;

    INSERT INTO challenge_runs(
        challenge_id, user_id, score, time_ms, completed_count,
        total_count, splits, stats
    )
    VALUES (
        v_challenge, v_user, p_score, p_time_ms, p_completed_count,
        p_total_count, p_splits, p_stats || jsonb_build_object(
            'serverValidated', true,
            'eventId', v_event.event_id,
            'mode', p_mode
        )
    );

    RETURN QUERY SELECT true, 'accepted'::TEXT, v_challenge, v_event.seed;
END;
$$;

REVOKE ALL ON FUNCTION get_one_stroke_competition_event(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION submit_one_stroke_competition_run(TEXT, TEXT, INT, INT, INT, INT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_one_stroke_competition_event(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_one_stroke_competition_run(TEXT, TEXT, INT, INT, INT, INT, JSONB, JSONB) TO authenticated;
