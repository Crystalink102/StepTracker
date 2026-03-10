import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import * as LeaderboardService from '@/src/services/leaderboard.service';
import { LeaderboardEntry } from '@/src/types/database';

export type { LeaderboardMetric, LeaderboardPeriod, LeaderboardScope } from '@/src/services/leaderboard.service';

export function useLeaderboard() {
  const { user } = useAuth();
  const [metric, setMetric] = useState<LeaderboardService.LeaderboardMetric>('xp');
  const [period, setPeriod] = useState<LeaderboardService.LeaderboardPeriod>('all_time');
  const [scope, setScope] = useState<LeaderboardService.LeaderboardScope>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      let filterUserIds: string[] | undefined;

      if (scope === 'friends' && user?.id) {
        const friendIds = await LeaderboardService.getFriendIds(user.id);
        // Include the current user + their friends
        filterUserIds = [user.id, ...friendIds];
      }

      const data = await LeaderboardService.getLeaderboard(metric, period, 50, filterUserIds);
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [metric, period, scope, user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const myRank = useMemo(
    () => user ? entries.find((e) => e.user_id === user.id)?.rank ?? null : null,
    [entries, user]
  );

  return {
    metric,
    setMetric,
    period,
    setPeriod,
    scope,
    setScope,
    entries,
    myRank,
    isLoading,
    refresh,
  };
}
