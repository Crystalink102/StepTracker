import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Define the background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    // Locations are processed by the ActivityContext listener
    // This task just keeps the GPS tracking alive in the background
    if (locations && locations.length > 0) {
      // Emit event for ActivityContext to pick up
      // Using a global callback pattern since TaskManager can't access React context
      if (globalLocationCallback) {
        locations.forEach((loc) => globalLocationCallback!(loc));
      }
    }
  }
});

// Global callback for passing locations to the active context
let globalLocationCallback: ((location: Location.LocationObject) => void) | null = null;

export function setLocationCallback(
  cb: ((location: Location.LocationObject) => void) | null
) {
  globalLocationCallback = cb;
}

/**
 * Start background location tracking.
 */
export async function startBackgroundLocation() {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') throw new Error('Foreground location permission denied');

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') throw new Error('Background location permission denied');

  const isTracking = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK
  );
  if (isTracking) return;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 3000,
    distanceInterval: 5,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'StepTracker',
      notificationBody: 'Tracking your activity...',
      notificationColor: '#4F46E5',
    },
  });
}

/**
 * Stop background location tracking.
 */
export async function stopBackgroundLocation() {
  const isTracking = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK
  );
  if (isTracking) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
