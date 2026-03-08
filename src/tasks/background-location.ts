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
  let fg: string;
  try {
    const result = await Location.requestForegroundPermissionsAsync();
    fg = result.status;
  } catch (err: any) {
    throw new Error(
      Platform.OS === 'web'
        ? 'Location access failed. Make sure you\'re on HTTPS and allow location when prompted. On Safari, check Settings > Privacy > Location Services.'
        : `Location permission request failed: ${err.message}`
    );
  }
  if (fg !== 'granted') {
    throw new Error(
      Platform.OS === 'web'
        ? 'Location permission denied. Please allow location access in your browser settings and reload the page.'
        : 'Location permission denied. Please enable it in Settings > Privacy > Location Services.'
    );
  }

  if (!hasBackgroundSupport()) {
    // Clean up any existing subscription first to avoid Web Locks API conflicts
    if (foregroundSub) {
      try { foregroundSub.remove(); } catch { /* web compat */ }
      foregroundSub = null;
    }

    // Foreground-only fallback (web / Expo Go)
    // On web, skip watchPositionAsync entirely (Web Locks API issues) and use polling
    if (Platform.OS === 'web') {
      startWebPolling();
      return;
    }

    try {
      foregroundSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (loc) => {
          if (globalLocationCallback) globalLocationCallback(loc);
        }
      );
    } catch (err: any) {
      console.warn('[BackgroundLocation] watchPosition failed, using polling fallback:', err.message);
      startWebPolling();
    }
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

// Web polling fallback when watchPositionAsync fails
let webPollingInterval: ReturnType<typeof setInterval> | null = null;

// Track last web position to skip duplicates (browser cache)
let lastWebLat = 0;
let lastWebLng = 0;

function startWebPolling() {
  stopWebPolling();
  lastWebLat = 0;
  lastWebLng = 0;

  webPollingInterval = setInterval(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        ...({ maximumAge: 0 } as any), // Force fresh position, never use browser cache
      });

      // Skip if browser returned identical cached coordinates
      if (
        loc.coords.latitude === lastWebLat &&
        loc.coords.longitude === lastWebLng
      ) {
        return;
      }
      lastWebLat = loc.coords.latitude;
      lastWebLng = loc.coords.longitude;

      if (globalLocationCallback) globalLocationCallback(loc);
    } catch {
      // Skip this tick if getCurrentPosition fails
    }
  }, 2000);
}

function stopWebPolling() {
  if (webPollingInterval) {
    clearInterval(webPollingInterval);
    webPollingInterval = null;
  }
}

/**
 * Stop background location tracking.
 */
export async function stopBackgroundLocation() {
  // Clean up foreground subscription if it exists
  if (foregroundSub) {
    try { foregroundSub.remove(); } catch { /* web compat */ }
    foregroundSub = null;
  }

  // Clean up web polling fallback
  stopWebPolling();

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
