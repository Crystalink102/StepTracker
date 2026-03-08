-- ============================================================
-- StepTracker Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique,
  display_name text,
  avatar_url text,
  resting_hr integer not null default 70,
  date_of_birth date,
  height_cm numeric(5,1),
  weight_kg numeric(5,1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- 2. USER XP (aggregate table - one row per user)
-- ============================================================
create table public.user_xp (
  user_id uuid references auth.users(id) on delete cascade primary key,
  total_xp bigint not null default 0,
  current_level integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.user_xp enable row level security;

create policy "Users can read own xp"
  on public.user_xp for select
  using (auth.uid() = user_id);

create policy "Users can update own xp"
  on public.user_xp for update
  using (auth.uid() = user_id);

create policy "Users can insert own xp"
  on public.user_xp for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- 3. XP LEDGER (immutable log of all XP earned)
-- ============================================================
create table public.xp_ledger (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  source text not null check (source in ('steps', 'activity', 'bonus')),
  source_id text,
  amount integer not null,
  description text,
  created_at timestamptz not null default now()
);

create index idx_xp_ledger_user on public.xp_ledger(user_id);

alter table public.xp_ledger enable row level security;

create policy "Users can read own xp ledger"
  on public.xp_ledger for select
  using (auth.uid() = user_id);

create policy "Users can insert own xp ledger"
  on public.xp_ledger for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- 4. DAILY STEPS
-- ============================================================
create table public.daily_steps (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  step_count integer not null default 0,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

create index idx_daily_steps_user_date on public.daily_steps(user_id, date);

alter table public.daily_steps enable row level security;

create policy "Users can read own daily steps"
  on public.daily_steps for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily steps"
  on public.daily_steps for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily steps"
  on public.daily_steps for update
  using (auth.uid() = user_id);

-- ============================================================
-- 5. ACTIVITIES (runs & walks)
-- ============================================================
create table public.activities (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('run', 'walk')),
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  distance_meters numeric(10,2) not null default 0,
  avg_pace_seconds_per_km integer,
  avg_heart_rate integer,
  hr_source text check (hr_source in ('manual', 'auto')),
  calories_estimate integer,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_activities_user on public.activities(user_id);
create index idx_activities_user_status on public.activities(user_id, status);

alter table public.activities enable row level security;

create policy "Users can read own activities"
  on public.activities for select
  using (auth.uid() = user_id);

create policy "Users can insert own activities"
  on public.activities for insert
  with check (auth.uid() = user_id);

create policy "Users can update own activities"
  on public.activities for update
  using (auth.uid() = user_id);

-- ============================================================
-- 6. ACTIVITY WAYPOINTS (GPS breadcrumbs)
-- ============================================================
create table public.activity_waypoints (
  id uuid default uuid_generate_v4() primary key,
  activity_id uuid references public.activities(id) on delete cascade not null,
  latitude double precision not null,
  longitude double precision not null,
  altitude double precision,
  speed double precision,
  timestamp timestamptz not null,
  order_index integer not null
);

create index idx_waypoints_activity on public.activity_waypoints(activity_id);

alter table public.activity_waypoints enable row level security;

-- Waypoint access is through the activity's user_id
create policy "Users can read own waypoints"
  on public.activity_waypoints for select
  using (
    exists (
      select 1 from public.activities
      where activities.id = activity_waypoints.activity_id
      and activities.user_id = auth.uid()
    )
  );

create policy "Users can insert own waypoints"
  on public.activity_waypoints for insert
  with check (
    exists (
      select 1 from public.activities
      where activities.id = activity_waypoints.activity_id
      and activities.user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. PERSONAL BESTS
-- ============================================================
create table public.personal_bests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  distance_label text not null,
  distance_meters integer not null,
  best_time_seconds integer not null,
  activity_id uuid references public.activities(id) on delete set null,
  achieved_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(user_id, distance_label)
);

create index idx_personal_bests_user on public.personal_bests(user_id);

alter table public.personal_bests enable row level security;

create policy "Users can read own personal bests"
  on public.personal_bests for select
  using (auth.uid() = user_id);

create policy "Users can insert own personal bests"
  on public.personal_bests for insert
  with check (auth.uid() = user_id);

create policy "Users can update own personal bests"
  on public.personal_bests for update
  using (auth.uid() = user_id);

-- ============================================================
-- 8. AUTO-CREATE PROFILE + USER_XP ON SIGNUP (trigger)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);

  insert into public.user_xp (user_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 9. AUTO-UPDATE updated_at COLUMNS
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger daily_steps_updated_at
  before update on public.daily_steps
  for each row execute function public.update_updated_at();

create trigger user_xp_updated_at
  before update on public.user_xp
  for each row execute function public.update_updated_at();

-- ============================================================
-- 10. STORAGE BUCKET FOR AVATARS
-- ============================================================
-- Run this separately in Supabase Dashboard > Storage > Create Bucket
-- Bucket name: avatars
-- Public: false
-- File size limit: 5MB
-- Allowed MIME types: image/png, image/jpeg, image/webp

-- Then add this storage policy in SQL Editor:
-- (Uncomment after creating the bucket)

-- create policy "Users can upload own avatar"
--   on storage.objects for insert
--   with check (
--     bucket_id = 'avatars'
--     and auth.uid()::text = (storage.foldername(name))[1]
--   );

-- create policy "Users can read own avatar"
--   on storage.objects for select
--   using (
--     bucket_id = 'avatars'
--     and auth.uid()::text = (storage.foldername(name))[1]
--   );

-- create policy "Users can update own avatar"
--   on storage.objects for update
--   using (
--     bucket_id = 'avatars'
--     and auth.uid()::text = (storage.foldername(name))[1]
--   );

-- create policy "Users can delete own avatar"
--   on storage.objects for delete
--   using (
--     bucket_id = 'avatars'
--     and auth.uid()::text = (storage.foldername(name))[1]
--   );

-- ============================================================
-- 11. DELETE OWN ACCOUNT RPC
-- ============================================================
create or replace function public.delete_own_account()
returns void as $$
begin
  -- Delete from auth.users (cascades to all public tables)
  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer;
