-- GameVolt QR / device login requests.
-- Apply before deploying the device-auth Edge Function.
-- No browser role gets table access; only the service-role function can read it.

create table if not exists public.device_auth_requests (
  id uuid primary key default gen_random_uuid(),
  approval_token_hash text not null unique,
  poll_token_hash text not null unique,
  display_code text not null check (display_code ~ '^[0-9]{6}$'),
  client_fingerprint text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'ready')),
  approved_user_id uuid references auth.users(id) on delete cascade,
  approved_email text,
  login_token_hash text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

create index if not exists device_auth_expiry_idx
  on public.device_auth_requests (expires_at);
create index if not exists device_auth_fingerprint_idx
  on public.device_auth_requests (client_fingerprint, created_at desc);

alter table public.device_auth_requests enable row level security;

-- Explicitly keep all auth material off the generated browser API. The Edge
-- Function uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
revoke all on table public.device_auth_requests from anon, authenticated;
grant all on table public.device_auth_requests to service_role;

comment on table public.device_auth_requests is
  'Five-minute, one-time device authorization requests for GameVolt QR login.';
