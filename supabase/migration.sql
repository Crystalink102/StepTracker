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
  current_streak integer not null default 0,
  last_streak_date date,
  daily_step_goal integer not null default 10000,
  push_token text,
  notify_daily_reminder boolean not null default true,
  notify_streak_warning boolean not null default true,
  notify_achievements boolean not null default true,
  notify_friend_requests boolean not null default true,
  notify_weekly_summary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Allow any authenticated user to read profiles (needed for friends, leaderboard, search)
create policy "Authenticated users can read profiles"
  on public.profiles for select
  using (auth.uid() is not null);

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

-- Allow any authenticated user to read XP (needed for friends list and leaderboard)
create policy "Authenticated users can read xp"
  on public.user_xp for select
  using (auth.uid() is not null);

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

-- Allow reading own steps, plus friends' steps
create policy "Users can read own and friends daily steps"
  on public.daily_steps for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships
      where status = 'accepted'
      and (
        (requester_id = auth.uid() and addressee_id = user_id)
        or (addressee_id = auth.uid() and requester_id = user_id)
      )
    )
  );

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
-- 8. FRIENDSHIPS
-- ============================================================
create table public.friendships (
  id uuid default uuid_generate_v4() primary key,
  requester_id uuid references auth.users(id) on delete cascade not null,
  addressee_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(requester_id, addressee_id)
);

create index idx_friendships_requester on public.friendships(requester_id);
create index idx_friendships_addressee on public.friendships(addressee_id);
create index idx_friendships_status on public.friendships(status);

alter table public.friendships enable row level security;

-- Users can read friendships they are part of
create policy "Users can read own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Users can send friend requests (insert)
create policy "Users can insert friendships"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

-- Users can update friendships they received (accept/decline)
create policy "Users can update received friendships"
  on public.friendships for update
  using (auth.uid() = addressee_id);

-- Users can delete friendships they are part of
create policy "Users can delete own friendships"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Updated_at trigger for friendships
create trigger friendships_updated_at
  before update on public.friendships
  for each row execute function public.update_updated_at();

-- ============================================================
-- 9. ACHIEVEMENT DEFINITIONS
-- ============================================================
create table public.achievement_definitions (
  id text primary key,
  category text not null,
  title text not null,
  description text not null,
  icon_name text not null default 'trophy',
  threshold integer not null,
  xp_reward integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.achievement_definitions enable row level security;

-- Anyone authenticated can read achievement definitions
create policy "Anyone can read achievement definitions"
  on public.achievement_definitions for select
  using (auth.uid() is not null);

-- ============================================================
-- 10. USER ACHIEVEMENTS
-- ============================================================
create table public.user_achievements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  achievement_id text references public.achievement_definitions(id) on delete cascade not null,
  unlocked_at timestamptz not null default now(),
  notified boolean not null default false,
  unique(user_id, achievement_id)
);

create index idx_user_achievements_user on public.user_achievements(user_id);

alter table public.user_achievements enable row level security;

create policy "Users can read own achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

create policy "Users can insert own achievements"
  on public.user_achievements for insert
  with check (auth.uid() = user_id);

create policy "Users can update own achievements"
  on public.user_achievements for update
  using (auth.uid() = user_id);

-- ============================================================
-- 11. AUTO-CREATE PROFILE + USER_XP ON SIGNUP (trigger)
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

-- ============================================================
-- 14. SEARCH USERS RPC (for friend search)
-- ============================================================
create or replace function public.search_users(search_query text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text
) as $$
begin
  return query
    select p.id, p.username, p.display_name, p.avatar_url
    from public.profiles p
    where p.id != auth.uid()
      and p.username is not null
      and (
        p.username ilike '%' || search_query || '%'
        or p.display_name ilike '%' || search_query || '%'
      )
      -- Exclude users who already have a pending or accepted friendship with caller
      and not exists (
        select 1 from public.friendships f
        where f.status in ('pending', 'accepted')
        and (
          (f.requester_id = auth.uid() and f.addressee_id = p.id)
          or (f.addressee_id = auth.uid() and f.requester_id = p.id)
        )
      )
    order by p.username
    limit 20;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 15. GET LEADERBOARD RPC
