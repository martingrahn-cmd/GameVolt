-- SimBuild uses the shared GameVolt SDK save table with game_id='simbuild'.
-- Safe to rerun. Applied to the production project on 2026-09-12.
INSERT INTO public.games (id, title, description, thumbnail_url) VALUES
  ('simbuild', 'SimBuild', 'Build and manage a growing 3D city in your browser.', NULL)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

SELECT id, title, description FROM public.games WHERE id = 'simbuild';
