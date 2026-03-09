import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/src/context/AuthContext';
import { useXP } from '@/src/hooks/useXP';
import * as ActivityService from '@/src/services/activity.service';
import * as PBService from '@/src/services/personal-best.service';
import * as AchievementService from '@/src/services/achievement.service';
import {
  startBackgroundLocation,
  stopBackgroundLocation,
  setLocationCallback,
} from '@/src/tasks/background-location';
import { Platform } from 'react-native';
import { haversineDistance, paceSecondsPerKm } from '@/src/utils/geo';
import { xpFromActivity } from '@/src/utils/xp-calculator';
import { isPlausibleGPSMove, smoothedPace, caloriesFromActivity } from '@/src/utils/fitness';
import { enqueue } from '@/src/services/offline-queue';
import * as ProfileService from '@/src/services/profile.service';
import { Activity } from '@/src/types/database';

type Waypoint = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  timestamp: string;
};

type ActivityState = {
  currentActivity: Activity | null;
  isActive: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  distanceMeters: number;
  currentPaceSecPerKm: number;
  waypoints: Waypoint[];
  currentSpeed: number;
};

type ActivityActions = {
  startActivity: (type: 'run' | 'walk') => Promise<void>;
  pauseActivity: () => Promise<void>;
  resumeActivity: () => Promise<void>;
  stopActivity: (avgHeartRate?: number, hrSource?: 'manual' | 'auto') => Promise<Activity | null>;
};

type ActivityContextValue = ActivityState & ActivityActions;

