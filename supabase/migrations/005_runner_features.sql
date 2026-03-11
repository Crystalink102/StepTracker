-- Weekly distance goal
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_distance_goal_meters integer DEFAULT 0;

-- Running streak
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS running_streak integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_run_streak_date text;
