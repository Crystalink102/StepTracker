-- Add Strava-like fields to activities table
ALTER TABLE activities ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS perceived_effort smallint CHECK (perceived_effort >= 1 AND perceived_effort <= 10);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS privacy text NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'private'));
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_subtype text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS gear_id uuid;

-- Create gear table for shoe/equipment tracking
CREATE TABLE IF NOT EXISTS gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  type text NOT NULL DEFAULT 'shoes' CHECK (type IN ('shoes', 'watch', 'other')),
  distance_meters double precision NOT NULL DEFAULT 0,
  max_distance_meters double precision,
  is_retired boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FK from activities.gear_id to gear.id
ALTER TABLE activities ADD CONSTRAINT activities_gear_id_fkey
  FOREIGN KEY (gear_id) REFERENCES gear(id) ON DELETE SET NULL;

-- RLS for gear
ALTER TABLE gear ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gear"
  ON gear FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gear"
  ON gear FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gear"
  ON gear FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gear"
  ON gear FOR DELETE USING (auth.uid() = user_id);

-- Index for fast gear lookups
CREATE INDEX IF NOT EXISTS idx_gear_user_id ON gear(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_is_favorite ON activities(user_id, is_favorite) WHERE is_favorite = true;
