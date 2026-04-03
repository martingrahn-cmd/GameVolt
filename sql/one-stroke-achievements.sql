-- ============================================================
-- One Stroke: 31 achievement definitions
-- Run in Supabase SQL Editor
-- ============================================================

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  -- Bronze (15)
  ('one-stroke-b01', 'one-stroke', 'Första steget',      'Lös 1 kampanjnivå',                          '👣', 'bronze', 1),
  ('one-stroke-b02', 'one-stroke', 'Femman',              'Lös 5 kampanjnivåer',                        '✋', 'bronze', 2),
  ('one-stroke-b03', 'one-stroke', 'Tio avklarade',       'Lös 10 kampanjnivåer',                       '🔟', 'bronze', 3),
  ('one-stroke-b04', 'one-stroke', 'Tjugo avklarade',     'Lös 20 kampanjnivåer',                       '📊', 'bronze', 4),
  ('one-stroke-b05', 'one-stroke', 'Trettio avklarade',   'Lös 30 kampanjnivåer',                       '📈', 'bronze', 5),
  ('one-stroke-b06', 'one-stroke', '10 spelade nivåer',   'Nå 10 spelade kampanjnivå-försök totalt',    '🎮', 'bronze', 6),
  ('one-stroke-b07', 'one-stroke', '25 spelade nivåer',   'Nå 25 spelade kampanjnivå-försök totalt',    '🕹️', 'bronze', 7),
  ('one-stroke-b08', 'one-stroke', 'Challenger',          'Spara din första challenge-run',              '⚡', 'bronze', 8),
  ('one-stroke-b09', 'one-stroke', 'Första full run',     'Slutför en hel challenge',                   '🏁', 'bronze', 9),
  ('one-stroke-b10', 'one-stroke', 'Poäng 3k',            'Nå minst 3 000 poäng i en challenge-run',   '💎', 'bronze', 10),
  ('one-stroke-b11', 'one-stroke', 'Poäng 5k',            'Nå minst 5 000 poäng i en challenge-run',   '💠', 'bronze', 11),
  ('one-stroke-b12', 'one-stroke', 'Hintfri run',         'Slutför en challenge-run utan hints',         '🧠', 'bronze', 12),
  ('one-stroke-b13', 'one-stroke', 'Resetfri run',        'Slutför en challenge-run utan reset',         '🔒', 'bronze', 13),
  ('one-stroke-b14', 'one-stroke', 'Kontrollerad run',    'Slutför en challenge-run med max 20 undo',   '🎯', 'bronze', 14),
  ('one-stroke-b15', 'one-stroke', '50 spelade nivåer',   'Nå 50 spelade kampanjnivå-försök totalt',   '🏋️', 'bronze', 15),

  -- Silver (10)
  ('one-stroke-s01', 'one-stroke', '50 kampanjnivåer',    'Lös 50 kampanjnivåer',                       '⭐', 'silver', 16),
  ('one-stroke-s02', 'one-stroke', '75 kampanjnivåer',    'Lös 75 kampanjnivåer',                       '🌟', 'silver', 17),
  ('one-stroke-s03', 'one-stroke', '100 kampanjnivåer',   'Lös 100 kampanjnivåer',                      '💫', 'silver', 18),
  ('one-stroke-s04', 'one-stroke', '150 kampanjnivåer',   'Lös 150 kampanjnivåer',                      '✨', 'silver', 19),
  ('one-stroke-s05', 'one-stroke', '3 fulla challenges',  'Slutför 3 hela challenge-runs',              '🏅', 'silver', 20),
  ('one-stroke-s06', 'one-stroke', '5 fulla challenges',  'Slutför 5 hela challenge-runs',              '🎖️', 'silver', 21),
  ('one-stroke-s07', 'one-stroke', 'Poäng 8k',            'Nå minst 8 000 poäng i en challenge-run',   '🔥', 'silver', 22),
  ('one-stroke-s08', 'one-stroke', 'Poäng 10k',           'Nå minst 10 000 poäng i en challenge-run',  '💰', 'silver', 23),
  ('one-stroke-s09', 'one-stroke', 'Snabb run',           'Slutför en challenge-run under 6:00',        '⏱️', 'silver', 24),
  ('one-stroke-s10', 'one-stroke', 'No safety net',       'Slutför en challenge-run utan hint och reset','🪂', 'silver', 25),

  -- Gold (5)
  ('one-stroke-g01', 'one-stroke', 'Kampanj 200',         'Lös alla 200 kampanjnivåer',                 '👑', 'gold', 26),
  ('one-stroke-g02', 'one-stroke', '10 fulla challenges', 'Slutför 10 hela challenge-runs',             '🏆', 'gold', 27),
  ('one-stroke-g03', 'one-stroke', 'Poäng 12k',           'Nå minst 12 000 poäng i en challenge-run',  '💎', 'gold', 28),
  ('one-stroke-g04', 'one-stroke', 'Elittempo',           'Slutför en challenge-run under 4:30',        '⚡', 'gold', 29),
  ('one-stroke-g05', 'one-stroke', 'Perfekt run',         'Slutför en challenge-run med 0 hint, 0 reset och 0 undo', '🌈', 'gold', 30),

  -- Platinum (1)
  ('one-stroke-p01', 'one-stroke', 'Platinum Path',       'Lås upp alla andra trophies',                '🏛️', 'platinum', 31)
ON CONFLICT (id) DO NOTHING;
