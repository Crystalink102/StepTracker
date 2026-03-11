/**
 * Fitness calculation utilities.
 *
 * All calorie, step-distance, and activity estimation formulas live here.
 * Tweak these constants to calibrate accuracy.
 */

// --- Step-to-distance estimation ---

/** Default stride length in meters (matches formula at 170cm: 170 × 0.00415 = 0.7055). */
const BASE_STRIDE_M = 0.7055;

/**
 * Estimate stride length from user height.
 * Research: stride ≈ height × 0.415 for walking, ×0.45 for running.
 * We use 0.415 as a conservative default (most steps are walking).
 */
export function strideLengthMeters(heightCm: number | null): number {
  if (!heightCm || heightCm < 100 || heightCm > 250) return BASE_STRIDE_M;
  return heightCm * 0.00415; // 170cm → 0.706m, 180cm → 0.747m, 160cm → 0.664m
}

/**
 * Estimate distance from step count + user height.
 */
export function distanceFromSteps(steps: number, heightCm: number | null): number {
  return steps * strideLengthMeters(heightCm);
}

// --- Calorie estimation ---

/**
 * MET (Metabolic Equivalent of Task) values.
 * Source: Compendium of Physical Activities.
 */
const MET_WALKING_SLOW = 2.5;    // < 4 km/h
const MET_WALKING_NORMAL = 3.5;  // 4-6 km/h
const MET_WALKING_BRISK = 4.5;   // 6-7 km/h
const MET_JOGGING = 7.0;         // 7-9 km/h
const MET_RUNNING = 9.8;         // 9-12 km/h
const MET_RUNNING_FAST = 11.5;   // 12-14 km/h
const MET_SPRINTING = 14.5;      // > 14 km/h

/**
 * Get MET value from speed in km/h.
 */
function metFromSpeed(speedKmh: number): number {
  if (speedKmh < 4) return MET_WALKING_SLOW;
  if (speedKmh < 6) return MET_WALKING_NORMAL;
  if (speedKmh < 7) return MET_WALKING_BRISK;
  if (speedKmh < 9) return MET_JOGGING;
  if (speedKmh < 12) return MET_RUNNING;
  if (speedKmh < 14) return MET_RUNNING_FAST;
  return MET_SPRINTING;
}

/**
 * Estimate calories burned during an activity.
 * Formula: calories = MET × weight(kg) × duration(hours)
 *
 * This is what Strava and most fitness apps use under the hood.
 * Falls back to a weight-based distance formula if no speed data.
 */
export function caloriesFromActivity(
  distanceMeters: number,
  durationSeconds: number,
  weightKg: number | null,
  type: 'run' | 'walk' = 'run'
): number {
  const weight = weightKg && weightKg > 20 ? weightKg : 70; // Default 70kg
  const durationHours = durationSeconds / 3600;

  if (durationSeconds > 0 && distanceMeters > 0) {
    // We have speed data - use MET
    const speedKmh = (distanceMeters / 1000) / durationHours;
    const met = metFromSpeed(speedKmh);
    return Math.round(met * weight * durationHours);
  }

  // Fallback: weight × distance factor
  // Running ≈ 1.0 kcal/kg/km, walking ≈ 0.5 kcal/kg/km
  const factor = type === 'run' ? 1.0 : 0.5;
  return Math.round(weight * (distanceMeters / 1000) * factor);
}

/**
 * Estimate calories from step count (for the home screen).
 * Uses a simplified formula: ~0.04 kcal per step for a 70kg person,
 * scaled by actual weight.
 */
export function caloriesFromSteps(steps: number, weightKg: number | null): number {
  const weight = weightKg && weightKg > 20 ? weightKg : 70;
  // Base rate: 0.04 cal/step at 70kg
  return Math.round(steps * 0.04 * (weight / 70));
}

/**
 * Estimate active minutes from step count.
 * Average walking cadence: ~100-120 steps/min.
 * We use 110 as a middle ground.
 */
export function activeMinutesFromSteps(steps: number): number {
  return Math.round(steps / 110);
}

// --- GPS accuracy helpers ---

/** Maximum plausible distance (meters) between two GPS points at 3s intervals. */
// Usain Bolt covers ~30m in 3s. 50m gives generous headroom for GPS drift.
export const GPS_MAX_JUMP_M = 50;

/** Minimum distance (meters) to count - filters GPS noise at standstill. */
export const GPS_MIN_MOVE_M = 1.5;

/**
 * Check if a GPS distance reading is plausible.
 * Uses GPS speed to distinguish real movement from standstill jitter:
 * - Standing still or speed unknown (null / < 0.2 m/s): require 8m — filters 5-10m GPS jitter
 * - Uncertain (speed 0.2–0.5 m/s): require 2m — allows slow walking
 * - Moving (speed >= 0.5 m/s): standard 1.5m — trust the movement
 * Accuracy floor only applies at standstill to avoid blocking real walks.
 */
export function isPlausibleGPSMove(
  distanceMeters: number,
  currentSpeedMs?: number | null,
  accuracyMeters?: number | null
): boolean {
  let minMove: number;
  if (currentSpeedMs == null || currentSpeedMs < 0.2) {
    // Standing still OR speed unknown (null) — treat as standstill
    // GPS jitter at standstill can easily be 5-10m
    minMove = 8;
    // At standstill, also factor in accuracy (poor signal = bigger jitter)
    if (accuracyMeters != null && accuracyMeters > 10) {
      minMove = Math.max(minMove, accuracyMeters * 0.5);
    }
  } else if (currentSpeedMs < 0.5) {
    minMove = 2; // Might be drift, might be slow walking — modest filter
  } else {
    minMove = GPS_MIN_MOVE_M; // Actually moving — trust it
  }

  return distanceMeters >= minMove && distanceMeters <= GPS_MAX_JUMP_M;
}

// --- Pace smoothing ---

/**
 * Compute a smoothed pace from a rolling window of speed readings.
 * Returns seconds per km. Uses exponential moving average.
 */
export function smoothedPace(
  newSpeedKmh: number,
  prevPaceSecPerKm: number,
  alpha: number = 0.3
): number {
  if (newSpeedKmh <= 0.5) return prevPaceSecPerKm; // Ignore standstill
  const newPace = 3600 / newSpeedKmh;
  if (prevPaceSecPerKm === 0) return newPace; // First reading
  // EMA: pace = alpha * new + (1-alpha) * prev
  return alpha * newPace + (1 - alpha) * prevPaceSecPerKm;
}
