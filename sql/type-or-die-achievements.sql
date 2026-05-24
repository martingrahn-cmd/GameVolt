-- Type or Die — achievement definitions for the GameVolt cloud trophy case.
--
-- Apply in the GameVolt Supabase SQL editor (project nwkjayseuhvvpkdgpivm),
-- after sql/type-or-die.sql (which registers the game row this FKs to).
-- These are the 31 trophies from js/trophies.js. The id MUST be the
-- "<game_id>-<localId>" form the SDK writes via achievements.unlock(localId)
-- (it stores user_achievements.achievement_id = 'type-or-die-' + localId).
-- Idempotent: clears and re-inserts this game's defs.

DELETE FROM achievement_defs WHERE game_id = 'type-or-die';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  -- Bronze (15) — natural play
  ('type-or-die-first-blood',    'type-or-die', 'First Blood',       'Kill your first zombie.',             '☠️',  'bronze',  1),
  ('type-or-die-combo-10',       'type-or-die', 'On a Roll',         'Reach a 10-combo.',                   '🔥',  'bronze',  2),
  ('type-or-die-wpm-40',         'type-or-die', 'Warmed Up',         'Hit 40 WPM in a Speed Test.',         '⌨️',  'bronze',  3),
  ('type-or-die-wave-3',         'type-or-die', 'Holding the Line',  'Reach wave 3.',                       '🧟',  'bronze',  4),
  ('type-or-die-boss-slayer',    'type-or-die', 'Boss Slayer',       'Kill a boss zombie.',                 '👹',  'bronze',  5),
  ('type-or-die-nuke',           'type-or-die', 'Scorched Earth',    'Trigger a Nuke.',                     '💥',  'bronze',  6),
  ('type-or-die-slowmo',         'type-or-die', 'Bullet Time',       'Trigger Slow-mo.',                    '🐌',  'bronze',  7),
  ('type-or-die-accuracy-95',    'type-or-die', 'Steady Hands',      'Finish a run at 95%+ accuracy.',      '🎯',  'bronze',  8),
  ('type-or-die-kills-50',       'type-or-die', 'Exterminator',      'Kill 50 zombies in total.',           '🪓',  'bronze',  9),
  ('type-or-die-daily-1',        'type-or-die', 'Daily Grind',       'Play a Daily Challenge.',             '📅',  'bronze', 10),
  ('type-or-die-speedtest-done', 'type-or-die', 'Clocked In',        'Finish a Speed Test.',                '⏱️',  'bronze', 11),
  ('type-or-die-zombie-done',    'type-or-die', 'Outbreak',          'Finish a Zombie run.',                '🧟',  'bronze', 12),
  ('type-or-die-versus-played',  'type-or-die', 'Pass the Keyboard', 'Play a 2-player match.',              '👥',  'bronze', 13),
  ('type-or-die-runs-10',        'type-or-die', 'Regular',           'Play 10 runs.',                       '🎮',  'bronze', 14),
  ('type-or-die-words-500',      'type-or-die', 'Wordsmith',         'Type 500 words in total.',            '📝',  'bronze', 15),

  -- Silver (10) — needs skill
  ('type-or-die-combo-25',       'type-or-die', 'Combo Master',      'Reach a 25-combo.',                   '🔥',  'silver', 16),
  ('type-or-die-wpm-80',         'type-or-die', 'Fast Fingers',      'Hit 80 WPM in a Speed Test.',         '⌨️',  'silver', 17),
  ('type-or-die-wave-6',         'type-or-die', 'Frontline',         'Reach wave 6.',                       '🧟',  'silver', 18),
  ('type-or-die-accuracy-100',   'type-or-die', 'Flawless',          'Finish a run at 100% accuracy.',      '💯',  'silver', 19),
  ('type-or-die-boss-hunter',    'type-or-die', 'Boss Hunter',       'Kill 10 bosses in total.',            '👹',  'silver', 20),
  ('type-or-die-kills-500',      'type-or-die', 'Cleanser',          'Kill 500 zombies in total.',          '🪓',  'silver', 21),
  ('type-or-die-streak-3',       'type-or-die', 'Committed',         'Reach a 3-day Daily streak.',         '📅',  'silver', 22),
  ('type-or-die-score-5000',     'type-or-die', 'High Roller',       'Score 5,000 in a Zombie run.',        '🏆',  'silver', 23),
  ('type-or-die-nuke-master',    'type-or-die', 'Fallout',           'Trigger 10 Nukes in total.',          '💥',  'silver', 24),
  ('type-or-die-runs-50',        'type-or-die', 'Devoted',           'Play 50 runs.',                       '🎮',  'silver', 25),

  -- Gold (5) — hard
  ('type-or-die-combo-50',       'type-or-die', 'Unstoppable',       'Reach a 50-combo.',                   '🔥',  'gold',   26),
  ('type-or-die-wpm-120',        'type-or-die', 'Speed Demon',       'Hit 120 WPM in a Speed Test.',        '⌨️',  'gold',   27),
  ('type-or-die-wave-12',        'type-or-die', 'Last Survivor',     'Reach wave 12.',                      '🧟',  'gold',   28),
  ('type-or-die-streak-7',       'type-or-die', 'Obsessed',          'Reach a 7-day Daily streak.',         '📅',  'gold',   29),
  ('type-or-die-score-15000',    'type-or-die', 'Apex Predator',     'Score 15,000 in a Zombie run.',       '🏆',  'gold',   30),

  -- Platinum (1)
  ('type-or-die-platinum',       'type-or-die', 'Type or Die',       'Unlock all 30 other trophies.',       '🌟',  'platinum', 31);

-- Verify:
-- SELECT count(*) FROM achievement_defs WHERE game_id = 'type-or-die';  -- 31
