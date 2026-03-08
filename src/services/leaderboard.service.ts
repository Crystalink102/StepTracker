import { supabase } from './supabase';
import { LeaderboardEntry } from '@/src/types/database';

export type LeaderboardMetric = 'xp' | 'steps' | 'streak';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

export async function getLeaderboard(
  metric: LeaderboardMetric = 'xp',
  period: LeaderboardPeriod = 'all_time',
  limit = 50
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_leaderboard', {
    time_period: period,
    metric,
    result_limit: limit,
  });

  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}
