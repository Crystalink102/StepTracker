import { supabase } from './supabase';
import { STANDARD_DISTANCES } from '@/src/constants/config';
import { Activity, PersonalBest } from '@/src/types/database';
import { haversineDistance } from '@/src/utils/geo';

type TimedWaypoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
};

/**
 * Get all personal bests for a user.
 */
export async function getPersonalBests(userId: string) {
  const { data, error } = await supabase
    .from('personal_bests')
    .select('*')
    .eq('user_id', userId)
    .order('distance_meters', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Calculate the actual time to cover a target distance using GPS waypoints.
 * Walks through waypoints accumulating distance until the target is reached,
 * then returns the elapsed time from the first waypoint to that point.
 * Falls back to proportional calculation if waypoints aren't available.
 */
function segmentTimeFromWaypoints(
  waypoints: TimedWaypoint[],
  targetDistance: number,
  totalDistance: number,
  totalDuration: number
): number {
  if (waypoints.length < 2) {
    // Fallback: proportional estimate
    return Math.round((targetDistance / totalDistance) * totalDuration);
  }

  let accumulated = 0;
  const startTime = new Date(waypoints[0].timestamp).getTime();

  for (let i = 1; i < waypoints.length; i++) {
    const dist = haversineDistance(
      waypoints[i - 1].latitude,
      waypoints[i - 1].longitude,
      waypoints[i].latitude,
      waypoints[i].longitude
    );
    accumulated += dist;

    if (accumulated >= targetDistance) {
      // Interpolate the exact time when target distance was crossed
      const overshoot = accumulated - targetDistance;
      const segmentDist = dist;
      const prevTime = new Date(waypoints[i - 1].timestamp).getTime();
      const currTime = new Date(waypoints[i].timestamp).getTime();
      const segmentTime = currTime - prevTime;

      // How far into this segment did we hit the target?
      const ratio = segmentDist > 0 ? (segmentDist - overshoot) / segmentDist : 1;
      const hitTime = prevTime + segmentTime * ratio;

      return Math.round((hitTime - startTime) / 1000);
    }
  }

  // Didn't reach target distance with waypoints (GPS inaccuracy)
  // Fall back to proportional
  return Math.round((targetDistance / totalDistance) * totalDuration);
}

/**
 * Check if an activity sets any new personal bests.
 * Uses actual waypoint segment times when available for accuracy.
 * Returns array of new PBs.
 */
export async function checkPersonalBests(
  userId: string,
  activity: Activity,
  waypoints?: TimedWaypoint[]
): Promise<{ label: string; isNew: boolean; previousSeconds?: number }[]> {
  const results: { label: string; isNew: boolean; previousSeconds?: number }[] = [];

  // Get existing PBs
  const currentPBs = await getPersonalBests(userId);
  const pbMap = new Map(currentPBs.map((pb) => [pb.distance_label, pb]));

  // Check each standard distance
  for (const [label, distanceM] of Object.entries(STANDARD_DISTANCES)) {
    // Activity must cover at least this distance
    if (activity.distance_meters < distanceM) continue;

    // Use waypoint-based segment time if available, otherwise proportional
    const timeForDistance = waypoints && waypoints.length >= 2
      ? segmentTimeFromWaypoints(waypoints, distanceM, activity.distance_meters, activity.duration_seconds)
      : Math.round((distanceM / activity.distance_meters) * activity.duration_seconds);

    const existing = pbMap.get(label);

    if (!existing || timeForDistance < existing.best_time_seconds) {
      // New PB!
      await upsertPersonalBest(
        userId,
        label,
        distanceM,
        timeForDistance,
        activity.id,
        activity.started_at
      );

      results.push({
        label,
        isNew: true,
        previousSeconds: existing?.best_time_seconds,
      });
    }
  }

  return results;
}

/**
 * Insert or update a personal best.
 */
async function upsertPersonalBest(
  userId: string,
  distanceLabel: string,
  distanceMeters: number,
  bestTimeSeconds: number,
  activityId: string,
  achievedAt: string
) {
  const { error } = await supabase
    .from('personal_bests')
    .upsert(
      {
        user_id: userId,
        distance_label: distanceLabel,
        distance_meters: distanceMeters,
        best_time_seconds: bestTimeSeconds,
        activity_id: activityId,
        achieved_at: achievedAt,
      },
      { onConflict: 'user_id,distance_label' }
    );

  if (error) throw error;
}
