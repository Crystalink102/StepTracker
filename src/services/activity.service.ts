import { supabase } from './supabase';
import { Activity, Gear } from '@/src/types/database';

/**
 * Create a new activity.
 */
export async function createActivity(
  userId: string,
  type: 'run' | 'walk'
): Promise<Activity> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('activities')
    .insert({
      user_id: userId,
      type,
      status: 'active',
      started_at: now,
      duration_seconds: 0,
      distance_meters: 0,
      xp_earned: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create activity: ${error.message}`);
  }
  return data;
}

/**
 * Update an activity (pause, resume, complete).
 */
export async function updateActivity(
  activityId: string,
  updates: {
    status?: string;
    ended_at?: string;
    duration_seconds?: number;
    distance_meters?: number;
    avg_pace_seconds_per_km?: number | null;
    avg_heart_rate?: number | null;
    hr_source?: string | null;
    calories_estimate?: number | null;
    xp_earned?: number;
    name?: string | null;
    description?: string | null;
    perceived_effort?: number | null;
    is_favorite?: boolean;
    privacy?: string;
    activity_subtype?: string | null;
    gear_id?: string | null;
  }
): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .update(updates)
    .eq('id', activityId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Save waypoints for an activity.
 */
export async function saveWaypoints(
  activityId: string,
  waypoints: {
    latitude: number;
    longitude: number;
    altitude?: number | null;
    speed?: number | null;
    timestamp: string;
    order_index: number;
  }[]
) {
  if (waypoints.length === 0) return;

  const rows = waypoints.map((wp) => ({
    activity_id: activityId,
    ...wp,
  }));

  const { error } = await supabase
    .from('activity_waypoints')
    .insert(rows);

  if (error) throw error;
}

/**
 * Get a completed activity with its waypoints.
 */
export async function getActivityWithWaypoints(activityId: string) {
  const [activityResult, waypointsResult] = await Promise.all([
    supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single(),
    supabase
      .from('activity_waypoints')
      .select('*')
      .eq('activity_id', activityId)
      .order('order_index', { ascending: true }),
  ]);

  if (activityResult.error) throw activityResult.error;
  if (waypointsResult.error) throw waypointsResult.error;

  return {
    activity: activityResult.data,
    waypoints: waypointsResult.data ?? [],
  };
}

/**
 * Get user's activity history.
 */
export async function getActivityHistory(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get simplified waypoints (lat/lng only) for multiple activities in one query.
 * Returns a map of activityId → coordinate array.
 */
export async function getRoutesForActivities(
  activityIds: string[]
): Promise<Record<string, { latitude: number; longitude: number }[]>> {
  if (activityIds.length === 0) return {};

  const { data, error } = await supabase
    .from('activity_waypoints')
    .select('activity_id, latitude, longitude, order_index')
    .in('activity_id', activityIds)
    .order('order_index', { ascending: true });

  if (error) throw error;

  const routes: Record<string, { latitude: number; longitude: number }[]> = {};
  for (const wp of data ?? []) {
    if (!routes[wp.activity_id]) routes[wp.activity_id] = [];
    routes[wp.activity_id].push({
      latitude: wp.latitude,
      longitude: wp.longitude,
    });
  }

  // Downsample long routes to max ~100 points per activity for mini maps
  for (const id of Object.keys(routes)) {
    const coords = routes[id];
    if (coords.length > 100) {
      const step = Math.ceil(coords.length / 100);
      routes[id] = coords.filter((_, i) => i % step === 0 || i === coords.length - 1);
    }
  }

  return routes;
}

/**
 * Get any currently active activity.
 */
export async function getActiveActivity(userId: string) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'paused'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Edit a saved activity's metadata (name, description, effort, etc.).
 */
export async function editActivity(
  activityId: string,
  edits: {
    name?: string | null;
    description?: string | null;
    perceived_effort?: number | null;
    privacy?: string;
    activity_subtype?: string | null;
    gear_id?: string | null;
  }
): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .update(edits)
    .eq('id', activityId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle favorite status on an activity.
 */
export async function toggleFavorite(activityId: string, current: boolean): Promise<boolean> {
  const newVal = !current;
  const { error } = await supabase
    .from('activities')
    .update({ is_favorite: newVal })
    .eq('id', activityId);

  if (error) throw error;
  return newVal;
}

/**
 * Delete an activity and its waypoints.
 */
export async function deleteActivity(activityId: string): Promise<void> {
  // Delete waypoints first (FK cascade should handle this, but be explicit)
  const { error: wpError } = await supabase
    .from('activity_waypoints')
    .delete()
    .eq('activity_id', activityId);

  if (wpError) console.warn('[Activity] Waypoint cleanup failed:', wpError.message);

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', activityId);

  if (error) throw error;
}

/**
 * Get user's favorite activities.
 */
export async function getFavoriteActivities(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .eq('is_favorite', true)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// ── Gear CRUD ──────────────────────────────────────────────────────────

/**
 * Get all gear for a user.
 */
export async function getGearList(userId: string): Promise<Gear[]> {
  const { data, error } = await supabase
    .from('gear')
    .select('*')
    .eq('user_id', userId)
    .order('is_retired', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Create a new piece of gear.
 */
export async function createGear(
  userId: string,
  gear: { name: string; brand?: string; type?: string; max_distance_meters?: number }
): Promise<Gear> {
  const { data, error } = await supabase
    .from('gear')
    .insert({ user_id: userId, ...gear })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update gear.
 */
export async function updateGear(
  gearId: string,
  updates: { name?: string; brand?: string; type?: string; max_distance_meters?: number | null; is_retired?: boolean; is_default?: boolean }
): Promise<Gear> {
  const { data, error } = await supabase
    .from('gear')
    .update(updates)
    .eq('id', gearId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete gear. Activities referencing it will have gear_id set to null (ON DELETE SET NULL).
 */
export async function deleteGear(gearId: string): Promise<void> {
  const { error } = await supabase
    .from('gear')
    .delete()
    .eq('id', gearId);

  if (error) throw error;
}

/**
 * Add distance to a gear item (called after completing an activity with gear assigned).
 */
export async function addDistanceToGear(gearId: string, distanceMeters: number): Promise<void> {
  // Use rpc or read-then-update pattern
  const { data: gear, error: fetchErr } = await supabase
    .from('gear')
    .select('distance_meters')
    .eq('id', gearId)
    .single();

  if (fetchErr) throw fetchErr;

  const { error } = await supabase
    .from('gear')
    .update({ distance_meters: (gear.distance_meters || 0) + distanceMeters })
    .eq('id', gearId);

  if (error) throw error;
}

/**
 * Get the user's default gear (for auto-assigning to new activities).
 */
export async function getDefaultGear(userId: string): Promise<Gear | null> {
  const { data, error } = await supabase
    .from('gear')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .eq('is_retired', false)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
