-- ============================================================
-- StepTracker: Add Friends System
-- Run this in Supabase SQL Editor to add the friending system
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- 1. Add missing profile columns (skip if they already exist)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='current_streak') then
    alter table public.profiles add column current_streak integer not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='last_streak_date') then
    alter table public.profiles add column last_streak_date date;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='daily_step_goal') then
    alter table public.profiles add column daily_step_goal integer not null default 10000;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='push_token') then
    alter table public.profiles add column push_token text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='notify_daily_reminder') then
    alter table public.profiles add column notify_daily_reminder boolean not null default true;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='notify_streak_warning') then
    alter table public.profiles add column notify_streak_warning boolean not null default true;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='notify_achievements') then
    alter table public.profiles add column notify_achievements boolean not null default true;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='notify_friend_requests') then
    alter table public.profiles add column notify_friend_requests boolean not null default true;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='notify_weekly_summary') then
    alter table public.profiles add column notify_weekly_summary boolean not null default true;
  end if;
end $$;

-- 2. Fix profiles RLS: allow any authenticated user to read profiles
-- (needed for friends list, search, leaderboard)
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select
  using (auth.uid() is not null);

-- 3. Fix user_xp RLS: allow any authenticated user to read XP
-- (needed for friends list and leaderboard)
drop policy if exists "Users can read own xp" on public.user_xp;
drop policy if exists "Authenticated users can read xp" on public.user_xp;
create policy "Authenticated users can read xp"
  on public.user_xp for select
  using (auth.uid() is not null);

-- 4. Create friendships table
create table if not exists public.friendships (
  id uuid default uuid_generate_v4() primary key,
  requester_id uuid references auth.users(id) on delete cascade not null,
  addressee_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(requester_id, addressee_id)
);

create index if not exists idx_friendships_requester on public.friendships(requester_id);
create index if not exists idx_friendships_addressee on public.friendships(addressee_id);
create index if not exists idx_friendships_status on public.friendships(status);

alter table public.friendships enable row level security;

-- Friendships RLS policies
drop policy if exists "Users can read own friendships" on public.friendships;
create policy "Users can read own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Users can insert friendships" on public.friendships;
create policy "Users can insert friendships"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

drop policy if exists "Users can update received friendships" on public.friendships;
create policy "Users can update received friendships"
  on public.friendships for update
  using (auth.uid() = addressee_id);

drop policy if exists "Users can delete own friendships" on public.friendships;
create policy "Users can delete own friendships"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Updated_at trigger for friendships
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists friendships_updated_at on public.friendships;
create trigger friendships_updated_at
  before update on public.friendships
  for each row execute function public.update_updated_at();

-- 5. Fix daily_steps RLS: allow reading friends' steps
drop policy if exists "Users can read own daily steps" on public.daily_steps;
drop policy if exists "Users can read own and friends daily steps" on public.daily_steps;
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

-- 6. Achievement definitions table
create table if not exists public.achievement_definitions (
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

drop policy if exists "Anyone can read achievement definitions" on public.achievement_definitions;
create policy "Anyone can read achievement definitions"
  on public.achievement_definitions for select
  using (auth.uid() is not null);

-- 7. User achievements table
create table if not exists public.user_achievements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  achievement_id text references public.achievement_definitions(id) on delete cascade not null,
  unlocked_at timestamptz not null default now(),
  notified boolean not null default false,
  unique(user_id, achievement_id)
);

create index if not exists idx_user_achievements_user on public.user_achievements(user_id);

alter table public.user_achievements enable row level security;

drop policy if exists "Users can read own achievements" on public.user_achievements;
create policy "Users can read own achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own achievements" on public.user_achievements;
create policy "Users can insert own achievements"
  on public.user_achievements for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own achievements" on public.user_achievements;
create policy "Users can update own achievements"
  on public.user_achievements for update
  using (auth.uid() = user_id);

-- 8. Search users function
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

-- 9. Get leaderboard function
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
