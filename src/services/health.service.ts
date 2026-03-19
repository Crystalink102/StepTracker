import { Platform, Linking } from 'react-native';
import { getMidnightCT } from '@/src/utils/date-helpers';

type StepData = {
  steps: number;
  source: 'health-connect' | 'healthkit' | 'pedometer' | 'none';
};

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

    // Try reading — works if permissions already granted
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
      console.warn('[Health] Health Connect read failed — permissions not granted yet');
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

// ── Data Sources ────────────────────────────────────────────────────────

export type HealthDataSource = {
  packageName: string;
  appName: string;
  deviceModel?: string;
  deviceManufacturer?: string;
  isWatch: boolean;
};

const KNOWN_APPS: Record<string, string> = {
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.samsung.android.wear.shealth': 'Samsung Health (Watch)',
  'com.google.android.apps.fitness': 'Google Fit',
  'com.google.android.gms.health': 'Google Health Services',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.garmin.android.apps.connectmobile': 'Garmin Connect',
  'com.xiaomi.wearable': 'Xiaomi Wear',
  'com.huawei.health': 'Huawei Health',
  'com.polar.flow': 'Polar Flow',
  'com.strava': 'Strava',
  'com.withings.wiscale2': 'Withings',
};

function friendlyAppName(pkg: string): string {
  return KNOWN_APPS[pkg] || pkg.split('.').pop() || pkg;
}

/**
 * Get the list of apps/devices that have contributed step data today.
 * Only works on Android with Health Connect.
 */
export async function getStepDataSources(): Promise<HealthDataSource[]> {
  if (Platform.OS !== 'android' || !healthConnectInitialized) return [];

  try {
    const HC = await import('react-native-health-connect');
    const midnight = getMidnightCT();
    const { records } = await HC.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: midnight.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    const seen = new Set<string>();
    const sources: HealthDataSource[] = [];

    for (const r of records ?? []) {
      const meta = (r as any).metadata;
      if (!meta?.dataOrigin) continue;
      const pkg = meta.dataOrigin;
      if (seen.has(pkg)) continue;
      seen.add(pkg);

      const device = meta.device;
      const deviceType = device?.type;
      sources.push({
        packageName: pkg,
        appName: friendlyAppName(pkg),
        deviceModel: device?.model,
        deviceManufacturer: device?.manufacturer,
        isWatch: deviceType === 1 || // TYPE_WATCH
          deviceType === 5 || // TYPE_FITNESS_BAND
          pkg.includes('wear') ||
          pkg.includes('watch') ||
          pkg.includes('wearable'),
      });
    }

    return sources;
  } catch (err) {
    console.warn('[Health] Failed to read data sources:', err);
    return [];
  }
}

// ── Permissions ─────────────────────────────────────────────────────────

/**
 * Open Health Connect settings so the user can grant permissions to 5tepTracker.
 * Returns true if the intent was opened.
 */
export async function openHealthConnectSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    await Linking.sendIntent('androidx.health.ACTION_MANAGE_HEALTH_PERMISSIONS', [
      { key: 'packageName', value: 'com.fivesteptracker.app' },
    ]);
    return true;
  } catch {
    // Fallback: open Health Connect app directly
    try {
      await Linking.openURL('content://com.google.android.health.connect');
      return true;
    } catch {
      try {
        await Linking.openSettings();
        return true;
      } catch {
        return false;
      }
    }
  }
}

/**
 * Whether Health Connect has been successfully initialized with permissions.
 */
export function isHealthConnectReady(): boolean {
  return healthConnectInitialized;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Initialize the best available health platform.
 * Returns the source that will be used for step data.
 */
export async function initHealth(): Promise<StepData['source']> {
  if (Platform.OS === 'web') return 'none';

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
