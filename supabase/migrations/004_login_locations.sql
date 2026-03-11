-- Login location tracking table
-- Stores IP-based location for each login to detect suspicious activity
CREATE TABLE IF NOT EXISTS login_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_new_location BOOLEAN DEFAULT FALSE,
  email TEXT, -- cached for trigger use
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups by user
CREATE INDEX IF NOT EXISTS idx_login_locations_user_id ON login_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_login_locations_created_at ON login_locations(created_at DESC);

-- RLS: users can only see/insert their own login records
ALTER TABLE login_locations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'login_locations' AND policyname = 'Users can view own login locations'
  ) THEN
    CREATE POLICY "Users can view own login locations"
      ON login_locations FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'login_locations' AND policyname = 'Users can insert own login locations'
  ) THEN
    CREATE POLICY "Users can insert own login locations"
      ON login_locations FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
