-- Articulate — database schema
--
-- Apply this in the Supabase SQL editor on a fresh project. Auth is handled by
-- Supabase Auth (email + password), so the only application table is `sessions`.
--
-- One row per completed practice attempt. The four practice modes produce
-- structurally different results, so the mode-specific payload lives in a jsonb
-- `data` column while the columns that every mode shares (owner, mode, time,
-- score) are promoted to real columns for indexing and ordering.

create table if not exists public.sessions (
  id            bigint generated always as identity primary key,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  mode          text        not null check (mode in ('off-the-cuff', 'tongue-twisters', 'pen-speaking', 'daily-warm-up')),
  timestamp_ms  bigint      not null,
  overall_score numeric,
  data          jsonb       not null,
  created_at    timestamptz not null default now()
);

-- History is always read newest-first, scoped to one user.
create index if not exists sessions_user_time_idx
  on public.sessions (user_id, timestamp_ms desc);

-- deleteSessionById() matches on the session id inside the jsonb payload.
create index if not exists sessions_data_id_idx
  on public.sessions ((data->>'id'));

-- Row Level Security -------------------------------------------------------
-- The app talks to Postgres directly from the browser with the anon key, so
-- RLS is the actual boundary between users, not a formality. Every policy is
-- scoped to auth.uid(); application code additionally filters by user_id as
-- defence in depth.

alter table public.sessions enable row level security;

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own"
  on public.sessions for select
  using (auth.uid() = user_id);

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own"
  on public.sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own"
  on public.sessions for delete
  using (auth.uid() = user_id);
