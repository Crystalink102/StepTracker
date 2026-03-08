import { supabase } from './supabase';
import { Activity } from '@/src/types/database';

/**
 * Create a new activity.
 */
export async function createActivity(
  userId: string,
  type: 'run' | 'walk'
): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert({
      user_id: userId,
      type,
      status: 'active',
      started_at: new Date().toISOString(),
      duration_seconds: 0,
      distance_meters: 0,
      xp_earned: 0,
    })
    .select()
    .single();

  if (error) throw error;
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
    waypoints: waypointsResult.data,
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
    .single();

  if (error && error.code === 'PGRST116') return null; // No active activity
  if (error) throw error;
  return data;
}
