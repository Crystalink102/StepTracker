import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/src/context/AuthContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import { useXP } from '@/src/hooks/useXP';
import {
  setAudioCuesEnabled,
  resetMilestones,
  announceStart,
  announcePause,
  announceResume,
  checkMilestone,
  checkHalfMilestone,
  checkTimeMilestone,
  announceLap,
} from '@/src/utils/audio-cues';
import * as ActivityService from '@/src/services/activity.service';
import * as PBService from '@/src/services/personal-best.service';
import * as AchievementService from '@/src/services/achievement.service';
import {
  startBackgroundLocation,
  stopBackgroundLocation,
  setLocationCallback,
} from '@/src/tasks/background-location';
import { Platform, AppState } from 'react-native';
import { haversineDistance, paceSecondsPerKm } from '@/src/utils/geo';
import { xpFromActivity } from '@/src/utils/xp-calculator';
import { isPlausibleGPSMove, smoothedPace, caloriesFromActivity } from '@/src/utils/fitness';
import { enqueue } from '@/src/services/offline-queue';
import * as ProfileService from '@/src/services/profile.service';
import { checkAndUpdateRunningStreak } from '@/src/services/streak.service';
import { Activity } from '@/src/types/database';
import { generateActivityName } from '@/src/utils/activity-name';

type Waypoint = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  timestamp: string;
};

