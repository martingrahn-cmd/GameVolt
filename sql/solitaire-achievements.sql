-- ============================================================
-- Solitaire — achievement_defs seed (31 trophies, shared across all 6 variants)
-- Unified under game id 'solitaire'. Safe to re-run (ON CONFLICT DO NOTHING).
-- The 'solitaire' games row already exists in schema.sql.
-- ============================================================
INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  ('solitaire-first-win', 'solitaire', 'First Victory', 'Win your first game', '🎉', 'bronze', 1),
  ('solitaire-win-klondike', 'solitaire', 'Klondike Clear', 'Win a Klondike game', '♠️', 'bronze', 2),
  ('solitaire-win-freecell', 'solitaire', 'FreeCell Clear', 'Win a FreeCell game', '♦️', 'bronze', 3),
  ('solitaire-win-spider', 'solitaire', 'Spider Clear', 'Win a Spider game', '🕷️', 'bronze', 4),
  ('solitaire-win-pyramid', 'solitaire', 'Pyramid Clear', 'Clear a Pyramid game', '🔺', 'bronze', 5),
  ('solitaire-win-golf', 'solitaire', 'Hole in One', 'Win a Golf game', '⛳', 'bronze', 6),
  ('solitaire-win-tripeaks', 'solitaire', 'Peak Performance', 'Win a TriPeaks game', '⛰️', 'bronze', 7),
  ('solitaire-games-10', 'solitaire', 'Getting Started', 'Play 10 games', '🃏', 'bronze', 8),
  ('solitaire-wins-5', 'solitaire', 'Winner', 'Win 5 games total', '✅', 'bronze', 9),
  ('solitaire-wins-10', 'solitaire', 'Regular Winner', 'Win 10 games total', '🏅', 'bronze', 10),
  ('solitaire-fast-5min', 'solitaire', 'Quick Hands', 'Win any game in under 5 minutes', '⏱️', 'bronze', 11),
  ('solitaire-two-variants', 'solitaire', 'Sampler', 'Win in 2 different variants', '🔀', 'bronze', 12),
  ('solitaire-tripeaks-streak-5', 'solitaire', 'Chain Start', 'Reach a 5-streak in TriPeaks', '🔗', 'bronze', 13),
  ('solitaire-score-1000', 'solitaire', 'Four Figures', 'Score 1,000+ in a single game', '💯', 'bronze', 14),
  ('solitaire-streak-3', 'solitaire', 'On a Roll', 'Win 3 games in a row', '🔥', 'bronze', 15),
  ('solitaire-all-variants', 'solitaire', 'Grand Slam', 'Win a game in all 6 variants', '🏆', 'silver', 16),
  ('solitaire-wins-25', 'solitaire', 'Seasoned', 'Win 25 games total', '🎖️', 'silver', 17),
  ('solitaire-fast-3min', 'solitaire', 'Speed Runner', 'Win any game in under 3 minutes', '🚀', 'silver', 18),
  ('solitaire-spider-2suit', 'solitaire', 'Spider Adept', 'Win a 2-suit Spider game', '🕸️', 'silver', 19),
  ('solitaire-streak-5', 'solitaire', 'Hot Streak', 'Win 5 games in a row', '🔥', 'silver', 20),
  ('solitaire-tripeaks-streak-10', 'solitaire', 'Peak Chainer', 'Reach a 10-streak in TriPeaks', '⛓️', 'silver', 21),
  ('solitaire-score-2500', 'solitaire', 'High Scorer', 'Score 2,500+ in a single game', '💎', 'silver', 22),
  ('solitaire-games-50', 'solitaire', 'Committed', 'Play 50 games', '📅', 'silver', 23),
  ('solitaire-golf-fast', 'solitaire', 'Under Par', 'Win a Golf game in under 90 seconds', '🏌️', 'silver', 24),
  ('solitaire-classic-sweep', 'solitaire', 'Classic Sweep', 'Win Klondike, FreeCell and Spider', '🎩', 'silver', 25),
  ('solitaire-spider-4suit', 'solitaire', 'Spider Master', 'Win a 4-suit Spider game', '👑', 'gold', 26),
  ('solitaire-wins-100', 'solitaire', 'Centurion', 'Win 100 games total', '💯', 'gold', 27),
  ('solitaire-fast-90s', 'solitaire', 'Lightning', 'Win any game in under 90 seconds', '⚡', 'gold', 28),
  ('solitaire-streak-10', 'solitaire', 'Unstoppable', 'Win 10 games in a row', '🔥', 'gold', 29),
  ('solitaire-score-5000', 'solitaire', 'Card Shark', 'Score 5,000+ in a single game', '🦈', 'gold', 30),
  ('solitaire-master', 'solitaire', 'Solitaire Master', 'Unlock all 30 other trophies', '🏆', 'platinum', 31)
ON CONFLICT (id) DO NOTHING;
