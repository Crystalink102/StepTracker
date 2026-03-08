import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { Pedometer } from 'expo-sensors';
import { AppState } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import * as StepService from '@/src/services/step.service';
import * as AchievementService from '@/src/services/achievement.service';
import { xpFromSteps } from '@/src/utils/xp-calculator';
import { enqueue } from '@/src/services/offline-queue';
import { getTodayString } from '@/src/utils/date-helpers';
import { STEP_SYNC_INTERVAL_MS } from '@/src/constants/config';

type StepContextValue = {
  todaySteps: number;
  isAvailable: boolean;
  isTracking: boolean;
};

const StepContext = createContext<StepContextValue>({
  todaySteps: 0,
  isAvailable: false,
  isTracking: false,
});

export function StepProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [todaySteps, setTodaySteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const lastSyncedSteps = useRef(0);
  const todayStepsRef = useRef(0);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const lastAchievementCheck = useRef(0);

  // Check pedometer availability
  useEffect(() => {
    Pedometer.isAvailableAsync().then(setIsAvailable);
  }, []);

  // Sync steps to Supabase
  const syncSteps = useCallback(
    async (steps: number) => {
      if (!user || steps === lastSyncedSteps.current) return;
      try {
        const xp = xpFromSteps(steps);
        await StepService.updateStepCount(user.id, steps, xp);
        lastSyncedSteps.current = steps;

        // Check achievements every 5000 steps
        if (steps - lastAchievementCheck.current >= 5000) {
          lastAchievementCheck.current = steps;
          AchievementService.checkAchievements(user.id, {
            todaySteps: steps,
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('[StepContext] Sync failed, queuing offline:', err);
        enqueue({
          table: 'daily_steps',
          operation: 'upsert',
          data: {
            user_id: user.id,
            date: getTodayString(),
            step_count: steps,
            xp_earned: xpFromSteps(steps),
          },
          onConflict: 'user_id,date',
        }).catch(() => {});
      }
    },
    [user]
  );

  // Load today's saved steps on mount
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const loadSavedSteps = async () => {
      try {
        const record = await StepService.getTodaySteps(user.id);
        if (record.step_count > 0) {
          setTodaySteps(record.step_count);
          lastSyncedSteps.current = record.step_count;
        }
      } catch (err) {
        console.warn('[StepContext] Failed to load saved steps:', err);
      }
    };

    loadSavedSteps();
  }, [user, isAuthenticated]);

  // Subscribe to pedometer
  useEffect(() => {
    if (!isAvailable) return;

    // Get steps since midnight
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    Pedometer.getStepCountAsync(start, new Date()).then((result) => {
      setTodaySteps((prev) => Math.max(prev, result.steps));
    });

    // Watch for new steps
    const subscription = Pedometer.watchStepCount((result) => {
      setTodaySteps((prev) => prev + result.steps);
      setIsTracking(true);
    });

    return () => subscription.remove();
  }, [isAvailable]);

  // Keep ref in sync with state for use in intervals/callbacks
  useEffect(() => {
    todayStepsRef.current = todaySteps;
  }, [todaySteps]);

  // Keep syncSteps ref in sync for stable interval/callback references
  const syncStepsRef = useRef(syncSteps);
  useEffect(() => {
    syncStepsRef.current = syncSteps;
  }, [syncSteps]);

  // Periodic sync to Supabase (stable interval, no re-creation)
  useEffect(() => {
    if (!isAuthenticated) return;

    syncIntervalRef.current = setInterval(() => {
      syncStepsRef.current(todayStepsRef.current);
    }, STEP_SYNC_INTERVAL_MS);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isAuthenticated]);

  // Sync on app background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        syncStepsRef.current(todayStepsRef.current);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <StepContext.Provider value={{ todaySteps, isAvailable, isTracking }}>
      {children}
    </StepContext.Provider>
  );
}

export function useSteps() {
  return useContext(StepContext);
}