export type Lap = {
  lapNumber: number;
  distanceM: number;
  durationSec: number;
  paceSecPerKm: number;
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
  laps: Lap[];
  latestLap: Lap | null;
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
  const { preferences } = usePreferences();

  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [currentPaceSecPerKm, setCurrentPaceSecPerKm] = useState(0);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [latestLap, setLatestLap] = useState<Lap | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isStoppingRef = useRef(false);
  const lastWaypointRef = useRef<Waypoint | null>(null);

  // Timestamp-based timing refs (survive background/JS thread suspension)
  const activityStartMsRef = useRef(0);
  const totalPausedMsRef = useRef(0);
  const pausedAtMsRef = useRef<number | null>(null);
  const isActive = !!currentActivity && currentActivity.status !== 'completed';

  // Refs to avoid stale closures in the location callback.
  // handleLocation is registered as a global callback and can fire at any time -
  // without refs, it would capture stale isPaused/isActive values.
  const isPausedRef = useRef(isPaused);
  const isActiveRef = useRef(isActive);
  isPausedRef.current = isPaused;
  isActiveRef.current = isActive;

  // Distance ref for lap calculations (avoids stale closure in handleLocation)
  const distanceRef = useRef(0);
  const currentLapStartDistanceRef = useRef(0);
  const currentLapStartTimeRef = useRef(0);
  const lapCountRef = useRef(0);

  // Preferences ref so handleLocation (stable callback) reads fresh values
  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  // Calculate elapsed seconds from real timestamps (not a counter that freezes in background)
  const calcElapsed = useCallback(() => {
    if (activityStartMsRef.current === 0) return 0;
    let paused = totalPausedMsRef.current;
    if (pausedAtMsRef.current != null) {
      paused += Date.now() - pausedAtMsRef.current;
    }
    return Math.floor((Date.now() - activityStartMsRef.current - paused) / 1000);
  }, []);

  // Timer for elapsed time + time-based audio cues
  useEffect(() => {
    if (isActive && !isPaused) {
      // Immediately sync elapsed time (catches up after background resume)
      setElapsedSeconds(calcElapsed());

      timerRef.current = setInterval(() => {
        const elapsed = calcElapsed();
        setElapsedSeconds(elapsed);
        // Time-based audio cue check
        const freq = preferences.audioCueFrequency;
        if (freq === 'every_5min' || freq === 'every_10min') {
          checkTimeMilestone(
            elapsed,
            distanceRef.current,
            paceRef.current,
            preferences.distanceUnit,
            freq
          );
        }
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
  }, [isActive, isPaused, preferences.audioCueFrequency, preferences.distanceUnit, calcElapsed]);

  // Recalculate elapsed time immediately when app returns to foreground
  useEffect(() => {
    if (!isActive || isPaused) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setElapsedSeconds(calcElapsed());
      }
    });
    return () => subscription.remove();
  }, [isActive, isPaused, calcElapsed]);

  // --- Audio cues ---

  // Keep the audio-cue module in sync with the user's preference
  useEffect(() => {
    setAudioCuesEnabled(preferences.audioCues);
  }, [preferences.audioCues]);

  // Use refs for values the milestone check needs (avoids re-renders)
  const elapsedSecondsRef = useRef(elapsedSeconds);
  const paceRef = useRef(currentPaceSecPerKm);
  elapsedSecondsRef.current = elapsedSeconds;
  paceRef.current = currentPaceSecPerKm;

  // Check for distance milestones whenever distanceMeters changes
  useEffect(() => {
    if (!isActive || isPaused || distanceMeters === 0) return;
    const freq = preferences.audioCueFrequency;
    if (freq === 'every_km') {
      checkMilestone(
        distanceMeters,
        elapsedSecondsRef.current,
        paceRef.current,
        preferences.distanceUnit
      );
    } else if (freq === 'every_half_km') {
      checkHalfMilestone(
        distanceMeters,
        elapsedSecondsRef.current,
        paceRef.current,
        preferences.distanceUnit
      );
    }
    // For time-based frequencies (every_5min, every_10min), distance milestones are skipped
    // — those are handled in the timer effect above
  }, [distanceMeters, isActive, isPaused, preferences.distanceUnit, preferences.audioCueFrequency]);

  // Location callback handler - uses refs for isPaused/isActive to avoid
  // recreating the callback (which would reset the GPS subscription).
  const handleLocation = useCallback(
    (location: Location.LocationObject) => {
      try {
        if (isPausedRef.current || !isActiveRef.current) return;
        if (!location?.coords) return;

        // Skip low-accuracy GPS readings
        // Tighter native threshold — 20m filters out most indoor/urban canyon noise
        const maxAccuracy = Platform.OS === 'web' ? 100 : 20;
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

          // Skip distance update entirely when stationary with poor GPS signal
          // (speed null or very low + accuracy > 15m = almost certainly drift)
          const speed = location.coords.speed;
          const accuracy = location.coords.accuracy;
          if ((speed == null || speed < 0.3) && accuracy != null && accuracy > 15) {
            // Poor signal while stationary — skip this reading
          } else {
            // Velocity check: reject teleport-like jumps
            const timeDelta =
              (new Date(wp.timestamp).getTime() -
                new Date(last.timestamp).getTime()) /
              1000;
            const velocity = timeDelta > 0 ? dist / timeDelta : 0;

            // Max velocity: 12 m/s (43 km/h) for running, reject anything above
            // Pass speed + accuracy for smarter standstill/drift filtering
            if (
              isPlausibleGPSMove(dist, speed, accuracy) &&
              velocity <= 12 &&
              isFinite(dist)
            ) {
              const prevDist = distanceRef.current;
              const newDist = prevDist + dist;
              distanceRef.current = newDist;
              setDistanceMeters(newDist);

              // Auto-lap check (read from ref to avoid stale closure)
              const prefs = prefsRef.current;
              if (prefs.autoLap) {
                const lapDistance = prefs.autoLapDistance === 'mi' ? 1609.34 : 1000;
                const lapsPassed = Math.floor(newDist / lapDistance) - Math.floor(prevDist / lapDistance);
                if (lapsPassed > 0) {
                  const lapStartDist = currentLapStartDistanceRef.current;
                  const lapStartTime = currentLapStartTimeRef.current;
                  const elapsed = elapsedSecondsRef.current;
                  const lapDist = newDist - lapStartDist;
                  const lapDuration = elapsed - lapStartTime;
                  const lapPace = lapDist > 0 ? (lapDuration / lapDist) * 1000 : 0;
                  const newLapNumber = lapCountRef.current + 1;
                  const newLap: Lap = {
                    lapNumber: newLapNumber,
                    distanceM: lapDist,
                    durationSec: lapDuration,
                    paceSecPerKm: lapPace,
                  };
                  lapCountRef.current = newLapNumber;
                  currentLapStartDistanceRef.current = newDist;
                  currentLapStartTimeRef.current = elapsed;
                  setLaps((prev) => [...prev, newLap]);
                  setLatestLap(newLap);
                  announceLap(newLapNumber, lapPace, prefs.distanceUnit);
                }
              }
            }
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
      setLaps([]);
      setLatestLap(null);
      lastWaypointRef.current = null;
      isStoppingRef.current = false;
      distanceRef.current = 0;
      currentLapStartDistanceRef.current = 0;
      currentLapStartTimeRef.current = 0;
      lapCountRef.current = 0;
      activityStartMsRef.current = 0;
      totalPausedMsRef.current = 0;
      pausedAtMsRef.current = null;
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
      resetMilestones();
      setCurrentActivity(activity);
      setElapsedSeconds(0);
      setDistanceMeters(0);
      setCurrentPaceSecPerKm(0);
      setWaypoints([]);
      setCurrentSpeed(0);
      setIsPaused(false);
      setLaps([]);
      setLatestLap(null);
      lastWaypointRef.current = null;
      isStoppingRef.current = false;
      distanceRef.current = 0;
      currentLapStartDistanceRef.current = 0;
      currentLapStartTimeRef.current = 0;
      lapCountRef.current = 0;
      activityStartMsRef.current = Date.now();
      totalPausedMsRef.current = 0;
      pausedAtMsRef.current = null;
      announceStart(type);
    },
    [user]
  );

  const pauseActivity = useCallback(async () => {
    if (!currentActivity) return;
    pausedAtMsRef.current = Date.now();
    setIsPaused(true);
    announcePause();
    try {
      await ActivityService.updateActivity(currentActivity.id, {
        status: 'paused',
        duration_seconds: elapsedSeconds,
        distance_meters: distanceMeters,
      });
    } catch (err) {
      pausedAtMsRef.current = null;
      setIsPaused(false);
      throw err;
    }
  }, [currentActivity, elapsedSeconds, distanceMeters]);

  const resumeActivity = useCallback(async () => {
    if (!currentActivity) return;
    if (pausedAtMsRef.current != null) {
      totalPausedMsRef.current += Date.now() - pausedAtMsRef.current;
      pausedAtMsRef.current = null;
    }
    setIsPaused(false);
    announceResume();
    try {
      await ActivityService.updateActivity(currentActivity.id, {
        status: 'active',
      });
    } catch (err) {
      setIsPaused(true);
      throw err;
    }
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

      // Auto-generate a default name for the activity
      const autoName = generateActivityName(
        currentActivity.type,
        currentActivity.started_at
      );

      // Try to get default gear
      let defaultGearId: string | null = null;
      try {
        const defaultGear = await ActivityService.getDefaultGear(userId);
        if (defaultGear) defaultGearId = defaultGear.id;
      } catch {}

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
        name: autoName,
        gear_id: defaultGearId,
      };

      let completed: Activity;
      try {
        completed = await ActivityService.updateActivity(currentActivity.id, activityUpdate);
      } catch (err) {
        // NOTE: Toast should be shown by the caller (e.g. activity screen) when this fallback triggers
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

      // Update running streak if this was a run
      if (currentActivity.type === 'run') {
        checkAndUpdateRunningStreak(userId).catch(() => {});
      }

      // Reset state
      setCurrentActivity(null);
      setElapsedSeconds(0);
      setDistanceMeters(0);
      setCurrentPaceSecPerKm(0);
      setWaypoints([]);
      setCurrentSpeed(0);
      setIsPaused(false);
      setLaps([]);
      setLatestLap(null);
      lastWaypointRef.current = null;
      isStoppingRef.current = false;
      distanceRef.current = 0;
      currentLapStartDistanceRef.current = 0;
      currentLapStartTimeRef.current = 0;
      lapCountRef.current = 0;
      activityStartMsRef.current = 0;
      totalPausedMsRef.current = 0;
      pausedAtMsRef.current = null;

      return completed;
      } catch (err) {
        // Reset the stopping flag so user can retry
        isStoppingRef.current = false;
        // Restart GPS tracking — we stopped it at the top of try but the save failed,
        // so the activity is still in progress and needs location data.
        try {
          await startBackgroundLocation();
        } catch {
          console.warn('[Activity] Failed to restart GPS after stop failure');
        }
        throw err;
      }
    },
    [currentActivity, user, elapsedSeconds, distanceMeters, waypoints, addXP]
  );

  const contextValue = useMemo<ActivityContextValue>(
    () => ({
      currentActivity,
      isActive,
      isPaused,
      elapsedSeconds,
      distanceMeters,
      currentPaceSecPerKm,
      waypoints,
      currentSpeed,
      laps,
      latestLap,
      startActivity,
      pauseActivity,
      resumeActivity,
      stopActivity,
    }),
    [
      currentActivity,
      isActive,
      isPaused,
      elapsedSeconds,
      distanceMeters,
      currentPaceSecPerKm,
      waypoints,
      currentSpeed,
      laps,
      latestLap,
      startActivity,
      pauseActivity,
      resumeActivity,
      stopActivity,
    ]
  );

  return (
    <ActivityContext.Provider value={contextValue}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivity must be used within ActivityProvider');
  return ctx;
}
