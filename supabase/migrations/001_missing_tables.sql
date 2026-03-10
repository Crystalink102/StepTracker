-- ============================================================================
-- StepTracker: Missing Tables Migration
-- Creates activity_likes, activity_comments, challenges, challenge_participants
-- with RLS policies and performance indexes.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. activity_likes
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.activity_likes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid        NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT activity_likes_unique_pair UNIQUE (activity_id, user_id)
);

COMMENT ON TABLE public.activity_likes IS 'One like per user per activity.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_likes_activity_id ON public.activity_likes (activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_user_id     ON public.activity_likes (user_id);

-- RLS
ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_likes_select"
  ON public.activity_likes FOR SELECT
  USING (true);
  -- Anyone authenticated can see like counts; no sensitive data here.

CREATE POLICY "activity_likes_insert"
  ON public.activity_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "activity_likes_delete"
  ON public.activity_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. activity_comments
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.activity_comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid        NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  content     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activity_comments IS 'User comments on activities.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON public.activity_comments (activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_user_id     ON public.activity_comments (user_id);

-- RLS
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_comments_select"
  ON public.activity_comments FOR SELECT
  USING (true);
  -- Comments are readable by any authenticated user (needed for feed).

CREATE POLICY "activity_comments_insert"
  ON public.activity_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "activity_comments_update"
  ON public.activity_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "activity_comments_delete"
  ON public.activity_comments FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. challenges
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.challenges (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text,
  type         text        NOT NULL,  -- 'steps', 'distance', 'duration', 'activities'
  target_value numeric     NOT NULL,
  start_date   date        NOT NULL,
  end_date     date        NOT NULL,
  status       text        NOT NULL DEFAULT 'active',  -- 'active', 'completed', 'cancelled'
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.challenges IS 'Group challenges that friends can join.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenges_creator_id ON public.challenges (creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status     ON public.challenges (status);

-- RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can view active challenges (needed to browse available ones from friends).
CREATE POLICY "challenges_select"
  ON public.challenges FOR SELECT
  USING (true);

-- Only the creator can insert a challenge (creator_id must match auth user).
CREATE POLICY "challenges_insert"
  ON public.challenges FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Only the creator can update their challenge (e.g., mark as completed/cancelled).
CREATE POLICY "challenges_update"
  ON public.challenges FOR UPDATE
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Only the creator can delete their challenge.
CREATE POLICY "challenges_delete"
  ON public.challenges FOR DELETE
  USING (auth.uid() = creator_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. challenge_participants
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id     uuid        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  current_progress numeric     NOT NULL DEFAULT 0,
  completed        boolean     NOT NULL DEFAULT false,
  joined_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT challenge_participants_unique_pair UNIQUE (challenge_id, user_id)
);

COMMENT ON TABLE public.challenge_participants IS 'Tracks who joined a challenge and their progress.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id ON public.challenge_participants (challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id     ON public.challenge_participants (user_id);

-- RLS
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Participants are visible to anyone (leaderboard within a challenge).
CREATE POLICY "challenge_participants_select"
  ON public.challenge_participants FOR SELECT
  USING (true);

-- Users can join challenges themselves.
CREATE POLICY "challenge_participants_insert"
  ON public.challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own progress.
CREATE POLICY "challenge_participants_update"
  ON public.challenge_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can leave (delete) their own participation.
CREATE POLICY "challenge_participants_delete"
  ON public.challenge_participants FOR DELETE
  USING (auth.uid() = user_id);
