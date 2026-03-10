import { useState, useEffect, useCallback } from 'react';
import * as CustomGoalsService from '@/src/services/custom-goals.service';
import type { CustomGoal } from '@/src/services/custom-goals.service';

export function useCustomGoals() {
  const [goals, setGoals] = useState<CustomGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await CustomGoalsService.getGoals();
      setGoals(data);
    } catch (err) {
      console.warn('[useCustomGoals] Failed to load goals:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addGoal = useCallback(
    async (goal: Omit<CustomGoal, 'id' | 'progress' | 'completed' | 'created_at'>) => {
      const newGoal = await CustomGoalsService.saveGoal(goal);
      setGoals((prev) => [...prev, newGoal]);
      return newGoal;
    },
    []
  );

  const removeGoal = useCallback(async (id: string) => {
    await CustomGoalsService.deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  return { goals, isLoading, addGoal, removeGoal, refresh };
}
