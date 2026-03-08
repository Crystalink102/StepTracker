import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Define the background task (native only — TaskManager crashes on web)
if (Platform.OS !== 'web') {
  try {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.error('Background location error:', error);
        return;
      }

      if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        if (locations && locations.length > 0 && globalLocationCallback) {
          locations.forEach((loc) => globalLocationCallback!(loc));
        }
      }
    });
  } catch (err) {
    console.warn('[BackgroundLocation] Could not define task:', err);
  }
}

// Global callback for passing locations to the active context
let globalLocationCallback: ((location: Location.LocationObject) => void) | null = null;

// Keep a ref to the foreground subscription so we can stop it
let foregroundSub: Location.LocationSubscription | null = null;

export function setLocationCallback(
  cb: ((location: Location.LocationObject) => void) | null
) {
  globalLocationCallback = cb;
}

/**
 * Check if background location APIs are available.
 * They're not on web or in Expo Go.
 */
function hasBackgroundSupport(): boolean {
  return (
    Platform.OS !== 'web' &&
    typeof Location.hasStartedLocationUpdatesAsync === 'function'
  );
}

/**
 * Start background location tracking.
 * Falls back to foreground-only watching when background APIs aren't available.
 */
export async function startBackgroundLocation() {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') throw new Error('Foreground location permission denied');

  if (!hasBackgroundSupport()) {
    // Foreground-only fallback (web / Expo Go)
    foregroundSub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 },
      (loc) => {
        if (globalLocationCallback) globalLocationCallback(loc);
      }
    );
    return;
  }

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') throw new Error('Background location permission denied');

  const isTracking = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK
  );
  if (isTracking) return;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 2000,
    distanceInterval: 3,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'StepTracker',
      notificationBody: 'Tracking your activity...',
      notificationColor: '#A855F7',
    },
  });
}

/**
 * Stop background location tracking.
 */
export async function stopBackgroundLocation() {
  // Clean up foreground subscription if it exists
  if (foregroundSub) {
    foregroundSub.remove();
    foregroundSub = null;
  }

  if (!hasBackgroundSupport()) return;

  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK
    );
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (err) {
    console.warn('[BackgroundLocation] Failed to stop tracking:', err);
  }
}
