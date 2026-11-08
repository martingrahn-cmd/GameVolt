-- ============================================================
-- LCD Classics: game row + 31 achievement definitions (English)
-- 15 bronze, 10 silver, 5 gold, 1 platinum (unlock-all-others).
-- Run in Supabase SQL Editor at GameVolt release time.
-- IDs match GameVolt.achievements.unlock(trophyId) -> 'lcd-classics-<id>'.
-- Idempotent: safe to re-run.
--
-- Leaderboard modes (rows land in scores via the SDK), higher is better:
--   'dockdrop-a', 'dockdrop-b', 'crushyard-a', 'crushyard-b', 'girderjack-a', 'girderjack-b'
--   one per handheld (Dock Drop, Crush Yard, Girder Jack) and pace (Game A / Game B)
-- ============================================================

-- Game row (required — scores/achievements FK to games.id)
INSERT INTO games (id, title, thumbnail_url) VALUES
  ('lcd-classics', 'LCD Classics', '/assets/thumbnails/lcd-classics.webp')
ON CONFLICT (id) DO NOTHING;

-- Achievement definitions
DELETE FROM achievement_defs WHERE game_id = 'lcd-classics';

INSERT INTO achievement_defs (id, game_id, title, description, icon, tier, sort_order) VALUES
  ('lcd-classics-batteries', 'lcd-classics', 'Batteries In', 'Start a game on any handheld.', '🔋', 'bronze', 1),
  ('lcd-classics-dd-25', 'lcd-classics', 'Dockhand', 'Score 25 points in Dock Drop.', '📦', 'bronze', 2),
  ('lcd-classics-dd-magnet', 'lcd-classics', 'Magnetic', 'Fire the magnet in Dock Drop.', '🧲', 'bronze', 3),
  ('lcd-classics-dd-gold', 'lcd-classics', 'Gold Rush', 'Catch a gold parcel.', '⭐', 'bronze', 4),
  ('lcd-classics-dd-x2', 'lcd-classics', 'Double Up', 'Reach the x2 multiplier in Dock Drop.', '✖️', 'bronze', 5),
  ('lcd-classics-cy-50', 'lcd-classics', 'Out of the Squeeze', 'Score 50 points in Crush Yard.', '🗜️', 'bronze', 6),
  ('lcd-classics-cy-gear', 'lcd-classics', 'Gear Head', 'Pick up a gear in Crush Yard.', '⚙️', 'bronze', 7),
  ('lcd-classics-cy-push', 'lcd-classics', 'Shoved Along', 'Get pushed by the scrap and live to tell.', '↔️', 'bronze', 8),
  ('lcd-classics-cy-blast', 'lcd-classics', 'Big Bang', 'Set off a BLAST in Crush Yard.', '💥', 'bronze', 9),
  ('lcd-classics-cy-turns', 'lcd-classics', 'Weathervane', 'Survive 5 direction changes in one game.', '🧭', 'bronze', 10),
  ('lcd-classics-gj-hop', 'lcd-classics', 'Hop', 'Jump over an oil drum.', '🛢️', 'bronze', 11),
  ('lcd-classics-gj-top', 'lcd-classics', 'Top Floor', 'Climb to the top girder.', '🏗️', 'bronze', 12),
  ('lcd-classics-gj-bolt', 'lcd-classics', 'First Bolt', 'Grab the hook and pull a bolt.', '🔩', 'bronze', 13),
  ('lcd-classics-gj-combo', 'lcd-classics', 'Double Hop', 'Clear two drums in one jump.', '🦘', 'bronze', 14),
  ('lcd-classics-gj-shield', 'lcd-classics', 'Shield Up', 'Charge five cells into a shield.', '🛡️', 'bronze', 15),
  ('lcd-classics-dd-200', 'lcd-classics', 'Harbour Master', 'Score 200 points in Dock Drop.', '⚓', 'silver', 16),
  ('lcd-classics-dd-x4', 'lcd-classics', 'Full Charge', 'Reach the x4 multiplier in Dock Drop.', '⚡', 'silver', 17),
  ('lcd-classics-dd-clean', 'lcd-classics', 'Clean Sheet', 'Score 100 in Dock Drop without a single miss.', '🧤', 'silver', 18),
  ('lcd-classics-cy-300', 'lcd-classics', 'Scrap Survivor', 'Score 300 points in Crush Yard.', '🚧', 'silver', 19),
  ('lcd-classics-cy-hoarder', 'lcd-classics', 'Hoarder', 'Collect 5 gears in one game of Crush Yard.', '🧰', 'silver', 20),
  ('lcd-classics-cy-demolition', 'lcd-classics', 'Demolition', 'Clear 5 or more blocks with a single BLAST.', '🧨', 'silver', 21),
  ('lcd-classics-gj-foreman', 'lcd-classics', 'Foreman Down', 'Pull all four bolts and drop the Foreman.', '🤖', 'silver', 22),
  ('lcd-classics-gj-l3', 'lcd-classics', 'Third Shift', 'Reach level 3 in Girder Jack.', '3️⃣', 'silver', 23),
  ('lcd-classics-gj-hops50', 'lcd-classics', 'Drum Dancer', 'Jump 50 drums in one game of Girder Jack.', '🕺', 'silver', 24),
  ('lcd-classics-tour', 'lcd-classics', 'Tour of Duty', 'Score 100 or more on all three handhelds.', '🎒', 'silver', 25),
  ('lcd-classics-dd-500b', 'lcd-classics', 'Night Shift', 'Score 500 in Dock Drop on Game B.', '🌙', 'gold', 26),
  ('lcd-classics-cy-400b', 'lcd-classics', 'Unsquishable', 'Score 400 in Crush Yard on Game B.', '🦾', 'gold', 27),
  ('lcd-classics-gj-l5', 'lcd-classics', 'Iron Worker', 'Reach level 5 in Girder Jack.', '👷', 'gold', 28),
  ('lcd-classics-gj-untouchable', 'lcd-classics', 'Untouchable', 'Drop the Foreman without losing a life on that level.', '✨', 'gold', 29),
  ('lcd-classics-triple', 'lcd-classics', 'Triple Crown', 'Score 300 on Game B on all three handhelds.', '👑', 'gold', 30),
  ('lcd-classics-master', 'lcd-classics', 'LCD Classics Master', 'Unlock the other 30 trophies.', '💎', 'platinum', 31)
ON CONFLICT (id) DO NOTHING;
