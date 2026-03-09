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

  if (!error) return (data ?? []) as LeaderboardEntry[];

  // Fallback: fetch from user_xp + profiles directly if RPC doesn't exist
  console.warn('[Leaderboard] RPC failed, using fallback:', error.message);

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('user_xp')
    .select('user_id, total_xp, current_level')
    .order('total_xp', { ascending: false })
    .limit(limit);

  if (fallbackError) throw fallbackError;
  if (!fallbackData || fallbackData.length === 0) return [];

  // Fetch profiles for these users
  const userIds = fallbackData.map((d) => d.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return fallbackData.map((entry, idx) => {
    const profile = profileMap.get(entry.user_id);
    return {
      user_id: entry.user_id,
      username: profile?.username ?? 'Unknown',
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      current_level: entry.current_level,
      value: entry.total_xp,
      rank: idx + 1,
    };
  });
}
