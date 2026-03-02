-- ============================================================
-- GameVolt Database Schema (idempotent — safe to re-run)
-- Run this in Supabase SQL Editor after creating your project.
-- ============================================================

-- Users (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    total_play_time_seconds INT DEFAULT 0
);

-- Games registry
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    play_count INT DEFAULT 0
);

-- Cloud saves (one JSONB blob per user per game)
CREATE TABLE IF NOT EXISTS saves (
    user_id UUID REFERENCES profiles(id),
    game_id TEXT REFERENCES games(id),
    save_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
);

-- Highscores / leaderboard entries
CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    game_id TEXT REFERENCES games(id),
    mode TEXT DEFAULT 'default',
    score INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievement_defs (
    id TEXT PRIMARY KEY,
    game_id TEXT REFERENCES games(id),
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    tier TEXT DEFAULT 'bronze',
    sort_order INT DEFAULT 0
);

-- User achievements (unlocked)
-- No FK to achievement_defs: achievements are defined client-side per game
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id UUID REFERENCES profiles(id),
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

-- Daily challenges
CREATE TABLE IF NOT EXISTS daily_challenges (
    date DATE PRIMARY KEY,
    game_id TEXT REFERENCES games(id),
    challenge_type TEXT NOT NULL,
    target_value INT NOT NULL,
    description TEXT NOT NULL
);

-- Daily challenge completions
CREATE TABLE IF NOT EXISTS daily_completions (
    user_id UUID REFERENCES profiles(id),
    date DATE REFERENCES daily_challenges(date),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, date)
);

-- Game ratings
CREATE TABLE IF NOT EXISTS ratings (
    user_id UUID REFERENCES profiles(id),
    game_id TEXT REFERENCES games(id),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    PRIMARY KEY (user_id, game_id)
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
    user_id UUID REFERENCES profiles(id),
    game_id TEXT REFERENCES games(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scores_game_mode ON scores(game_id, mode, score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_defs_game ON achievement_defs(game_id, sort_order);

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      'player_' || LEFT(NEW.id::text, 8)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Leaderboard function: best score per player + ranking
-- ============================================================
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_game_id TEXT,
  p_mode TEXT DEFAULT 'default',
  p_limit INT DEFAULT 50
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  score INT,
  created_at TIMESTAMPTZ
) AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY s.score DESC) AS rank,
    s.user_id, p.username, p.avatar_url, s.score, s.created_at
  FROM (
    SELECT DISTINCT ON (user_id) user_id, score, created_at
    FROM scores
    WHERE game_id = p_game_id AND mode = p_mode
    ORDER BY user_id, score DESC
  ) s
  JOIN profiles p ON p.id = s.user_id
  ORDER BY s.score DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_defs ENABLE ROW LEVEL SECURITY;

-- profiles: public read, own update, open insert (for trigger)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);

-- saves: own data only
DROP POLICY IF EXISTS "saves_select" ON saves;
DROP POLICY IF EXISTS "saves_insert" ON saves;
DROP POLICY IF EXISTS "saves_update" ON saves;
CREATE POLICY "saves_select" ON saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saves_insert" ON saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saves_update" ON saves FOR UPDATE USING (auth.uid() = user_id);

-- scores: public read, own insert
DROP POLICY IF EXISTS "scores_select" ON scores;
DROP POLICY IF EXISTS "scores_insert" ON scores;
CREATE POLICY "scores_select" ON scores FOR SELECT USING (true);
CREATE POLICY "scores_insert" ON scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_achievements: public read, own insert
DROP POLICY IF EXISTS "user_achievements_select" ON user_achievements;
DROP POLICY IF EXISTS "user_achievements_insert" ON user_achievements;
CREATE POLICY "user_achievements_select" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "user_achievements_insert" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- games: public read (admin inserts via SQL editor)
DROP POLICY IF EXISTS "games_select" ON games;
CREATE POLICY "games_select" ON games FOR SELECT USING (true);

-- achievement_defs: public read (admin inserts via SQL editor)
DROP POLICY IF EXISTS "achievement_defs_select" ON achievement_defs;
CREATE POLICY "achievement_defs_select" ON achievement_defs FOR SELECT USING (true);

-- ============================================================
-- Seed: games registry
-- ============================================================
INSERT INTO games (id, title, thumbnail_url) VALUES
  ('breakout',   'Breakout',    '/assets/thumbnails/breakout.webp'),
  ('hoverdash',  'HoverDash',   '/hoverdash/og-image.png'),
  ('snake',      'Snake Neo',   '/assets/thumbnails/snake.webp'),
  ('blockstorm', 'BlockStorm',  '/assets/thumbnails/blockstorm.webp'),
  ('solitaire',  'Solitaire',   '/assets/thumbnails/solitaire.webp'),
  ('connect4',   'Connect 4',   '/assets/thumbnails/connect4.webp'),
  ('clickrush',  'ClickRush',   '/assets/thumbnails/clickrush.webp'),
  ('axeluga',    'Axeluga',     '/assets/thumbnails/axeluga.webp')
ON CONFLICT (id) DO NOTHING;