const ActivityContext = createContext<ActivityContextValue | null>(null);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { addXP } = useXP();

  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [currentPaceSecPerKm, setCurrentPaceSecPerKm] = useState(0);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isStoppingRef = useRef(false);
  const lastWaypointRef = useRef<Waypoint | null>(null);
  const isActive = !!currentActivity && currentActivity.status !== 'completed';

  // Refs to avoid stale closures in the location callback.
  // handleLocation is registered as a global callback and can fire at any time -
  // without refs, it would capture stale isPaused/isActive values.
  const isPausedRef = useRef(isPaused);
  const isActiveRef = useRef(isActive);
  isPausedRef.current = isPaused;
  isActiveRef.current = isActive;

  // Timer for elapsed time
  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused]);

  // Location callback handler - uses refs for isPaused/isActive to avoid
  // recreating the callback (which would reset the GPS subscription).
  const handleLocation = useCallback(
    (location: Location.LocationObject) => {
      try {
        if (isPausedRef.current || !isActiveRef.current) return;
        if (!location?.coords) return;

        // Skip low-accuracy GPS readings
        // Relaxed thresholds: GPS accuracy varies widely by device, environment, and runtime
        // (Expo Go is less precise than standalone builds, indoors worse than outdoors)
        const maxAccuracy = Platform.OS === 'web' ? 100 : 50;
        if (location.coords.accuracy != null && location.coords.accuracy > maxAccuracy) return;

        const wp: Waypoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude,
          speed: location.coords.speed,
          timestamp: new Date(location.timestamp).toISOString(),
        };

        // Skip exact duplicate positions (browser cache or stale readings)
        const last = lastWaypointRef.current;
        if (
          last &&
          last.latitude === wp.latitude &&
          last.longitude === wp.longitude
        ) {
          return;
        }

        // Calculate distance from last waypoint using ref (avoids reading full array)
        if (last) {
          const dist = haversineDistance(
            last.latitude,
            last.longitude,
            wp.latitude,
            wp.longitude
          );

          // Velocity check: reject teleport-like jumps (>12 m/s = 43 km/h)
          const timeDelta =
            (new Date(wp.timestamp).getTime() -
              new Date(last.timestamp).getTime()) /
            1000;
          const velocity = timeDelta > 0 ? dist / timeDelta : 0;

          if (isPlausibleGPSMove(dist) && velocity <= 12 && isFinite(dist)) {
            setDistanceMeters((d) => d + dist);
          }
        }
        lastWaypointRef.current = wp;

        setWaypoints((prev) => [...prev, wp]);

        // Update current speed with smoothed pace
        if (location.coords.speed != null && location.coords.speed > 0) {
          const speedKmh = location.coords.speed * 3.6;
          setCurrentSpeed(speedKmh);
          setCurrentPaceSecPerKm((prev) => smoothedPace(speedKmh, prev));
        }
      } catch (err) {
        console.warn('[Activity] Location processing error:', err);
      }
    },
    [] // Stable callback - reads isPaused/isActive from refs
  );

  // Register/unregister location callback based on activity state
  useEffect(() => {
    if (isActive) {
      setLocationCallback(handleLocation);
    } else {
      setLocationCallback(null);
    }
    return () => setLocationCallback(null);
  }, [isActive, handleLocation]);

  // Reset all state on logout / user change
  useEffect(() => {
    if (!user) {
      if (isActive) {
        stopBackgroundLocation().catch(() => {});
      }
      setCurrentActivity(null);
      setElapsedSeconds(0);
      setDistanceMeters(0);
      setCurrentPaceSecPerKm(0);
      setWaypoints([]);
      setCurrentSpeed(0);
      setIsPaused(false);
      lastWaypointRef.current = null;
      isStoppingRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const startActivity = useCallback(
    async (type: 'run' | 'walk') => {
      if (!user) throw new Error('You must be logged in to start an activity.');

      // Clean up any orphaned active activities from previous failed starts
      try {
        const orphaned = await ActivityService.getActiveActivity(user.id);
        if (orphaned) {
          await ActivityService.updateActivity(orphaned.id, {
            status: 'completed',
            ended_at: new Date().toISOString(),
          }).catch(() => {});
        }
      } catch {
        // Ignore — no orphaned activity
      }

      // Start location FIRST — if GPS fails, don't create the activity
      await startBackgroundLocation();

      const activity = await ActivityService.createActivity(user.id, type);
      setCurrentActivity(activity);
      setElapsedSeconds(0);
      setDistanceMeters(0);
      setCurrentPaceSecPerKm(0);
      setWaypoints([]);
      setCurrentSpeed(0);
      setIsPaused(false);
      lastWaypointRef.current = null;
      isStoppingRef.current = false;
    },
    [user]
  );

  const pauseActivity = useCallback(async () => {
    if (!currentActivity) return;
    setIsPaused(true);
    await ActivityService.updateActivity(currentActivity.id, {
      status: 'paused',
      duration_seconds: elapsedSeconds,
      distance_meters: distanceMeters,
    });
  }, [currentActivity, elapsedSeconds, distanceMeters]);

  const resumeActivity = useCallback(async () => {
    if (!currentActivity) return;
    setIsPaused(false);
    await ActivityService.updateActivity(currentActivity.id, {
      status: 'active',
    });
  }, [currentActivity]);

  const stopActivity = useCallback(
    async (avgHeartRate?: number, hrSource?: 'manual' | 'auto') => {
      if (!currentActivity || !user) return null;

      // Prevent double-stop race condition
      if (isStoppingRef.current) return null;
      isStoppingRef.current = true;

      // Capture user.id now in case user becomes null during async ops
      const userId = user.id;

      try {
        await stopBackgroundLocation();

      const avgPace =
        distanceMeters > 0
          ? paceSecondsPerKm(distanceMeters, elapsedSeconds)
          : null;

      const xp = xpFromActivity(distanceMeters, elapsedSeconds, avgHeartRate);

      // Fetch user weight for MET-based calorie calculation
      let userWeight: number | null = null;
      try {
        const profile = await ProfileService.getProfile(userId);
        userWeight = profile.weight_kg;
      } catch (err) {
        console.warn('[Activity] Could not fetch profile for calorie calc, using default weight:', err);
      }
      const calories = caloriesFromActivity(
        distanceMeters,
        elapsedSeconds,
        userWeight,
        currentActivity.type as 'run' | 'walk'
      );

      const activityUpdate = {
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_seconds: elapsedSeconds,
        distance_meters: distanceMeters,
        avg_pace_seconds_per_km: avgPace ? Math.round(avgPace) : null,
        avg_heart_rate: avgHeartRate ?? null,
        hr_source: hrSource ?? null,
        calories_estimate: calories,
        xp_earned: xp,
      };

      let completed: Activity;
      try {
        completed = await ActivityService.updateActivity(currentActivity.id, activityUpdate);
      } catch (err) {
        console.warn('[Activity] Save failed, queuing offline:', err);
        await enqueue({
          table: 'activities',
          operation: 'update',
          data: activityUpdate,
          filter: { column: 'id', value: currentActivity.id },
        });
        // Use local data as the "completed" activity for state reset
        completed = { ...currentActivity, ...activityUpdate } as Activity;
      }

      // Save waypoints in chunks (queue offline if it fails)
      if (waypoints.length > 0) {
        const CHUNK_SIZE = 500;
        const waypointData = waypoints.map((wp, idx) => ({
          ...wp,
          order_index: idx,
        }));
        try {
          for (let i = 0; i < waypointData.length; i += CHUNK_SIZE) {
            const chunk = waypointData.slice(i, i + CHUNK_SIZE);
            await ActivityService.saveWaypoints(currentActivity.id, chunk);
          }
        } catch (wpErr) {
          console.warn('[Activity] Waypoint save failed, queuing offline:', wpErr);
          await enqueue({
            table: 'activity_waypoints',
            operation: 'insert',
            data: waypointData.map((wp) => ({
              activity_id: currentActivity.id,
              ...wp,
            })) as any,
          });
        }
      }

      // Award XP
      if (xp > 0) {
        try {
          await addXP(
            xp,
            'activity',
            currentActivity.id,
            `${currentActivity.type} - ${(distanceMeters / 1000).toFixed(1)}km`
          );
        } catch (err) {
          console.warn('[Activity] XP award failed, queuing offline:', err);
          await enqueue({
            table: 'xp_ledger',
            operation: 'insert',
            data: {
              user_id: userId,
              amount: xp,
              source: 'activity',
              source_id: currentActivity.id,
              description: `${currentActivity.type} - ${(distanceMeters / 1000).toFixed(1)}km`,
            },
          }).catch(() => {});
        }
      }

      // Non-blocking post-completion checks (parallelized)
      Promise.all([
        PBService.checkPersonalBests(userId, completed, waypoints).catch((err) => {
          console.warn('[Activity] PB check failed:', err);
        }),
        ActivityService.getActivityHistory(userId)
          .then((history) => {
            const completedCount = history.filter((a) => a.status === 'completed').length;
            return AchievementService.checkAchievements(userId, {
              activityCount: completedCount,
            });
          })
          .catch((err) => {
            console.warn('[Activity] Achievement check failed:', err);
          }),
      ]).catch(() => {});

      // Reset state
      setCurrentActivity(null);
      setElapsedSeconds(0);
      setDistanceMeters(0);
      setCurrentPaceSecPerKm(0);
      setWaypoints([]);
      setCurrentSpeed(0);
      setIsPaused(false);
      lastWaypointRef.current = null;
      isStoppingRef.current = false;

      return completed;
      } catch (err) {
        // Reset the stopping flag so user can retry
        isStoppingRef.current = false;
        throw err;
      }
    },
    [currentActivity, user, elapsedSeconds, distanceMeters, waypoints, addXP]
  );

  return (
    <ActivityContext.Provider
      value={{
        currentActivity,
        isActive,
        isPaused,
        elapsedSeconds,
        distanceMeters,
        currentPaceSecPerKm,
        waypoints,
        currentSpeed,
        startActivity,
        pauseActivity,
        resumeActivity,
        stopActivity,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivity must be used within ActivityProvider');
  return ctx;
}
