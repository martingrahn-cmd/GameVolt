-- Type or Die — server-validated leaderboard (GDD §6).
--
-- Apply in the GameVolt Supabase SQL editor (project nwkjayseuhvvpkdgpivm).
-- Idempotent, matching the GameVolt convention. Coexists with the shared,
-- client-trusted `scores` table — this is the AUTHORITATIVE board for Type
-- or Die, written ONLY by the tod-submit-run Edge Function (service role).
-- Clients can never insert here, so a fabricated score has no way in.

-- Register the game (no-op if it exists).
insert into games (id, title, thumbnail_url) values
  ('type-or-die', 'Type or Die', '/assets/thumbnails/type-or-die.webp')
on conflict (id) do nothing;

-- A run is issued server-side (tod-start-run) before play; the client plays
-- against the issued seed and submits its keystroke log to tod-submit-run.
create table if not exists tod_runs (
  run_id     uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) not null,
  mode       text not null,            -- speedtest-15|30|60 · zombie (+ daily)
  bucket     text not null default 'all',  -- 'all' or a daily date (YYYY-MM-DD)
  seed       bigint not null,
  issued_at  timestamptz not null default now(),
  status     text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz default now()
);
create index if not exists tod_runs_user_idx on tod_runs (user_id);

-- Server-recomputed scores. state: accepted (public) · pending (shadow,
-- visible only to its owner) · rejected (never written / never shown).
create table if not exists tod_leaderboard (
  id         bigserial primary key,
  user_id    uuid references profiles(id) not null,
  run_id     uuid references tod_runs(run_id) unique,
  mode       text not null,
  bucket     text not null default 'all',
  score      int  not null,
  wpm        int,
  accuracy   int,
  state      text not null default 'accepted'
             check (state in ('accepted', 'pending', 'rejected')),
  created_at timestamptz default now()
);
create index if not exists tod_lb_board_idx
  on tod_leaderboard (mode, bucket, state, score desc);

alter table tod_runs        enable row level security;
alter table tod_leaderboard enable row level security;

-- runs: a user may read their own; NO client insert/update (the Edge
-- Function creates and closes them via the service role, which bypasses RLS).
drop policy if exists tod_runs_select on tod_runs;
create policy tod_runs_select on tod_runs
  for select using (auth.uid() = user_id);

-- leaderboard: public read of accepted rows; a user also sees their own
-- pending (shadow) rows. NO insert/update policy → clients cannot write;
-- only the service-role Edge Function can (GDD §6.3, §6.5, §6.7).
drop policy if exists tod_lb_select on tod_leaderboard;
create policy tod_lb_select on tod_leaderboard
  for select using (state = 'accepted' or auth.uid() = user_id);

-- Public leaderboard read (best accepted score per user, per mode + bucket).
create or replace function get_tod_leaderboard(
  p_mode text, p_bucket text default 'all', p_limit int default 50
)
returns table(rank bigint, user_id uuid, username text, avatar_url text,
              score int, wpm int, accuracy int)
as $$
  select row_number() over (order by b.score desc) as rank,
         b.user_id, p.username, p.avatar_url, b.score, b.wpm, b.accuracy
  from (
    select distinct on (user_id) user_id, score, wpm, accuracy
    from tod_leaderboard
    where mode = p_mode and bucket = p_bucket and state = 'accepted'
    order by user_id, score desc
  ) b
  join profiles p on p.id = b.user_id
  order by b.score desc
  limit p_limit;
$$ language sql stable;