-- ============================================================
create or replace function public.get_leaderboard(
  time_period text default 'all_time',
  metric text default 'xp',
  result_limit integer default 50
)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  current_level integer,
  value bigint,
  rank bigint
) as $$
begin
  if metric = 'xp' then
    return query
      select
        p.id as user_id,
        p.username,
        p.display_name,
        p.avatar_url,
        coalesce(ux.current_level, 1)::integer as current_level,
        coalesce(ux.total_xp, 0)::bigint as value,
        row_number() over (order by coalesce(ux.total_xp, 0) desc)::bigint as rank
      from public.profiles p
      left join public.user_xp ux on ux.user_id = p.id
      where p.username is not null
      order by coalesce(ux.total_xp, 0) desc
      limit result_limit;

  elsif metric = 'steps' then
    if time_period = 'daily' then
      return query
        select
          p.id as user_id,
          p.username,
          p.display_name,
          p.avatar_url,
          coalesce(ux.current_level, 1)::integer as current_level,
          coalesce(ds.step_count, 0)::bigint as value,
          row_number() over (order by coalesce(ds.step_count, 0) desc)::bigint as rank
        from public.profiles p
        left join public.user_xp ux on ux.user_id = p.id
        left join public.daily_steps ds on ds.user_id = p.id and ds.date = current_date
        where p.username is not null
        order by coalesce(ds.step_count, 0) desc
        limit result_limit;
    elsif time_period = 'weekly' then
      return query
        select
          p.id as user_id,
          p.username,
          p.display_name,
          p.avatar_url,
          coalesce(ux.current_level, 1)::integer as current_level,
          coalesce(sum(ds.step_count), 0)::bigint as value,
          row_number() over (order by coalesce(sum(ds.step_count), 0) desc)::bigint as rank
        from public.profiles p
        left join public.user_xp ux on ux.user_id = p.id
        left join public.daily_steps ds on ds.user_id = p.id and ds.date >= current_date - interval '7 days'
        where p.username is not null
        group by p.id, p.username, p.display_name, p.avatar_url, ux.current_level
        order by value desc
        limit result_limit;
    elsif time_period = 'monthly' then
      return query
        select
          p.id as user_id,
          p.username,
          p.display_name,
          p.avatar_url,
          coalesce(ux.current_level, 1)::integer as current_level,
          coalesce(sum(ds.step_count), 0)::bigint as value,
          row_number() over (order by coalesce(sum(ds.step_count), 0) desc)::bigint as rank
        from public.profiles p
        left join public.user_xp ux on ux.user_id = p.id
        left join public.daily_steps ds on ds.user_id = p.id and ds.date >= current_date - interval '30 days'
        where p.username is not null
        group by p.id, p.username, p.display_name, p.avatar_url, ux.current_level
        order by value desc
        limit result_limit;
    else
      return query
        select
          p.id as user_id,
          p.username,
          p.display_name,
          p.avatar_url,
          coalesce(ux.current_level, 1)::integer as current_level,
          coalesce(sum(ds.step_count), 0)::bigint as value,
          row_number() over (order by coalesce(sum(ds.step_count), 0) desc)::bigint as rank
        from public.profiles p
        left join public.user_xp ux on ux.user_id = p.id
        left join public.daily_steps ds on ds.user_id = p.id
        where p.username is not null
        group by p.id, p.username, p.display_name, p.avatar_url, ux.current_level
        order by value desc
        limit result_limit;
    end if;

  elsif metric = 'streak' then
    return query
      select
        p.id as user_id,
        p.username,
        p.display_name,
        p.avatar_url,
        coalesce(ux.current_level, 1)::integer as current_level,
        p.current_streak::bigint as value,
        row_number() over (order by p.current_streak desc)::bigint as rank
      from public.profiles p
      left join public.user_xp ux on ux.user_id = p.id
      where p.username is not null
      order by p.current_streak desc
      limit result_limit;
  end if;
end;
$$ language plpgsql security definer;
