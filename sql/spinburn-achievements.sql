-- ============================================================
-- Spinburn: game row + 31 achievement definitions (English)
-- 15 bronze, 10 silver, 5 gold, 1 platinum (unlocks with all others).
-- Run in Supabase SQL Editor.
-- IDs match GameVolt.achievements.unlock(trophyId) -> 'spinburn-<id>'.
-- Idempotent: safe to re-run.
-- ============================================================

-- Game row (required — scores/achievements FK to games.id)
INSERT INTO games (id, title, thumbnail_url) VALUES
  ('spinburn', 'Spinburn', '/spinburn/og-image.png')
ON CONFLICT (id) DO NOTHING;

-- Achievement definitions
DELETE FROM achievement_defs WHERE game_id = 'spinburn';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  -- Bronze (15)
  ('spinburn-first_serve',   'spinburn', 'First Serve',     'Play your first point',                        '🏓', 'bronze', 1),
  ('spinburn-first_win',     'spinburn', 'Table Manners',   'Win your first match',                         '🏅', 'bronze', 2),
  ('spinburn-first_ace',     'spinburn', 'Untouchable',     'Serve your first ace',                         '🎯', 'bronze', 3),
  ('spinburn-rally_8',       'spinburn', 'Keep It Alive',   'Win a rally of 8 shots or more',               '🔁', 'bronze', 4),
  ('spinburn-enter_arena',   'spinburn', 'Enter the Arena', 'Start a campaign match',                       '🏟️', 'bronze', 5),
  ('spinburn-beat_q',        'spinburn', 'Quarterfinalist', 'Knock out Hans in the quarterfinal',           '🥉', 'bronze', 6),
  ('spinburn-first_online',  'spinburn', 'Say Hello',       'Start an online match',                        '🌐', 'bronze', 7),
  ('spinburn-as_kid',        'spinburn', 'Represent',       'Play a match as THE KID',                      '🧒', 'bronze', 8),
  ('spinburn-win_easy',      'spinburn', 'Warm-Up',         'Win a match on Easy',                          '🟢', 'bronze', 9),
  ('spinburn-lead_5',        'spinburn', 'In Control',      'Lead a game by 5 points',                      '📈', 'bronze', 10),
  ('spinburn-deuce_win',     'spinburn', 'Down to the Wire','Win a match that went to deuce (10–10)',       '😮‍💨', 'bronze', 11),
  ('spinburn-points_50',     'spinburn', 'Point Machine',   'Win 50 points all-time',                       '💯', 'bronze', 12),
  ('spinburn-matches_5',     'spinburn', 'Regular',         'Play 5 matches',                               '🌙', 'bronze', 13),
  ('spinburn-comeback_3',    'spinburn', 'Not Done Yet',    'Win a match after trailing by 3',              '🔄', 'bronze', 14),
  ('spinburn-online_win',    'spinburn', 'Online Winner',   'Win an online match',                          '🤝', 'bronze', 15),
  -- Silver (10)
  ('spinburn-beat_s',        'spinburn', 'Semifinalist',    'Knock out General Hummel in the semifinal',    '🥈', 'silver', 16),
  ('spinburn-win_medium',    'spinburn', 'Holding Serve',   'Win a match on Medium',                        '🟡', 'silver', 17),
  ('spinburn-rally_18',      'spinburn', 'Marathon Rally',  'Win a rally of 18 shots or more',              '🏃', 'silver', 18),
  ('spinburn-love_game',     'spinburn', 'Love Game',       'Win a match 11–0',                             '🧹', 'silver', 19),
  ('spinburn-aces_5',        'spinburn', 'Serving Notice',  'Serve 5 aces in a single match',               '🎯', 'silver', 20),
  ('spinburn-comeback_5',    'spinburn', 'The Comeback',    'Win a match after trailing by 5',              '💪', 'silver', 21),
  ('spinburn-streak_3',      'spinburn', 'On a Roll',       'Win 3 matches in a row',                       '🔥', 'silver', 22),
  ('spinburn-online_3',      'spinburn', 'Rival',           'Win 3 online matches',                         '⚔️', 'silver', 23),
  ('spinburn-points_500',    'spinburn', 'Grinder',         'Win 500 points all-time',                      '📊', 'silver', 24),
  ('spinburn-matches_25',    'spinburn', 'Veteran',         'Play 25 matches',                              '🎪', 'silver', 25),
  -- Gold (5)
  ('spinburn-champion',      'spinburn', 'Champion',        'Win the campaign — beat Chong Li in the final','🏆', 'gold', 26),
  ('spinburn-win_hard',      'spinburn', 'No Mercy',        'Win a match on Hard',                          '🔴', 'gold', 27),
  ('spinburn-hard_love',     'spinburn', 'Perfect Game',    'Win a match 11–0 on Hard',                     '⛔', 'gold', 28),
  ('spinburn-aces_50',       'spinburn', 'Ace Collector',   'Serve 50 aces all-time',                       '🎯', 'gold', 29),
  ('spinburn-streak_8',      'spinburn', 'Untouchable Run', 'Win 8 matches in a row',                       '👑', 'gold', 30),
  -- Platinum (1)
  ('spinburn-master',        'spinburn', 'Spinburn Master', 'Unlock all other 30 trophies',                 '🌟', 'platinum', 31);
