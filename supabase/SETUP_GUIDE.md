# Supabase Setup Guide

## Step 1: Create a Supabase Project
1. Go to https://supabase.com and sign in (or create an account)
2. Click "New Project"
3. Choose your organization (or create one)
4. Fill in:
   - **Project name:** StepTracker
   - **Database password:** Choose a strong password (save this somewhere!)
   - **Region:** Pick the closest to you
5. Click "Create new project" and wait for it to spin up (~2 minutes)

## Step 2: Get Your API Keys
1. Go to **Project Settings** (gear icon in sidebar) > **API**
2. Copy these two values:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon/public key** (the long string under "Project API keys")
3. Paste them into `src/constants/config.ts`:
   ```ts
   export const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
   export const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
   ```

## Step 3: Run the Database Migration
1. In the Supabase dashboard, go to **SQL Editor** (sidebar)
2. Click "New Query"
3. Copy the ENTIRE contents of `supabase/migration.sql` and paste it
4. Click "Run" (or Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned" - that's good!

## Step 4: Create the Avatars Storage Bucket
1. Go to **Storage** (sidebar)
2. Click "Create a new bucket"
3. Settings:
   - **Name:** `avatars`
   - **Public:** OFF (unchecked)
   - **File size limit:** 5242880 (5MB)
   - **Allowed MIME types:** `image/png, image/jpeg, image/webp`
4. Click "Create bucket"
5. Now go back to **SQL Editor** and run the storage policies (the commented-out section at the bottom of migration.sql - uncomment them first)

## Step 5: Enable MFA (TOTP)
1. Go to **Authentication** (sidebar) > **Configuration** > **Multi-Factor Authentication**
2. Toggle ON "Enable Multi-Factor Authentication"
3. Make sure "TOTP" is enabled

## Step 6: Configure Auth Settings
1. Still in **Authentication** > **Configuration** > **General**
2. Set "Minimum password length" to 8
3. Under **Email**, make sure "Enable Email Signup" is ON
4. Under **Phone**, enable phone auth if you want phone number signup

## Verify It Worked
Go to **Table Editor** in the sidebar. You should see these tables:
- profiles
- user_xp
- xp_ledger
- daily_steps
- activities
- activity_waypoints
- personal_bests

If you see all of them, you're good to go!
