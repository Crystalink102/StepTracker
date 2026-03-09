import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import * as XPService from '@/src/services/xp.service';
import {
  levelProgress,
  xpToNextLevel,
  xpForLevel,
} from '@/src/utils/xp-calculator';

export function useXP() {
  const { user } = useAuth();
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const progress = levelProgress(totalXP);
  const xpRemaining = xpToNextLevel(totalXP);
  const xpNeeded = xpForLevel(level);

  const refresh = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await XPService.getUserXP(user.id);
      setTotalXP(data.total_xp);
      setLevel(data.current_level);
    } catch (err) {
      console.warn('[useXP] Failed to load XP data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTotalXP(0);
      setLevel(1);
      setIsLoading(false);
      return;
    }

    refresh();

    // Refresh XP every 15s so the card stays in sync with step awards
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh, user]);

  const addXP = useCallback(
    async (
      amount: number,
      source: 'steps' | 'activity' | 'bonus',
      sourceId?: string,
      description?: string
    ) => {
      if (!user) return null;
      const result = await XPService.addXP(
        user.id,
        amount,
        source,
        sourceId,
        description
      );
      setTotalXP(result.totalXP);
      setLevel(result.level);
      return result;
    },
    [user]
  );

  return {
    totalXP,
    level,
    progress,
    xpRemaining,
    xpNeeded,
    isLoading,
    addXP,
    refresh,
  };
}
