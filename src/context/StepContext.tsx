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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/context/AuthContext';
import * as StepService from '@/src/services/step.service';
import * as XPService from '@/src/services/xp.service';
import * as AchievementService from '@/src/services/achievement.service';
import { xpFromSteps } from '@/src/utils/xp-calculator';
import { enqueue } from '@/src/services/offline-queue';
import { getTodayString } from '@/src/utils/date-helpers';
import { STEP_SYNC_INTERVAL_MS } from '@/src/constants/config';

const LAST_SYNCED_KEY = 'step_last_synced_steps';
const LAST_SYNCED_DATE_KEY = 'step_last_synced_date';

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
  const catchUpDone = useRef(false);

  // Check pedometer availability
  useEffect(() => {
    Pedometer.isAvailableAsync().then(setIsAvailable);
  }, []);

  // Sync steps to Supabase and award XP for new steps
  const syncSteps = useCallback(
    async (steps: number) => {
      if (!user || steps <= 0 || steps === lastSyncedSteps.current) return;
      // Don't sync until catch-up has run to avoid double-counting
      if (!catchUpDone.current) return;

      try {
        const totalXP = xpFromSteps(steps);
        await StepService.updateStepCount(user.id, steps, totalXP);

        // Award XP for the delta (new steps since last sync)
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

        // Persist sync state so we survive app restarts
        AsyncStorage.setItem(LAST_SYNCED_KEY, String(steps)).catch(() => {});
        AsyncStorage.setItem(LAST_SYNCED_DATE_KEY, getTodayString()).catch(() => {});

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

  // Reset state on logout / user change, and load saved steps + catch-up XP
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
        // Restore persisted sync state for today
        const [savedSyncStr, savedDate] = await Promise.all([
          AsyncStorage.getItem(LAST_SYNCED_KEY),
          AsyncStorage.getItem(LAST_SYNCED_DATE_KEY),
        ]);

        const record = await StepService.getTodaySteps(user.id);
        const dbSteps = record.step_count;

        if (dbSteps > 0) {
          setTodaySteps(dbSteps);
        }

        // If we have a persisted sync value from today, use it;
        // otherwise use the DB value (handles app restart correctly)
        if (savedDate === getTodayString() && savedSyncStr) {
          lastSyncedSteps.current = parseInt(savedSyncStr, 10) || dbSteps;
        } else {
          lastSyncedSteps.current = dbSteps;
        }

        // XP Catch-up: compare steps-source XP in ledger vs expected from total steps.
        // This only uses 'steps' source XP, not activity/bonus, to avoid miscounting.
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
      } catch (err) {
        console.warn('[StepContext] Failed to load saved steps:', err);
      } finally {
        // Mark catch-up as done so periodic sync can start awarding XP
        catchUpDone.current = true;
      }
    };

    loadSavedSteps();
  }, [user, isAuthenticated]);

  // Subscribe to pedometer
  useEffect(() => {
    if (!isAvailable) return;

    // Get steps since midnight as our baseline
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    // Establish the baseline BEFORE subscribing to watch, so incremental
    // deltas from watchStepCount are added on top of the correct total.
    let baselineSteps = 0;
    let baselineSet = false;

    Pedometer.getStepCountAsync(start, new Date())
      .then((result) => {
        baselineSteps = result.steps;
        baselineSet = true;
        setTodaySteps((prev) => Math.max(prev, baselineSteps));
      })
      .catch(() => {});

    // Watch for new steps — only adds steps that arrive AFTER getStepCountAsync
    const subscription = Pedometer.watchStepCount((result) => {
      if (!baselineSet) return; // Don't add deltas until baseline is established
      setTodaySteps((prev) => prev + result.steps);
      setIsTracking(true);
    });

    return () => subscription.remove();
  }, [isAvailable]);

  // Detect midnight rollover and reset step count for the new day
  const currentDateRef = useRef(getTodayString());
  useEffect(() => {
    const checkDate = () => {
      const now = getTodayString();
      if (now !== currentDateRef.current) {
        currentDateRef.current = now;
        // New day — reset steps and sync state
        setTodaySteps(0);
        lastSyncedSteps.current = 0;
        catchUpDone.current = false;
        AsyncStorage.setItem(LAST_SYNCED_DATE_KEY, now).catch(() => {});
        AsyncStorage.setItem(LAST_SYNCED_KEY, '0').catch(() => {});
      }
    };
    // Check every 30s for date change
    const interval = setInterval(checkDate, 30_000);
    // Also check when app comes to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkDate();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

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
