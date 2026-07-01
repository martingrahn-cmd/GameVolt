-- ============================================================
-- Snake — achievement_defs seed (31 trophies: 15 bronze / 10 silver / 5 gold / 1 platinum)
-- Nokia 3310 mode earns only 'snake-played-3310'; the rest come from Neo + Fruit Chain.
-- Safe to re-run (ON CONFLICT DO NOTHING). The 'snake' games row already exists in schema.sql.
-- ============================================================
INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  ('snake-first-game', 'snake', 'First Slither', 'Play your first game', '🐍', 'bronze', 1),
  ('snake-food-10', 'snake', 'Snack Time', 'Eat 10 food in a single game', '🍎', 'bronze', 2),
  ('snake-combo-2x', 'snake', 'Picking Up Speed', 'Reach a 2× combo (Neo)', '⚡', 'bronze', 3),
  ('snake-level-2', 'snake', 'Getting Going', 'Clear level 2 (Neo campaign)', '🚪', 'bronze', 4),
  ('snake-chain-5', 'snake', 'Nice!', 'Reach a 5-chain (Fruit Chain)', '🔗', 'bronze', 5),
  ('snake-lockin-first', 'snake', 'Locked In', 'Land your first lock-in (Fruit Chain)', '🔒', 'bronze', 6),
  ('snake-played-3310', 'snake', 'Blast from the Past', 'Play a round in Nokia 3310 mode', '📟', 'bronze', 7),
  ('snake-survive-60', 'snake', 'One Minute', 'Survive 60 seconds in a game', '⏱️', 'bronze', 8),
  ('snake-score-1000', 'snake', 'Four Figures', 'Score 1,000 in a single game', '💯', 'bronze', 9),
  ('snake-accuracy-80', 'snake', 'Sharp Eye', 'Finish a Fruit Chain run at 80%+ accuracy', '🎯', 'bronze', 10),
  ('snake-level-5', 'snake', 'Halfway There', 'Clear level 5 (Neo campaign)', '🧗', 'bronze', 11),
  ('snake-chain-10', 'snake', 'Great!', 'Reach a 10-chain (Fruit Chain)', '🔥', 'bronze', 12),
  ('snake-games-5', 'snake', 'Regular', 'Play 5 games', '🎮', 'bronze', 13),
  ('snake-both-modes', 'snake', 'Skin Collector', 'Play both Neo and Fruit Chain', '🔀', 'bronze', 14),
  ('snake-food-total-250', 'snake', 'Big Appetite', 'Eat 250 food total', '🐛', 'bronze', 15),
  ('snake-combo-3x', 'snake', 'Combo Master', 'Reach the max 3× combo (Neo)', '⚡', 'silver', 16),
  ('snake-food-50', 'snake', 'Glutton', 'Eat 50 food in a single game', '🍽️', 'silver', 17),
  ('snake-chain-15', 'snake', 'Amazing!', 'Reach a 15-chain (Fruit Chain)', '💎', 'silver', 18),
  ('snake-level-10', 'snake', 'Campaign Clear', 'Clear all 10 Neo levels', '🏁', 'silver', 19),
  ('snake-score-5000', 'snake', 'High Roller', 'Score 5,000 in a single game', '🚀', 'silver', 20),
  ('snake-survive-180', 'snake', 'Marathon', 'Survive 3 minutes in a game', '🕰️', 'silver', 21),
  ('snake-accuracy-95', 'snake', 'Eagle Eye', 'Finish a Fruit Chain run at 95%+ accuracy', '🦅', 'silver', 22),
  ('snake-lockin-10', 'snake', 'Lockmaster', 'Land 10 lock-ins in a single game (Fruit Chain)', '🗝️', 'silver', 23),
  ('snake-games-25', 'snake', 'Dedicated', 'Play 25 games', '🏅', 'silver', 24),
  ('snake-chain-20', 'snake', 'Incredible!', 'Reach a 20-chain (Fruit Chain)', '🌟', 'silver', 25),
  ('snake-score-15000', 'snake', 'Legend', 'Score 15,000 in a single game', '👑', 'gold', 26),
  ('snake-chain-25', 'snake', 'Fever Pitch', 'Reach a 25-chain — FEVER (Fruit Chain)', '🔥', 'gold', 27),
  ('snake-food-100', 'snake', 'Anaconda', 'Eat 100 food in a single game', '🐍', 'gold', 28),
  ('snake-accuracy-100', 'snake', 'Flawless', 'Finish a Fruit Chain run (20+ fruits) at 100% accuracy', '✨', 'gold', 29),
  ('snake-games-100', 'snake', 'Snake Charmer', 'Play 100 games', '🎖️', 'gold', 30),
  ('snake-master', 'snake', 'Snake Master', 'Unlock all 30 other trophies', '🏆', 'platinum', 31)
ON CONFLICT (id) DO NOTHING;
