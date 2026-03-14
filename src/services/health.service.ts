import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getMidnightCT } from '@/src/utils/date-helpers';

type StepData = {
  steps: number;
  source: 'health-connect' | 'healthkit' | 'pedometer' | 'none';
};

// Expo Go can't use native-only health modules (react-native-health, react-native-health-connect)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// ── Android: Health Connect ─────────────────────────────────────────────

let healthConnectInitialized = false;

async function initHealthConnect(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (healthConnectInitialized) return true;

  try {
    const HC = await import('react-native-health-connect');
    const ok = await HC.initialize();
    if (!ok) return false;

    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);

    // Try reading directly first — works if permissions already granted
    try {
      const { records } = await HC.readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: midnight.toISOString(),
          endTime: now.toISOString(),
        },
      });

      if (records !== undefined) {
        healthConnectInitialized = true;
        return true;
      }
    } catch {
      // Permissions not granted yet — request them below
    }

    // Request permissions — wrapped in try-catch because the native
    // permission delegate can crash on some devices if the activity
    // isn't fully ready. A short delay helps avoid the lateinit crash.
    try {
      await new Promise((r) => setTimeout(r, 500));
      await HC.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'TotalCaloriesBurned' },
      ]);

      // Verify permissions were actually granted by trying to read
      const { records } = await HC.readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: midnight.toISOString(),
          endTime: now.toISOString(),
        },
      });

      if (records !== undefined) {
        healthConnectInitialized = true;
        return true;
      }
    } catch (permErr) {
      console.warn('[Health] Health Connect permission request failed:', permErr);
    }

    return false;
  } catch (err) {
    console.warn('[Health] Health Connect not available:', err);
    return false;
  }
}

async function getStepsFromHealthConnect(startDate: Date, endDate: Date): Promise<number | null> {
  try {
    const HC = await import('react-native-health-connect');
    const { records } = await HC.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      },
    });

    return (records ?? []).reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);
  } catch (err) {
    console.warn('[Health] Failed to read Health Connect steps:', err);
    return null;
  }
}

// ── iOS: HealthKit ──────────────────────────────────────────────────────

let healthKitInitialized = false;

async function initHealthKit(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (healthKitInitialized) return true;

  try {
    const AppleHealthKit = (await import('react-native-health')).default;
    const { Permissions } = AppleHealthKit.Constants;

    const initPromise = new Promise<boolean>((resolve) => {
      AppleHealthKit.initHealthKit(
        {
          permissions: {
            read: [Permissions.Steps],
            write: [],
          },
        },
        (err: any) => {
          if (err) {
            console.warn('[Health] HealthKit init failed:', err);
            resolve(false);
            return;
          }
          healthKitInitialized = true;
          resolve(true);
        }
      );
    });

    // Timeout after 10s to prevent hanging
    const timeout = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), 10000)
    );

    return await Promise.race([initPromise, timeout]);
  } catch (err) {
    console.warn('[Health] HealthKit not available:', err);
    return false;
  }
}

async function getStepsFromHealthKit(): Promise<number | null> {
  try {
    const AppleHealthKit = (await import('react-native-health')).default;

    const midnight = getMidnightCT();

    return new Promise((resolve) => {
      AppleHealthKit.getStepCount(
        {
          startDate: midnight.toISOString(),
          endDate: new Date().toISOString(),
        },
        (err: any, results: any) => {
          if (err) {
            console.warn('[Health] HealthKit step read failed:', err);
            resolve(null);
            return;
          }
          resolve(results?.value ?? 0);
        }
      );
    });
  } catch (err) {
    console.warn('[Health] HealthKit not available:', err);
    return null;
  }
}

// ── Fallback: expo-sensors Pedometer ────────────────────────────────────

let pedometerAvailable: boolean | null = null;

async function getStepsFromPedometer(midnight: Date): Promise<number | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { Pedometer } = await import('expo-sensors');

    // Cache availability check so we don't call isAvailableAsync every poll.
    // On iOS, isAvailableAsync can sometimes return false even when pedometer works,
    // so we also try getStepCountAsync directly as a fallback.
    if (pedometerAvailable === null) {
      try {
        // Add a timeout — isAvailableAsync can hang on some platforms
        const availPromise = Pedometer.isAvailableAsync();
        const timeout = new Promise<boolean>((r) => setTimeout(() => r(true), 3000));
        pedometerAvailable = await Promise.race([availPromise, timeout]);
      } catch {
        // Assume available and let getStepCountAsync fail if not
        pedometerAvailable = true;
      }
    }
    if (!pedometerAvailable) return null;

    const result = await Pedometer.getStepCountAsync(midnight, new Date());
    return result.steps;
  } catch (err) {
    console.warn('[Health] Pedometer read failed:', err);
    return null;
  }
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Initialize the best available health platform.
 * Returns the source that will be used for step data.
 */
export async function initHealth(): Promise<StepData['source']> {
  if (Platform.OS === 'web') return 'none';

  // In Expo Go, skip native health modules entirely — go straight to pedometer
  if (isExpoGo) {
    console.log('[Health] Expo Go detected, using pedometer fallback');
    return 'pedometer';
  }

  if (Platform.OS === 'android') {
    const hcOk = await initHealthConnect();
    if (hcOk) return 'health-connect';
  }

  if (Platform.OS === 'ios') {
    const hkOk = await initHealthKit();
    if (hkOk) return 'healthkit';
  }

  // Fallback: raw pedometer (unsupported devices)
  return 'pedometer';
}

/**
 * Get today's step count from the best available source.
 * Health Connect and HealthKit apply ML-based filtering for accuracy.
 * Falls back to raw pedometer if health platforms aren't available.
 */
export async function getTodaySteps(): Promise<StepData> {
  const midnight = getMidnightCT();

  // Try Health Connect (Android)
  if (Platform.OS === 'android' && healthConnectInitialized) {
    const steps = await getStepsFromHealthConnect(midnight, new Date());
    if (steps !== null) {
      return { steps, source: 'health-connect' };
    }
  }

  // Try HealthKit (iOS)
  if (Platform.OS === 'ios' && healthKitInitialized) {
    const steps = await getStepsFromHealthKit();
    if (steps !== null) {
      return { steps, source: 'healthkit' };
    }
  }

  // Fallback: raw pedometer
  const steps = await getStepsFromPedometer(midnight);
  if (steps !== null) {
    return { steps, source: 'pedometer' };
  }

  return { steps: 0, source: 'none' };
}
