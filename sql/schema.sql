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
-- Achievement unlock (atomic, no 409 on duplicate)
-- ============================================================
CREATE OR REPLACE FUNCTION unlock_achievement(p_user_id UUID, p_achievement_id TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
  VALUES (p_user_id, p_achievement_id, NOW())
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- user_achievements: public read, own insert/update (update needed for upsert)
DROP POLICY IF EXISTS "user_achievements_select" ON user_achievements;
DROP POLICY IF EXISTS "user_achievements_insert" ON user_achievements;
DROP POLICY IF EXISTS "user_achievements_update" ON user_achievements;
CREATE POLICY "user_achievements_select" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "user_achievements_insert" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_achievements_update" ON user_achievements FOR UPDATE USING (auth.uid() = user_id);

-- games: public read (admin inserts via SQL editor)
DROP POLICY IF EXISTS "games_select" ON games;
CREATE POLICY "games_select" ON games FOR SELECT USING (true);

-- achievement_defs: public read (admin inserts via SQL editor)
DROP POLICY IF EXISTS "achievement_defs_select" ON achievement_defs;
CREATE POLICY "achievement_defs_select" ON achievement_defs FOR SELECT USING (true);

-- ============================================================
-- Trophy leaderboard: top players by achievement count + tier breakdown
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked_at ON user_achievements(unlocked_at);

CREATE OR REPLACE FUNCTION get_trophy_leaderboard(
  p_period TEXT DEFAULT 'all',
  p_limit  INT  DEFAULT 50
)
RETURNS TABLE(
  rank         BIGINT,
  user_id      UUID,
  username     TEXT,
  avatar_url   TEXT,
  trophy_count BIGINT,
  bronze       BIGINT,
  silver       BIGINT,
  gold         BIGINT,
  platinum     BIGINT
) AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rank,
    ua.user_id,
    p.username,
    p.avatar_url,
    COUNT(*)                                       AS trophy_count,
    COUNT(*) FILTER (WHERE ad.tier = 'bronze')     AS bronze,
    COUNT(*) FILTER (WHERE ad.tier = 'silver')     AS silver,
    COUNT(*) FILTER (WHERE ad.tier = 'gold')       AS gold,
    COUNT(*) FILTER (WHERE ad.tier = 'platinum')   AS platinum
  FROM user_achievements ua
  JOIN profiles p ON p.id = ua.user_id
  LEFT JOIN achievement_defs ad ON ad.id = ua.achievement_id
  WHERE
    CASE p_period
      WHEN 'day'   THEN ua.unlocked_at >= NOW() - INTERVAL '1 day'
      WHEN 'week'  THEN ua.unlocked_at >= NOW() - INTERVAL '7 days'
      WHEN 'month' THEN ua.unlocked_at >= NOW() - INTERVAL '30 days'
      ELSE TRUE
    END
  GROUP BY ua.user_id, p.username, p.avatar_url
  ORDER BY trophy_count DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Recent activity feed: latest scores + achievements across all games
-- ============================================================
CREATE OR REPLACE FUNCTION get_recent_activity(p_limit INT DEFAULT 20)
RETURNS TABLE(
  activity_type TEXT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  game_id TEXT,
  game_title TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ
) AS $$
  (
    SELECT
      'score'::TEXT AS activity_type,
      s.user_id, p.username, p.avatar_url,
      s.game_id, g.title AS game_title,
      s.score::TEXT AS detail,
      s.created_at
    FROM scores s
    JOIN profiles p ON p.id = s.user_id
    JOIN games g ON g.id = s.game_id
    ORDER BY s.created_at DESC
    LIMIT p_limit
  )
  UNION ALL
  (
    SELECT
      'achievement'::TEXT AS activity_type,
      ua.user_id, p.username, p.avatar_url,
      ad.game_id, g.title AS game_title,
      ad.title AS detail,
      ua.unlocked_at AS created_at
    FROM user_achievements ua
    JOIN profiles p ON p.id = ua.user_id
    LEFT JOIN achievement_defs ad ON ad.id = ua.achievement_id
    LEFT JOIN games g ON g.id = ad.game_id
    ORDER BY ua.unlocked_at DESC
    LIMIT p_limit
  )
  ORDER BY created_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Top scores per game (for homepage mini-leaderboards)
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_scores_all_games(p_limit INT DEFAULT 3)
RETURNS TABLE(
  game_id TEXT,
  user_id UUID,
  username TEXT,
  score INT,
  rank BIGINT
) AS $$
  SELECT sub.game_id, sub.user_id, sub.username, sub.score, sub.rank
  FROM (
    SELECT
      s.game_id,
      s.user_id,
      p.username,
      s.score,
      ROW_NUMBER() OVER (PARTITION BY s.game_id ORDER BY s.score DESC) AS rank
    FROM (
      SELECT DISTINCT ON (game_id, user_id) game_id, user_id, score
      FROM scores
      WHERE mode = 'default'
      ORDER BY game_id, user_id, score DESC
    ) s
    JOIN profiles p ON p.id = s.user_id
  ) sub
  WHERE sub.rank <= p_limit
  ORDER BY sub.game_id, sub.rank;
$$ LANGUAGE sql STABLE;

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
  ('axeluga',    'Axeluga',     '/assets/thumbnails/axeluga.webp'),
  ('gravitywell','Gravity Well', '/assets/thumbnails/gravitywell.webp'),
  ('sudoku',     'Sudoku',      '/assets/thumbnails/sudoku.webp'),
  ('manga-match3','Manga Match', '/assets/thumbnails/manga-match3.webp')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Seed: achievement definitions (for trophy leaderboard tier breakdown)
-- ============================================================
INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  -- HoverDash: Bronze (15)
  ('hoverdash-first_flight',     'hoverdash', 'First Flight',      'Play your first game',                '🛫', 'bronze', 1),
  ('hoverdash-getting_warmed_up','hoverdash', 'Getting Warmed Up', 'Play 10 games',                       '🔥', 'bronze', 2),
  ('hoverdash-hundred_club',     'hoverdash', '100 Club',          'Reach 100 meters',                    '🏃', 'bronze', 3),
  ('hoverdash-coin_collector',   'hoverdash', 'Coin Collector',    'Collect 100 coins in one game',       '🪙', 'bronze', 4),
  ('hoverdash-shield_up',        'hoverdash', 'Shield Up',         'Pick up 3 Shields in one game',       '🛡️', 'bronze', 5),
  ('hoverdash-magnet_hands',     'hoverdash', 'Magnet Hands',      'Pick up 3 Magnets in one game',       '🧲', 'bronze', 6),
  ('hoverdash-nitro',            'hoverdash', 'Nitro',             'Pick up 3 Boosts in one game',        '⚡', 'bronze', 7),
  ('hoverdash-wave_rider',       'hoverdash', 'Wave Rider',        'Clear Wave 3',                        '🌊', 'bronze', 8),
  ('hoverdash-close_call',       'hoverdash', 'Close Call',        'Get 3 Near Misses in one game',       '😬', 'bronze', 9),
  ('hoverdash-pad_surfer',       'hoverdash', 'Pad Surfer',        'Hit 3 Boost Pads in one game',        '🏄', 'bronze', 10),
  ('hoverdash-shield_wall',      'hoverdash', 'Shield Wall',       'Pick up 100 Shields total',           '🧱', 'bronze', 11),
  ('hoverdash-magnet_master',    'hoverdash', 'Magnet Master',     'Pick up 100 Magnets total',           '🧲', 'bronze', 12),
  ('hoverdash-boost_junkie',     'hoverdash', 'Boost Junkie',      'Pick up 100 Boosts total',            '🔥', 'bronze', 13),
  ('hoverdash-ramp_rat',         'hoverdash', 'Ramp Rat',          'Ride 200 ramps total',                '🛹', 'bronze', 14),
  ('hoverdash-wave_5',           'hoverdash', 'Wave 5',            'Clear Wave 7',                        '🌊', 'bronze', 15),
  -- HoverDash: Silver (10)
  ('hoverdash-veteran_pilot',    'hoverdash', 'Veteran Pilot',     'Play 100 games',                      '⭐', 'silver', 16),
  ('hoverdash-addicted',         'hoverdash', 'Addicted',          'Play 500 games',                      '🎮', 'silver', 17),
  ('hoverdash-one_k_runner',     'hoverdash', '1K Runner',         'Reach 2,000 meters',                  '🚀', 'silver', 18),
  ('hoverdash-treasure_hunter',  'hoverdash', 'Treasure Hunter',   'Collect 1,000 coins in one game',     '💰', 'silver', 19),
  ('hoverdash-coin_hoarder',     'hoverdash', 'Coin Hoarder',      'Collect 25,000 coins total',          '🏦', 'silver', 20),
  ('hoverdash-near_miss_king',   'hoverdash', 'Near Miss King',    '20 near misses in one game',          '😎', 'silver', 21),
  ('hoverdash-spin_doctor',      'hoverdash', 'Spin Doctor',       '30 barrel rolls in one game',         '🌀', 'silver', 22),
  ('hoverdash-speed_demon',      'hoverdash', 'Speed Demon',       'Reach max speed',                     '🏎️', 'silver', 23),
  ('hoverdash-bulldozer',        'hoverdash', 'Bulldozer',         'Smash 15 obstacles with Boost',       '🚜', 'silver', 24),
  ('hoverdash-laser_dancer',     'hoverdash', 'Laser Dancer',      'Dodge 10 sweep lasers in one game',   '💃', 'silver', 25),
  -- HoverDash: Gold (5)
  ('hoverdash-untouchable',      'hoverdash', 'Untouchable',       'Reach 1,000m without a shield hit',   '👻', 'gold', 26),
  ('hoverdash-five_k_legend',    'hoverdash', '5K Legend',         'Reach 5,000 meters',                  '🏆', 'gold', 27),
  ('hoverdash-combo_demon',      'hoverdash', 'Combo Demon',       'Reach x10 combo',                     '🔗', 'gold', 28),
  ('hoverdash-wave_10',          'hoverdash', 'Wave 10',           'Clear Wave 12',                       '⚡', 'gold', 29),
  ('hoverdash-score_crusher',    'hoverdash', 'Score Crusher',     'Reach 25,000 total score',            '💯', 'gold', 30),
  -- HoverDash: Platinum (1)
  ('hoverdash-hover_master',     'hoverdash', 'Hover Master',      'Unlock all 30 other trophies',        '👑', 'platinum', 31),

  -- Breakout: Bronze (15)
  ('breakout-first_blood',       'breakout', 'First Blood',        'Destroy your first brick',            '🧱', 'bronze', 1),
  ('breakout-level_1',           'breakout', 'Level 1 Clear',      'Clear level 1',                       '⭐', 'bronze', 2),
  ('breakout-power_player',      'breakout', 'Power Player',       'Collect a power-up',                  '⚡', 'bronze', 3),
  ('breakout-wide_angle',        'breakout', 'Wide Angle',         'Use wide paddle',                     '🟢', 'bronze', 4),
  ('breakout-trigger_happy',     'breakout', 'Trigger Happy',      'Use laser cannons',                   '🔫', 'bronze', 5),
  ('breakout-safety_first',      'breakout', 'Safety First',       'Use floor shield',                    '🛡️', 'bronze', 6),
  ('breakout-ball_frenzy',       'breakout', 'Ball Frenzy',        'Get multiball',                       '🎱', 'bronze', 7),
  ('breakout-extra_life',        'breakout', 'Extra Life',         'Collect a 1-UP',                      '❤️', 'bronze', 8),
  ('breakout-score_5k',          'breakout', 'Score 5K',           'Reach 5,000 points',                  '💰', 'bronze', 9),
  ('breakout-score_10k',         'breakout', 'Score 10K',          'Reach 10,000 points',                 '💰', 'bronze', 10),
  ('breakout-brick_layer',       'breakout', 'Brick Layer',        'Destroy 100 bricks total',            '🧱', 'bronze', 11),
  ('breakout-level_3',           'breakout', 'Level 3',            'Reach level 3',                       '🏁', 'bronze', 12),
  ('breakout-combo_5',           'breakout', 'Combo x5',           'Get a 5-brick combo',                 '🔥', 'bronze', 13),
  ('breakout-neon_novice',       'breakout', 'Neon Novice',        'Play 5 games',                        '🎮', 'bronze', 14),
  ('breakout-quick_clear',       'breakout', 'Quick Clear',        'Clear a level in under 45s',          '⏱️', 'bronze', 15),
  -- Breakout: Silver (10)
  ('breakout-halfway',           'breakout', 'Halfway',            'Reach level 5',                       '🌟', 'silver', 16),
  ('breakout-score_25k',         'breakout', 'Score 25K',          'Reach 25,000 points',                 '💰', 'silver', 17),
  ('breakout-brick_master',      'breakout', 'Brick Master',       'Destroy 500 bricks total',            '🧱', 'silver', 18),
  ('breakout-flawless',          'breakout', 'Flawless',           'Clear a level with no deaths',        '💎', 'silver', 19),
  ('breakout-laser_show',        'breakout', 'Laser Show',         'Destroy 10 bricks with laser',        '🔴', 'silver', 20),
  ('breakout-triple_threat',     'breakout', 'Triple Threat',      'Have 3 balls active at once',         '🎯', 'silver', 21),
  ('breakout-survivor',          'breakout', 'Survivor',           'Clear 3 levels without dying',        '🛡️', 'silver', 22),
  ('breakout-combo_10',          'breakout', 'Combo x10',          'Get a 10-brick combo',                '🔥', 'silver', 23),
  ('breakout-power_hoarder',     'breakout', 'Power Hoarder',      'Collect 10 power-ups in one game',    '⚡', 'silver', 24),
  ('breakout-marathon',          'breakout', 'Marathon',            'Play 20 games',                       '🏃', 'silver', 25),
  -- Breakout: Gold (5)
  ('breakout-level_10',          'breakout', 'Level 10',            'Reach level 10',                      '🏆', 'gold', 26),
  ('breakout-score_50k',         'breakout', 'Score 50K',           'Reach 50,000 points',                 '💰', 'gold', 27),
  ('breakout-brick_legend',      'breakout', 'Brick Legend',        'Destroy 1,000 bricks total',          '🧱', 'gold', 28),
  ('breakout-untouchable',       'breakout', 'Untouchable',         'Clear 5 levels without dying',        '👻', 'gold', 29),
  ('breakout-neon_god',          'breakout', 'Neon God',            'Beat level 10 "NEON GOD"',            '🔱', 'gold', 30),
  -- Breakout: Platinum (1)
  ('breakout-neon_master',       'breakout', 'Neon Master',         'Unlock all 30 other achievements',    '👑', 'platinum', 31),

  -- Connect 4: Bronze (15)
  ('connect4-first_win',         'connect4', 'First Victory',       'Win your first game',                 '🌟', 'bronze', 1),
  ('connect4-first_game',        'connect4', 'First Move',          'Play your first game',                '🎲', 'bronze', 2),
  ('connect4-win_5',             'connect4', 'On a Roll',           'Win 5 games',                         '🔥', 'bronze', 3),
  ('connect4-play_10',           'connect4', 'Dedicated',           'Play 10 games',                       '🎮', 'bronze', 4),
  ('connect4-beat_lv1',          'connect4', 'Beginner Beaten',     'Beat level 1',                        '🟢', 'bronze', 5),
  ('connect4-beat_lv2',          'connect4', 'Casual Crushed',      'Beat level 2',                        '🔵', 'bronze', 6),
  ('connect4-beat_lv3',          'connect4', 'Challenger',          'Beat level 3',                        '🟡', 'bronze', 7),
  ('connect4-quick_win',         'connect4', 'Speed Demon',         'Win in 7 moves or less',              '⚡', 'bronze', 8),
  ('connect4-streak_3',          'connect4', 'Hot Streak',          'Win 3 games in a row',                '📈', 'bronze', 9),
  ('connect4-lv1_wins_5',        'connect4', 'Beginner Pro',        'Win 5 games on level 1',              '💚', 'bronze', 10),
  ('connect4-lv2_wins_5',        'connect4', 'Casual Pro',          'Win 5 games on level 2',              '💙', 'bronze', 11),
  ('connect4-play_25',           'connect4', 'Regular',             'Play 25 games',                       '🕹️', 'bronze', 12),
  ('connect4-center_king',       'connect4', 'Center King',         'Win 3 games',                         '🎯', 'bronze', 13),
  ('connect4-lv3_wins_3',        'connect4', 'Puzzle Solver',       'Win 3 games on level 3',              '🧩', 'bronze', 14),
  ('connect4-win_10',            'connect4', 'Veteran',             'Win 10 games',                        '⭐', 'bronze', 15),
  -- Connect 4: Silver (10)
  ('connect4-beat_lv4',          'connect4', 'Tactician',           'Beat level 4',                        '🟠', 'silver', 16),
  ('connect4-win_25',            'connect4', 'Master',              'Win 25 games',                        '👑', 'silver', 17),
  ('connect4-play_50',           'connect4', 'Enthusiast',          'Play 50 games',                       '🎯', 'silver', 18),
  ('connect4-streak_5',          'connect4', 'On Fire',             'Win 5 games in a row',                '🔥', 'silver', 19),
  ('connect4-perfect_lv1',       'connect4', 'Perfect Beginner',    'Win 10 games on level 1',             '💚', 'silver', 20),
  ('connect4-lv4_wins_3',        'connect4', 'Thinker',             'Win 3 games on level 4',              '🧠', 'silver', 21),
  ('connect4-play_100',          'connect4', 'Centurion',           'Play 100 games',                      '💯', 'silver', 22),
  ('connect4-all_levels',        'connect4', 'Completionist',       'Beat all 5 levels',                   '🌈', 'silver', 23),
  ('connect4-lv2_wins_10',       'connect4', 'Casual Master',       'Win 10 games on level 2',             '🔵', 'silver', 24),
  ('connect4-quick_win_6',       'connect4', 'Lightning Fast',      'Win in 6 moves or less',              '⏱️', 'silver', 25),
  -- Connect 4: Gold (5)
  ('connect4-beat_lv5',          'connect4', 'AI Slayer',           'Beat level 5 — Expert',               '🔴', 'gold', 26),
  ('connect4-win_50',            'connect4', 'Legend',              'Win 50 games',                        '🏆', 'gold', 27),
  ('connect4-perfect_lv5',       'connect4', 'Ultimate Master',     'Win 5 games on level 5',              '💎', 'gold', 28),
  ('connect4-streak_10',         'connect4', 'Unstoppable',         'Win 10 games in a row',               '🌋', 'gold', 29),
  ('connect4-lv5_wins_10',       'connect4', 'Machine Breaker',     'Win 10 games on level 5',             '🧬', 'gold', 30),
  -- Connect 4: Platinum (1)
  ('connect4-four_master',       'connect4', 'Four Master',         'Unlock all 30 other trophies',        '👑', 'platinum', 31),

  -- BlockStorm: Bronze (15)
  ('blockstorm-first_piece',     'blockstorm', 'First Piece',     'Place your first piece',              '🧩', 'bronze', 1),
  ('blockstorm-first_clear',     'blockstorm', 'First Clear',     'Clear your first line',               '✨', 'bronze', 2),
  ('blockstorm-play_5',          'blockstorm', 'Getting Started', 'Play 5 games',                        '🎮', 'bronze', 3),
  ('blockstorm-score_1k',        'blockstorm', 'Score 1K',        'Reach 1,000 points',                  '💰', 'bronze', 4),
  ('blockstorm-double_up',       'blockstorm', 'Double Up',       'Clear a double',                      '2️⃣', 'bronze', 5),
  ('blockstorm-triple_threat',   'blockstorm', 'Triple Threat',   'Clear a triple',                      '3️⃣', 'bronze', 6),
  ('blockstorm-level_3',         'blockstorm', 'Level 3',         'Reach level 3',                       '⭐', 'bronze', 7),
  ('blockstorm-combo_3',         'blockstorm', 'Combo x3',        'Get a 3-hit combo',                   '🔥', 'bronze', 8),
  ('blockstorm-sprint_finish',   'blockstorm', 'Sprint Finish',   'Complete a Sprint game',              '🏁', 'bronze', 9),
  ('blockstorm-hard_dropper',    'blockstorm', 'Hard Dropper',    '50 hard drops total',                 '⬇️', 'bronze', 10),
  ('blockstorm-lines_50',        'blockstorm', '50 Lines',        'Clear 50 lines total',                '📊', 'bronze', 11),
  ('blockstorm-score_5k',        'blockstorm', 'Score 5K',        'Reach 5,000 points',                  '💰', 'bronze', 12),
  ('blockstorm-pieces_100',      'blockstorm', 'Century',         'Place 100 pieces total',              '🧱', 'bronze', 13),
  ('blockstorm-t_spin_novice',   'blockstorm', 'T-Spin Novice',   'Perform your first T-spin',           '🌀', 'bronze', 14),
  ('blockstorm-play_10',         'blockstorm', 'Regular',         'Play 10 games',                       '🕹️', 'bronze', 15),
  -- BlockStorm: Silver (10)
  ('blockstorm-tetris_first',    'blockstorm', 'TETRIS!',         'Clear 4 lines at once',               '4️⃣', 'silver', 16),
  ('blockstorm-score_25k',       'blockstorm', 'Score 25K',       'Reach 25,000 points',                 '💰', 'silver', 17),
  ('blockstorm-level_5',         'blockstorm', 'Level 5',         'Reach level 5',                       '🌟', 'silver', 18),
  ('blockstorm-combo_5',         'blockstorm', 'Combo x5',        'Get a 5-hit combo',                   '🔥', 'silver', 19),
  ('blockstorm-play_25',         'blockstorm', 'Dedicated',       'Play 25 games',                       '🎮', 'silver', 20),
  ('blockstorm-lines_200',       'blockstorm', '200 Lines',       'Clear 200 lines total',               '📊', 'silver', 21),
  ('blockstorm-sprint_3min',     'blockstorm', 'Speed Runner',    'Complete Sprint under 3 min',         '⏱️', 'silver', 22),
  ('blockstorm-t_spin_double',   'blockstorm', 'T-Spin Double',   'Perform a T-spin double',             '🌀', 'silver', 23),
  ('blockstorm-pieces_500',      'blockstorm', 'Piece Master',    'Place 500 pieces total',              '🧱', 'silver', 24),
  ('blockstorm-marathon_10',     'blockstorm', 'Marathon 10',     'Reach level 10 in Marathon',          '🏆', 'silver', 25),
  -- BlockStorm: Gold (5)
  ('blockstorm-score_50k',       'blockstorm', 'Score 50K',       'Reach 50,000 points',                 '💎', 'gold', 26),
  ('blockstorm-tetris_3',        'blockstorm', 'Tetris Machine',  'Get 3 Tetrises in one game',          '🔱', 'gold', 27),
  ('blockstorm-combo_8',         'blockstorm', 'Combo King',      'Get an 8-hit combo',                  '🔥', 'gold', 28),
  ('blockstorm-sprint_2min',     'blockstorm', 'Sprint Legend',   'Complete Sprint under 2 min',         '⚡', 'gold', 29),
  ('blockstorm-t_spin_triple',   'blockstorm', 'T-Spin Master',   'Perform a T-spin triple',             '🌀', 'gold', 30),
  -- BlockStorm: Platinum (1)
  ('blockstorm-block_master',    'blockstorm', 'Block Master',    'Unlock all 30 other trophies',        '👑', 'platinum', 31),
  -- Gravity Well: Bronze (15)
  ('gravitywell-first_void',     'gravitywell', 'First Void',      'Play your first game',                '🕳️', 'bronze', 1),
  ('gravitywell-hungry',         'gravitywell', 'Hungry',          'Absorb 10 particles in one game',     '😋', 'bronze', 2),
  ('gravitywell-mass_up',        'gravitywell', 'Mass Up',         'Reach 1,000 mass',                    '⚫', 'bronze', 3),
  ('gravitywell-score_500',      'gravitywell', 'Star Dust',       'Score 500 points',                    '✨', 'bronze', 4),
  ('gravitywell-dark_energy',    'gravitywell', 'Dark Energy',     'Reach Wave 2',                        '🌀', 'bronze', 5),
  ('gravitywell-golden_touch',   'gravitywell', 'Golden Touch',    'Absorb a golden orb',                 '⭐', 'bronze', 6),
  ('gravitywell-nova_catch',     'gravitywell', 'Nova Catch',      'Absorb a supernova',                  '💫', 'bronze', 7),
  ('gravitywell-tough_void',     'gravitywell', 'Tough Void',      'Survive a hit',                       '💪', 'bronze', 8),
  ('gravitywell-regular',        'gravitywell', 'Regular',         'Play 10 games',                       '🔄', 'bronze', 9),
  ('gravitywell-glutton',        'gravitywell', 'Glutton',         'Absorb 50 particles in one game',     '🌑', 'bronze', 10),
  ('gravitywell-score_2k',       'gravitywell', 'Cosmic Dust',     'Score 2,000 points',                  '🌌', 'bronze', 11),
  ('gravitywell-neutron',        'gravitywell', 'Neutron Burst',   'Reach Wave 3',                        '⚡', 'bronze', 12),
  ('gravitywell-gold_rush',      'gravitywell', 'Gold Rush',       'Absorb 5 golden orbs in one game',    '🏆', 'bronze', 13),
  ('gravitywell-heavy',          'gravitywell', 'Heavy',           'Reach 2,000 mass',                    '🪨', 'bronze', 14),
  ('gravitywell-dedicated',      'gravitywell', 'Dedicated',       'Play 25 games',                       '🎯', 'bronze', 15),
  -- Gravity Well: Silver (10)
  ('gravitywell-maelstrom',      'gravitywell', 'Maelstrom',       'Reach Wave 4',                        '🌪️', 'silver', 16),
  ('gravitywell-score_5k',       'gravitywell', 'Star Collector',  'Score 5,000 points',                  '🌟', 'silver', 17),
  ('gravitywell-absorb_100',     'gravitywell', 'Mass Eater',      'Absorb 100 particles in one game',    '🕳️', 'silver', 18),
  ('gravitywell-veteran',        'gravitywell', 'Veteran',         'Play 50 games',                       '🎖️', 'silver', 19),
  ('gravitywell-score_10k',      'gravitywell', 'Nebula',          'Score 10,000 points',                 '🌈', 'silver', 20),
  ('gravitywell-nova_3',         'gravitywell', 'Nova Hunter',     'Absorb 3 supernovas in one game',     '💥', 'silver', 21),
  ('gravitywell-max_mass',       'gravitywell', 'Critical Mass',   'Reach maximum mass (4,500)',           '🔮', 'silver', 22),
  ('gravitywell-horizon',        'gravitywell', 'Event Horizon',   'Reach Wave 5',                        '🌊', 'silver', 23),
  ('gravitywell-addict',         'gravitywell', 'Addicted',        'Play 100 games',                      '🎮', 'silver', 24),
  ('gravitywell-score_15k',      'gravitywell', 'Galaxy',          'Score 15,000 points',                 '🌠', 'silver', 25),
  -- Gravity Well: Gold (5)
  ('gravitywell-score_25k',      'gravitywell', 'Quasar',          'Score 25,000 points',                 '☀️', 'gold', 26),
  ('gravitywell-absorb_200',     'gravitywell', 'Devourer',        'Absorb 200 particles in one game',    '👾', 'gold', 27),
  ('gravitywell-score_50k',      'gravitywell', 'Supermassive',    'Score 40,000 points',                 '🏅', 'gold', 28),
  ('gravitywell-obsessed',       'gravitywell', 'Obsessed',        'Play 150 games',                      '💎', 'gold', 29),
  ('gravitywell-perfect_waves',  'gravitywell', 'Untouched',       'Reach Wave 3 without taking damage',  '👻', 'gold', 30),
  -- Gravity Well: Platinum (1)
  ('gravitywell-gravity_master', 'gravitywell', 'Gravity Master',  'Unlock all 30 other trophies',        '👑', 'platinum', 31),

  -- Sudoku: Bronze (15)
  ('sudoku-first_win',        'sudoku', 'First Win',        'Complete your first puzzle',              '🌟', 'bronze', 1),
  ('sudoku-easy_5',           'sudoku', 'Easy Does It',     'Complete 5 Easy puzzles',                '🔢', 'bronze', 2),
  ('sudoku-medium_first',     'sudoku', 'Stepping Up',      'Complete a Medium puzzle',               '📈', 'bronze', 3),
  ('sudoku-hard_first',       'sudoku', 'Brave Soul',       'Complete a Hard puzzle',                 '💪', 'bronze', 4),
  ('sudoku-no_notes',         'sudoku', 'Pure Logic',       'Win without using pencil notes',         '🧠', 'bronze', 5),
  ('sudoku-speed_10',         'sudoku', 'Under 10',         'Complete Easy in under 10 minutes',      '⏱️', 'bronze', 6),
  ('sudoku-play_10',          'sudoku', 'Regular',          'Complete 10 puzzles',                    '🎮', 'bronze', 7),
  ('sudoku-flawless_easy',    'sudoku', 'Flawless Easy',    'Complete Easy with zero mistakes',       '💎', 'bronze', 8),
  ('sudoku-streak_3',         'sudoku', 'Hat Trick',        'Win 3 games in a row',                   '🎩', 'bronze', 9),
  ('sudoku-one_mistake',      'sudoku', 'Close Call',       'Win with exactly 1 mistake',             '😅', 'bronze', 10),
  ('sudoku-all_difficulties', 'sudoku', 'All Rounder',      'Complete each difficulty at least once',  '🎯', 'bronze', 11),
  ('sudoku-easy_15',          'sudoku', 'Easy Street',      'Complete 15 Easy puzzles',               '🛤️', 'bronze', 12),
  ('sudoku-note_taker',       'sudoku', 'Note Taker',       'Use pencil notes in 10 games',           '✏️', 'bronze', 13),
  ('sudoku-speed_5_easy',     'sudoku', 'Speed Demon',      'Complete Easy in under 5 minutes',       '⚡', 'bronze', 14),
  ('sudoku-total_25',         'sudoku', 'Puzzle Fan',       'Complete 25 puzzles',                    '🧩', 'bronze', 15),
  -- Sudoku: Silver (10)
  ('sudoku-medium_10',        'sudoku', 'Medium Master',    'Complete 10 Medium puzzles',             '🏅', 'silver', 16),
  ('sudoku-hard_5',           'sudoku', 'Hard Hitter',      'Complete 5 Hard puzzles',                '🔥', 'silver', 17),
  ('sudoku-flawless_medium',  'sudoku', 'Flawless Medium',  'Complete Medium with zero mistakes',     '💎', 'silver', 18),
  ('sudoku-total_50',         'sudoku', 'Dedicated',        'Complete 50 puzzles',                    '⭐', 'silver', 19),
  ('sudoku-speed_15_med',     'sudoku', 'Quick Thinker',    'Complete Medium under 15 minutes',       '🚀', 'silver', 20),
  ('sudoku-speed_30_hard',    'sudoku', 'Hard & Fast',      'Complete Hard under 30 minutes',         '💨', 'silver', 21),
  ('sudoku-streak_5',         'sudoku', 'On Fire',          'Win 5 games in a row',                   '🔥', 'silver', 22),
  ('sudoku-total_100',        'sudoku', 'Century',          'Complete 100 puzzles',                   '💯', 'silver', 23),
  ('sudoku-hard_10',          'sudoku', 'Hardened',         'Complete 10 Hard puzzles',               '🗿', 'silver', 24),
  ('sudoku-no_notes_medium',  'sudoku', 'Pure Medium',      'Win Medium without pencil notes',        '🧠', 'silver', 25),
  -- Sudoku: Gold (5)
  ('sudoku-flawless_hard',    'sudoku', 'Flawless Hard',    'Complete Hard with zero mistakes',       '👑', 'gold', 26),
  ('sudoku-speed_10_hard',    'sudoku', 'Hard Sprint',      'Complete Hard under 10 minutes',         '⚡', 'gold', 27),
  ('sudoku-total_200',        'sudoku', 'Puzzle Addict',    'Complete 200 puzzles',                   '🏆', 'gold', 28),
  ('sudoku-streak_10',        'sudoku', 'Unstoppable',      'Win 10 games in a row',                  '🌟', 'gold', 29),
  ('sudoku-speed_3_easy',     'sudoku', 'Lightning',        'Complete Easy under 3 minutes',          '⚡', 'gold', 30),
  -- Sudoku: Platinum (1)
  ('sudoku-sudoku_master',    'sudoku', 'Sudoku Master',    'Unlock all 30 other trophies',           '👑', 'platinum', 31),

  -- Axeluga: Bronze (15)
  ('axeluga-first-blood',        'axeluga', 'First Blood',         'Defeat your first enemy',                 '💥', 'bronze', 1),
  ('axeluga-deep-space-clear',   'axeluga', 'Deep Space Explorer', 'Clear World 1',                           '🌌', 'bronze', 2),
  ('axeluga-station-clear',      'axeluga', 'Station Breacher',    'Clear World 2',                           '🛸', 'bronze', 3),
  ('axeluga-core-clear',         'axeluga', 'Core Runner',         'Clear World 3',                           '⚡', 'bronze', 4),
  ('axeluga-atmosphere-clear',   'axeluga', 'Sky Piercer',         'Clear World 4',                           '☁️', 'bronze', 5),
  ('axeluga-city-clear',         'axeluga', 'City Liberator',      'Clear World 5',                           '🏙️', 'bronze', 6),
  ('axeluga-score-50k',          'axeluga', 'Getting Started',     'Reach 50,000 points',                     '⭐', 'bronze', 7),
  ('axeluga-score-100k',         'axeluga', 'Six Figures',         'Reach 100,000 points',                    '🔥', 'bronze', 8),
  ('axeluga-combo-5',            'axeluga', 'Combo Starter',       'Achieve a 5x combo',                      '🔗', 'bronze', 9),
  ('axeluga-first-bomb',         'axeluga', 'Bomb Away!',          'Use your first bomb',                     '💣', 'bronze', 10),
  ('axeluga-first-boss',         'axeluga', 'Boss Encounter',      'Defeat your first boss',                  '👾', 'bronze', 11),
  ('axeluga-power-up-collect',   'axeluga', 'Armed Up',            'Collect 10 power-ups in one run',         '🎁', 'bronze', 12),
  ('axeluga-weapon-max',         'axeluga', 'Fully Loaded',        'Reach weapon level 5',                    '🔫', 'bronze', 13),
  ('axeluga-shield-save',        'axeluga', 'Shield Hero',         'Absorb a hit with shield',                '🛡️', 'bronze', 14),
  ('axeluga-asteroid-hunter',    'axeluga', 'Space Debris',        'Destroy 20 asteroids in one run',         '☄️', 'bronze', 15),
  -- Axeluga: Silver (10)
  ('axeluga-galaxy-savior',      'axeluga', 'Galaxy Savior',       'Clear all 5 worlds',                      '🌟', 'silver', 16),
  ('axeluga-score-250k',         'axeluga', 'Quarter Million',     'Reach 250,000 points',                    '💎', 'silver', 17),
  ('axeluga-combo-master',       'axeluga', 'Combo Master',        'Achieve a 10x combo',                     '⚡', 'silver', 18),
  ('axeluga-medium-clear',       'axeluga', 'Trained Pilot',       'Clear all worlds on Medium',              '🎖️', 'silver', 19),
  ('axeluga-mine-sweeper',       'axeluga', 'Mine Sweeper',        'Destroy 15 mines in one run',             '💀', 'silver', 20),
  ('axeluga-bomb-efficiency',    'axeluga', 'Carpet Bomber',       'Kill 5+ enemies with one bomb',           '🎯', 'silver', 21),
  ('axeluga-no-death-world',     'axeluga', 'Untouchable I',       'Clear a world without taking damage',     '✨', 'silver', 22),
  ('axeluga-boss-no-hit',        'axeluga', 'Dodge Master',        'Defeat a boss without taking damage',     '🎪', 'silver', 23),
  ('axeluga-score-500k',         'axeluga', 'Half Million Club',   'Reach 500,000 points',                    '💰', 'silver', 24),
  ('axeluga-speed-max',          'axeluga', 'Lightspeed',          'Reach max speed level',                   '🚀', 'silver', 25),
  -- Axeluga: Gold (5)
  ('axeluga-hard-clear',         'axeluga', 'Ace Pilot',           'Clear all worlds on Hard',                '🏆', 'gold', 26),
  ('axeluga-score-1m',           'axeluga', 'Millionaire',         'Reach 1,000,000 points',                  '👑', 'gold', 27),
  ('axeluga-no-death-run',       'axeluga', 'Untouchable II',      'Clear all worlds without losing HP',      '💫', 'gold', 28),
  ('axeluga-hard-no-death-world','axeluga', 'Iron Will',           'Clear a world on Hard without damage',    '🔱', 'gold', 29),
  ('axeluga-boss-rage-survivor', 'axeluga', 'Rage Tamer',          'Beat all 5 bosses in rage without damage','🐉', 'gold', 30),
  -- Axeluga: Platinum (1)
  ('axeluga-platinum',           'axeluga', 'Axeluga Platinum',    'Unlock all 30 other trophies',            '⚜️', 'platinum', 31),

  -- Manga Match: Bronze (15)
  ('manga-match-first_match',    'manga-match3', 'First Bloom',       'Complete your first match',               '🌸', 'bronze', 1),
  ('manga-match-stage_1',        'manga-match3', 'Academy Student',   'Clear Stage 1',                           '🏫', 'bronze', 2),
  ('manga-match-stage_5',        'manga-match3', 'Rising Star',       'Clear Stage 5',                           '⭐', 'bronze', 3),
  ('manga-match-stage_10',       'manga-match3', 'Portal Opener',     'Clear World 1 (Stage 10)',                '🌙', 'bronze', 4),
  ('manga-match-first_special',  'manga-match3', 'Special Discovery', 'Create your first special tile',          '💎', 'bronze', 5),
  ('manga-match-first_line',     'manga-match3', 'Line Blast',        'Create a line attack tile',               '⚡', 'bronze', 6),
  ('manga-match-first_bomb',     'manga-match3', 'Bomber',            'Create a bomb tile',                      '💥', 'bronze', 7),
  ('manga-match-first_color',    'manga-match3', 'Color Burst',       'Create a color bomb',                     '🌈', 'bronze', 8),
  ('manga-match-chain_2',        'manga-match3', 'Chain Starter',     'Achieve a 2-chain combo',                 '🔗', 'bronze', 9),
  ('manga-match-fever_first',    'manga-match3', 'First Fever',       'Activate Fever Mode for the first time',  '🔥', 'bronze', 10),
  ('manga-match-score_5k',       'manga-match3', 'Point Collector',   'Score 5,000 points in a single stage',    '📊', 'bronze', 11),
  ('manga-match-clear_50',       'manga-match3', 'Tile Sweeper',      'Clear 50 tiles in a single stage',        '🧹', 'bronze', 12),
  ('manga-match-stars_10',       'manga-match3', 'Star Gazer',        'Earn 10 stars total',                     '✨', 'bronze', 13),
  ('manga-match-daily_first',    'manga-match3', 'Daily Player',      'Complete your first daily challenge',      '📅', 'bronze', 14),
  ('manga-match-coins_500',      'manga-match3', 'Coin Collector',    'Accumulate 500 coins',                    '🪙', 'bronze', 15),
  -- Manga Match: Silver (10)
  ('manga-match-stage_20',       'manga-match3', 'Portal Guardian',   'Clear World 2 (Stage 20)',                '🏯', 'silver', 16),
  ('manga-match-chain_4',        'manga-match3', 'Chain Master',      'Achieve a 4-chain combo',                 '⛓️', 'silver', 17),
  ('manga-match-score_10k',      'manga-match3', 'High Scorer',       'Score 10,000 points in a single stage',   '🏆', 'silver', 18),
  ('manga-match-three_stars',    'manga-match3', 'Perfectionist',     'Get 3 stars on any stage',                '🌟', 'silver', 19),
  ('manga-match-stars_30',       'manga-match3', 'Star Hunter',       'Earn 30 stars total',                     '💫', 'silver', 20),
  ('manga-match-ink_clear_20',   'manga-match3', 'Ink Eraser',        'Clear 20 ink obstacles total',            '🖋️', 'silver', 21),
  ('manga-match-locks_break_15', 'manga-match3', 'Locksmith',         'Break 15 locks total',                    '🔓', 'silver', 22),
  ('manga-match-fever_5',        'manga-match3', 'Fever Addict',      'Activate Fever Mode 5 times',             '🔥', 'silver', 23),
  ('manga-match-daily_streak_3', 'manga-match3', 'Dedicated',         'Reach a 3-day daily challenge streak',    '📆', 'silver', 24),
  ('manga-match-powerup_use_5',  'manga-match3', 'Power User',        'Use 5 power-ups total',                   '⚗️', 'silver', 25),
  -- Manga Match: Gold (5)
  ('manga-match-stage_30',       'manga-match3', 'Final Panel',       'Clear all 30 stages',                     '👑', 'gold', 26),
  ('manga-match-chain_6',        'manga-match3', 'Chain Demon',       'Achieve a 6-chain combo',                 '💀', 'gold', 27),
  ('manga-match-score_20k',      'manga-match3', 'Score Legend',      'Score 20,000 points in a single stage',   '🎌', 'gold', 28),
  ('manga-match-stars_90',       'manga-match3', 'Star Master',       'Earn 90 stars (all stages 3-star)',       '🌠', 'gold', 29),
  ('manga-match-daily_streak_7', 'manga-match3', 'Weekly Warrior',    'Reach a 7-day daily challenge streak',    '🗓️', 'gold', 30),
  -- Manga Match: Platinum (1)
  ('manga-match-manga_master',   'manga-match3', 'Manga Master',      'Unlock all other trophies',               '🏅', 'platinum', 31)
ON CONFLICT (id) DO NOTHING;
