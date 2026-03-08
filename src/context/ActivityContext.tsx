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
import { haversineDistance, paceSecondsPerKm } from '@/src/utils/geo';
import {
  xpFromActivity,
  estimateHRFromPace,
  isAutoHRUnlocked,
} from '@/src/utils/xp-calculator';
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
  const { addXP, level } = useXP();

  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [currentPaceSecPerKm, setCurrentPaceSecPerKm] = useState(0);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const waypointIndexRef = useRef(0);
  const isActive = !!currentActivity && currentActivity.status !== 'completed';

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

  // Location callback handler
  const handleLocation = useCallback(
    (location: Location.LocationObject) => {
      if (isPaused || !isActive) return;

      const wp: Waypoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        speed: location.coords.speed,
        timestamp: new Date(location.timestamp).toISOString(),
      };

      setWaypoints((prev) => {
        const updated = [...prev, wp];

        // Calculate distance from previous point
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const dist = haversineDistance(
            last.latitude,
            last.longitude,
            wp.latitude,
            wp.longitude
          );
          // Filter out GPS noise (ignore if less than 2m or more than 100m in one update)
          if (dist >= 2 && dist <= 100) {
            setDistanceMeters((d) => d + dist);
          }
        }

        return updated;
      });

      // Update current speed
      if (location.coords.speed && location.coords.speed > 0) {
        const speedKmh = location.coords.speed * 3.6;
        setCurrentSpeed(speedKmh);
        // Update pace
        if (speedKmh > 0.5) {
          setCurrentPaceSecPerKm(3600 / speedKmh);
        }
      }
    },
    [isPaused, isActive]
  );

  // Register location callback when activity starts
  useEffect(() => {
    if (isActive) {
      setLocationCallback(handleLocation);
    } else {
      setLocationCallback(null);
    }
  }, [isActive, handleLocation]);

  const startActivity = useCallback(
    async (type: 'run' | 'walk') => {
      if (!user) return;

      const activity = await ActivityService.createActivity(user.id, type);
      setCurrentActivity(activity);
      setElapsedSeconds(0);
      setDistanceMeters(0);
      setCurrentPaceSecPerKm(0);
      setWaypoints([]);
      setCurrentSpeed(0);
      setIsPaused(false);
      waypointIndexRef.current = 0;

      await startBackgroundLocation();
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

      await stopBackgroundLocation();

      const avgPace =
        distanceMeters > 0
          ? paceSecondsPerKm(distanceMeters, elapsedSeconds)
          : null;

      // Calculate XP
      const xp = xpFromActivity(distanceMeters, elapsedSeconds, avgHeartRate);

      // Rough calorie estimate
      const calories = Math.round(distanceMeters * 0.06);

      const completed = await ActivityService.updateActivity(currentActivity.id, {
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_seconds: elapsedSeconds,
        distance_meters: distanceMeters,
        avg_pace_seconds_per_km: avgPace ? Math.round(avgPace) : null,
        avg_heart_rate: avgHeartRate ?? null,
        hr_source: hrSource ?? null,
        calories_estimate: calories,
        xp_earned: xp,
      });

      // Save waypoints
      if (waypoints.length > 0) {
        await ActivityService.saveWaypoints(
          currentActivity.id,
          waypoints.map((wp, idx) => ({
            ...wp,
            order_index: idx,
          }))
        );
      }

      // Award XP
      if (xp > 0) {
        await addXP(
          xp,
          'activity',
          currentActivity.id,
          `${currentActivity.type} - ${(distanceMeters / 1000).toFixed(1)}km`
        );
      }

      // Check for personal bests
      try {
        await PBService.checkPersonalBests(user.id, completed);
      } catch {
        // PB check failure shouldn't block completion
      }

      // Check activity achievements
      try {
        const history = await ActivityService.getActivityHistory(user.id);
        const completedCount = history.filter((a) => a.status === 'completed').length;
        AchievementService.checkAchievements(user.id, {
          activityCount: completedCount,
        }).catch(() => {});
      } catch {
        // Achievement check failure shouldn't block completion
      }

      // Reset state
      setCurrentActivity(null);
      setElapsedSeconds(0);
      setDistanceMeters(0);
      setCurrentPaceSecPerKm(0);
      setWaypoints([]);
      setCurrentSpeed(0);
      setIsPaused(false);

      return completed;
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
