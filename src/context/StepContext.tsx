import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/context/AuthContext';
import * as StepService from '@/src/services/step.service';
import * as XPService from '@/src/services/xp.service';
import * as AchievementService from '@/src/services/achievement.service';
import * as HealthService from '@/src/services/health.service';
import { xpFromSteps } from '@/src/utils/xp-calculator';
import { enqueue } from '@/src/services/offline-queue';
import { getTodayString } from '@/src/utils/date-helpers';
import { STEP_SYNC_INTERVAL_MS } from '@/src/constants/config';

const LAST_SYNCED_KEY = 'step_last_synced_steps';
const LAST_SYNCED_DATE_KEY = 'step_last_synced_date';

type StepSource = 'health-connect' | 'healthkit' | 'pedometer' | 'none';

type StepContextValue = {
  todaySteps: number;
  isAvailable: boolean;
  isTracking: boolean;
  stepSource: StepSource;
};

const StepContext = createContext<StepContextValue>({
  todaySteps: 0,
  isAvailable: false,
  isTracking: false,
  stepSource: 'none',
});

export function StepProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [todaySteps, setTodaySteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [stepSource, setStepSource] = useState<StepSource>('none');
  const lastSyncedSteps = useRef(0);
  const todayStepsRef = useRef(0);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const lastAchievementCheck = useRef(0);
  const catchUpDone = useRef(false);

  // Initialize best available health platform.
  // Depends on isAuthenticated so it re-runs after login (fixes race condition
  // where health init completes before user logs in, or vice versa).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!isAuthenticated) return;

    HealthService.initHealth()
      .then((source) => {
        setStepSource(source);
        setIsAvailable(source !== 'none');
      })
      .catch(() => {
        setStepSource('none');
        setIsAvailable(false);
      });
  }, [isAuthenticated]);

  // Sync steps to Supabase and award XP for new steps
  const syncSteps = useCallback(
    async (steps: number) => {
      if (!user || steps <= 0 || steps === lastSyncedSteps.current) return;
      if (!catchUpDone.current) return;

      try {
        const totalXP = xpFromSteps(steps);
        await StepService.updateStepCount(user.id, steps, totalXP);

        const delta = steps - lastSyncedSteps.current;
        if (delta > 0) {
          const xpDelta = xpFromSteps(delta);
          if (xpDelta > 0) {
            try {
              await XPService.addXP(
                user.id,
                xpDelta,
                'steps',
                undefined,
                `${delta.toLocaleString()} steps`
              );
            } catch (xpErr) {
              console.warn('[StepContext] XP award failed:', xpErr);
            }
          }
        }

        lastSyncedSteps.current = steps;

        AsyncStorage.setItem(LAST_SYNCED_KEY, String(steps)).catch(() => {});
        AsyncStorage.setItem(LAST_SYNCED_DATE_KEY, getTodayString()).catch(() => {});

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

  // Load saved steps from DB on login
  useEffect(() => {
    if (!user || !isAuthenticated) {
      setTodaySteps(0);
      setIsTracking(false);
      lastSyncedSteps.current = 0;
      lastAchievementCheck.current = 0;
      catchUpDone.current = false;
      return;
    }

    const loadSavedSteps = async () => {
      try {
        const [savedSyncStr, savedDate] = await Promise.all([
          AsyncStorage.getItem(LAST_SYNCED_KEY),
          AsyncStorage.getItem(LAST_SYNCED_DATE_KEY),
        ]);

        const record = await StepService.getTodaySteps(user.id);
        const dbSteps = record.step_count;

        if (dbSteps > 0) {
          setTodaySteps(dbSteps);
        }

        if (savedDate === getTodayString() && savedSyncStr) {
          lastSyncedSteps.current = parseInt(savedSyncStr, 10) || dbSteps;
        } else {
          lastSyncedSteps.current = dbSteps;
        }
      } catch (err) {
        console.warn('[StepContext] Failed to load saved steps:', err);
      } finally {
        catchUpDone.current = true;
      }
    };

    loadSavedSteps();

    // XP catch-up (non-blocking, delayed)
    const xpCatchUp = async () => {
      try {
        const stepsXPAwarded = await XPService.getXPBySource(user.id, 'steps');
        const history = await StepService.getStepHistory(user.id, '2020-01-01', getTodayString());
        const totalSteps = history.reduce((sum, d) => sum + d.step_count, 0);
        const expectedStepsXP = xpFromSteps(totalSteps);
        const gap = expectedStepsXP - stepsXPAwarded;
        if (gap > 0) {
          await XPService.addXP(
            user.id,
            gap,
            'steps',
            undefined,
            `Step XP catch-up (${totalSteps.toLocaleString()} total steps)`
          );
        }
      } catch (xpErr) {
        console.warn('[StepContext] XP catch-up failed:', xpErr);
      }
    };

    const xpTimer = setTimeout(xpCatchUp, 5000);
    return () => clearTimeout(xpTimer);
  }, [user, isAuthenticated]);

  // Poll steps from the best available health source.
  // Priority: Health Connect (Android) > HealthKit (iOS) > raw Pedometer > none
  useEffect(() => {
    if (!isAvailable || Platform.OS === 'web') return;

    const poll = async () => {
      const data = await HealthService.getTodaySteps();
      if (data.steps >= 0) {
        // Use the health platform value as the source of truth.
        // Only go up — never decrease the count mid-day (health sync lag).
        setTodaySteps((prev) => Math.max(prev, data.steps));
        setIsTracking(true);
      }
    };

    // Initial fetch + poll every 5 seconds
    poll();
    const interval = setInterval(poll, 5000);

    return () => clearInterval(interval);
  }, [isAvailable]);

  // Midnight rollover
  const currentDateRef = useRef(getTodayString());
  useEffect(() => {
    const checkDate = () => {
      const now = getTodayString();
      if (now !== currentDateRef.current) {
        currentDateRef.current = now;
        setTodaySteps(0);
        lastSyncedSteps.current = 0;
        catchUpDone.current = false;
        AsyncStorage.setItem(LAST_SYNCED_DATE_KEY, now).catch(() => {});
        AsyncStorage.setItem(LAST_SYNCED_KEY, '0').catch(() => {});
      }
    };
    const interval = setInterval(checkDate, 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkDate();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  // Keep refs in sync
  useEffect(() => {
    todayStepsRef.current = todaySteps;
  }, [todaySteps]);

  const syncStepsRef = useRef(syncSteps);
  useEffect(() => {
    syncStepsRef.current = syncSteps;
  }, [syncSteps]);

  // Periodic sync to Supabase
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
    <StepContext.Provider value={{ todaySteps, isAvailable, isTracking, stepSource }}>
      {children}
    </StepContext.Provider>
  );
}

export function useSteps() {
  return useContext(StepContext);
}
