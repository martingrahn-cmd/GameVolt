-- ============================================================
-- Play counter
-- Increments games.play_count once per game load (called from /play/).
-- SECURITY DEFINER so anonymous players can increment despite RLS
-- (there is no UPDATE policy on games; reads use the existing
--  "games_select" policy: anon may SELECT id, play_count).
-- Idempotent — safe to re-run.
-- ============================================================
CREATE OR REPLACE FUNCTION increment_play_count(p_game_id TEXT)
RETURNS INT AS $$
DECLARE v_count INT;
BEGIN
  UPDATE games SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = p_game_id
  RETURNING play_count INTO v_count;
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION increment_play_count(TEXT) TO anon, authenticated;
