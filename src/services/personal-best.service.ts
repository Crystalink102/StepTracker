import { supabase } from './supabase';
import { STANDARD_DISTANCES } from '@/src/constants/config';
import { Activity, PersonalBest } from '@/src/types/database';

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
 * Check if an activity sets any new personal bests.
 * Returns array of new PBs.
 */
export async function checkPersonalBests(
  userId: string,
  activity: Activity
): Promise<{ label: string; isNew: boolean; previousSeconds?: number }[]> {
  const results: { label: string; isNew: boolean; previousSeconds?: number }[] = [];

  // Get existing PBs
  const currentPBs = await getPersonalBests(userId);
  const pbMap = new Map(currentPBs.map((pb) => [pb.distance_label, pb]));

  // Check each standard distance
  for (const [label, distanceM] of Object.entries(STANDARD_DISTANCES)) {
    // Activity must cover at least this distance
    if (activity.distance_meters < distanceM) continue;

    // Calculate time for this distance segment (proportional)
    const timeForDistance = Math.round(
      (distanceM / activity.distance_meters) * activity.duration_seconds
    );

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
