import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import * as ChallengeService from '@/src/services/challenge.service';
import type { ChallengeWithParticipants } from '@/src/services/challenge.service';
import type { Challenge } from '@/src/types/database';

type CreateChallengeInput = {
  title: string;
  description?: string;
  type: Challenge['type'];
  target_value: number;
  start_date: string;
  end_date: string;
};

export function useChallenges() {
  const { user } = useAuth();
  const [activeChallenges, setActiveChallenges] = useState<ChallengeWithParticipants[]>([]);
  const [availableChallenges, setAvailableChallenges] = useState<ChallengeWithParticipants[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [active, available] = await Promise.all([
        ChallengeService.getActiveChallenges(user.id),
        ChallengeService.getAvailableChallenges(user.id),
      ]);
      setActiveChallenges(active);
      setAvailableChallenges(available);
    } catch (err) {
      console.warn('[useChallenges] Failed to load:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateChallengeInput) => {
      if (!user) return null;
      const challenge = await ChallengeService.createChallenge(user.id, input);
      if (challenge) await refresh();
      return challenge;
    },
    [user, refresh]
  );

  const join = useCallback(
    async (challengeId: string) => {
      if (!user) return false;
      const ok = await ChallengeService.joinChallenge(user.id, challengeId);
      if (ok) await refresh();
      return ok;
    },
    [user, refresh]
  );

  const leave = useCallback(
    async (challengeId: string) => {
      if (!user) return false;
      const ok = await ChallengeService.leaveChallenge(user.id, challengeId);
      if (ok) await refresh();
      return ok;
    },
    [user, refresh]
  );

  const update = useCallback(
    async (challengeId: string, updates: { title?: string; description?: string; target_value?: number; end_date?: string }) => {
      const ok = await ChallengeService.updateChallenge(challengeId, updates);
      if (ok) await refresh();
      return ok;
    },
    [refresh]
  );

  return {
    activeChallenges,
    availableChallenges,
    isLoading,
    create,
    join,
    leave,
    update,
    refresh,
  };
}
