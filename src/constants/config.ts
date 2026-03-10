// Supabase config - replace with your project values
export const SUPABASE_URL = 'https://lojziqosoydwbxqkfuod.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvanppcW9zb3lkd2J4cWtmdW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzkwMjUsImV4cCI6MjA4ODUxNTAyNX0.oZbE_W8kbV0ChM5j87i-WVzFdC7T6BLnUSEPIqeglCY';

// XP System
export const XP_POWER = 1.68;
export const XP_BASE = 50; // Level 1 = 50 XP (50 steps → level 2)

// Heart Rate XP Multiplier
export const HR_BASELINE = 85; // BPM - no bonus at this rate
export const HR_XP_PER_BPM = 0.1; // Extra XP per step per BPM above baseline

// Auto HR unlock level
export const AUTO_HR_UNLOCK_LEVEL = 3;

// Step tracking
export const STEP_SYNC_INTERVAL_MS = 60_000; // Sync steps to Supabase every 60s
export const STEPS_PER_XP = 1; // 1 XP per step — feels rewarding, levels scale up

// Background location
export const LOCATION_UPDATE_INTERVAL_MS = 3_000;
export const LOCATION_DISTANCE_FILTER_M = 5; // Min meters between updates

// Standard distances for personal bests (in meters)
// Ordered short → long for display
export const STANDARD_DISTANCES = {
  '100m': 100,
  '200m': 200,
  '400m': 400,
  '800m': 800,
  '1K': 1_000,
  '1 Mile': 1_609,
  '2 Mile': 3_219,
  '5K': 5_000,
  '10K': 10_000,
  'Half Marathon': 21_097,
  'Marathon': 42_195,
} as const;
