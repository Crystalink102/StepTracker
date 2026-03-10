/**
 * Training Load & Recovery Estimation
 *
 * Uses a simplified TRIMP (Training Impulse) model to estimate training load,
 * weekly load trends, recovery status, and freshness (fitness - fatigue).
 */

import { Activity } from '@/src/types/database';

// --- Types ---

export type LoadIntensity = 'light' | 'moderate' | 'hard' | 'very_hard';

export type LoadStatus = {
  status: 'detraining' | 'maintaining' | 'building' | 'overreaching';
  message: string;
  color: string;
};

export type RecoveryEstimate = {
  recovered: boolean;
  percentRecovered: number;
  message: string;
};

export type FreshnessResult = {
  score: number;           // -25 to +25
  fitness: number;         // chronic training load (28-day avg)
  fatigue: number;         // acute training load (7-day avg)
  label: string;
};

// --- Constants ---

/** Intensity multipliers for TRIMP-like formula */
const INTENSITY_FACTORS: Record<LoadIntensity, number> = {
  light: 1.0,
  moderate: 1.5,
  hard: 2.0,
  very_hard: 3.0,
};

/** Recovery time ranges in hours by load intensity */
const RECOVERY_HOURS: Record<LoadIntensity, { min: number; max: number }> = {
  light:     { min: 12, max: 24 },
  moderate:  { min: 24, max: 48 },
  hard:      { min: 48, max: 72 },
  very_hard: { min: 60, max: 96 },
};

// --- Core Functions ---

/**
 * Calculate training load for a single activity using simplified TRIMP.
 *
 * Formula: duration × HR_ratio × intensity_factor
 *   HR_ratio = (avgHR - restingHR) / (maxHR - restingHR)
 *
 * If no HR data, estimate from activity type and pace.
 *
 * @returns load score roughly 0-500 range
 */
export function calculateActivityLoad(
  durationMin: number,
  avgHR: number | null,
  maxHR: number,
  restingHR: number
): number {
  if (durationMin <= 0) return 0;

  if (avgHR && avgHR > restingHR && maxHR > restingHR) {
    const hrReserveRatio = (avgHR - restingHR) / (maxHR - restingHR);
    const clampedRatio = Math.min(Math.max(hrReserveRatio, 0), 1);
    const intensityFactor = getIntensityFactorFromHR(clampedRatio);
    return Math.round(durationMin * clampedRatio * intensityFactor);
  }

  // No HR data — return a pace/type-based estimate
  return Math.round(durationMin * 0.4 * INTENSITY_FACTORS.moderate);
}

/**
 * Calculate load for an Activity record, handling unit conversions.
 */
export function calculateLoadFromActivity(
  activity: Activity,
  maxHR: number,
  restingHR: number
): number {
  const durationMin = activity.duration_seconds / 60;
  const avgHR = activity.avg_heart_rate;

  if (avgHR) {
    return calculateActivityLoad(durationMin, avgHR, maxHR, restingHR);
  }

  // No HR — estimate from type & pace
  const intensity = estimateIntensityFromActivity(activity);
  const factor = INTENSITY_FACTORS[intensity];
  const baseRatio = intensity === 'light' ? 0.3 : intensity === 'moderate' ? 0.5 : 0.7;
  return Math.round(durationMin * baseRatio * factor);
}

/**
 * Sum up load for a list of activities (e.g. a week).
 */
export function calculateWeeklyLoad(
  activities: Activity[],
  maxHR: number,
  restingHR: number
): number {
  return activities.reduce(
    (sum, a) => sum + calculateLoadFromActivity(a, maxHR, restingHR),
    0
  );
}

/**
 * Compare this week's load vs last week to determine training trend.
 */
export function getLoadStatus(
  weeklyLoad: number,
  prevWeekLoad: number
): LoadStatus {
  // Edge case: no previous data
  if (prevWeekLoad <= 0) {
    if (weeklyLoad <= 0) {
      return {
        status: 'detraining',
        message: 'No recent activity. Get moving when you can!',
        color: '#71717A', // muted gray
      };
    }
    return {
      status: 'building',
      message: "You're getting started — keep it up!",
      color: '#22C55E', // green
    };
  }

  const ratio = weeklyLoad / prevWeekLoad;

  if (ratio < 0.8) {
    return {
      status: 'detraining',
      message: 'Load is dropping. Consider adding a session this week.',
      color: '#3B82F6', // blue — not alarming, just informational
    };
  }

  if (ratio <= 1.1) {
    return {
      status: 'maintaining',
      message: "Nice and steady. You're maintaining fitness well.",
      color: '#22C55E', // green
    };
  }

  if (ratio <= 1.3) {
    return {
      status: 'building',
      message: "You're building fitness nicely. Great progress!",
      color: '#A855F7', // purple — brand color for positive growth
    };
  }

  // > 130%
  return {
    status: 'overreaching',
    message: 'Big jump in load. Take it easy and watch for fatigue.',
    color: '#F97316', // orange — caution
  };
}

/**
 * Estimate recovery progress since the last activity.
 */
export function estimateRecovery(
  lastActivityLoad: number,
  hoursSinceActivity: number
): RecoveryEstimate {
  if (lastActivityLoad <= 0) {
    return { recovered: true, percentRecovered: 100, message: 'Fully recovered' };
  }

  const intensity = getLoadIntensityCategory(lastActivityLoad);
  const { min, max } = RECOVERY_HOURS[intensity];

  if (hoursSinceActivity >= max) {
    return { recovered: true, percentRecovered: 100, message: 'Fully recovered' };
  }

  if (hoursSinceActivity <= 0) {
    return { recovered: false, percentRecovered: 0, message: 'Just finished — rest up' };
  }

  // Progress curve: use sqrt for faster initial recovery, slower at the end
  const rawProgress = hoursSinceActivity / max;
  const percent = Math.min(Math.round(Math.sqrt(rawProgress) * 100), 99);

  if (hoursSinceActivity >= min) {
    return {
      recovered: false,
      percentRecovered: percent,
      message: `Almost there (${percent}%)`,
    };
  }

  return {
    recovered: false,
    percentRecovered: percent,
    message: `Still recovering (${percent}%)`,
  };
}

/**
 * Calculate freshness: fitness (chronic load) minus fatigue (acute load).
 *
 * - Fitness = average daily load over 28 days (chronic training load / CTL)
 * - Fatigue = average daily load over 7 days (acute training load / ATL)
 * - Freshness = Fitness - Fatigue (Training Stress Balance / TSB)
 *
 * Positive = fresh & ready to perform. Negative = fatigued.
 * Range clamped to -25 to +25.
 */
export function getFreshness(
  activities7days: Activity[],
  activities28days: Activity[],
  maxHR: number,
  restingHR: number
): FreshnessResult {
  const load28 = calculateWeeklyLoad(activities28days, maxHR, restingHR);
  const load7 = calculateWeeklyLoad(activities7days, maxHR, restingHR);

  const fitness = load28 / 28; // average daily chronic load
  const fatigue = load7 / 7;   // average daily acute load

  const rawScore = fitness - fatigue;
  const score = Math.max(-25, Math.min(25, Math.round(rawScore)));

  let label: string;
  if (score >= 10) {
    label = 'Feeling fresh — great day for a hard session';
  } else if (score >= 0) {
    label = 'Well balanced — ready for a normal workout';
  } else if (score >= -10) {
    label = 'A little fatigued — an easy day would be smart';
  } else {
    label = 'Take it easy today — your body needs rest';
  }

  return { score, fitness, fatigue, label };
}

// --- Helpers ---

/**
 * Get intensity factor from HR reserve ratio (0-1).
 */
function getIntensityFactorFromHR(hrReserveRatio: number): number {
  if (hrReserveRatio < 0.5) return INTENSITY_FACTORS.light;
  if (hrReserveRatio < 0.7) return INTENSITY_FACTORS.moderate;
  if (hrReserveRatio < 0.85) return INTENSITY_FACTORS.hard;
  return INTENSITY_FACTORS.very_hard;
}

/**
 * Estimate intensity from activity type and pace when no HR is available.
 */
function estimateIntensityFromActivity(activity: Activity): LoadIntensity {
  const type = activity.type;
  const paceSecPerKm = activity.avg_pace_seconds_per_km;

  if (type === 'walk') return 'light';

  // Running — use pace if available
  if (paceSecPerKm) {
    if (paceSecPerKm > 420) return 'light';       // slower than 7:00/km
    if (paceSecPerKm > 330) return 'moderate';     // 5:30-7:00/km
    if (paceSecPerKm > 270) return 'hard';         // 4:30-5:30/km
    return 'very_hard';                            // faster than 4:30/km
  }

  // Default for running without pace data
  return 'moderate';
}

/**
 * Categorize a raw load score into an intensity bucket.
 * Thresholds based on a ~30min moderate session ≈ 22 load.
 */
function getLoadIntensityCategory(load: number): LoadIntensity {
  if (load < 15) return 'light';
  if (load < 40) return 'moderate';
  if (load < 80) return 'hard';
  return 'very_hard';
}

/**
 * Get a human-friendly label for a weekly load total.
 */
export function getWeeklyLoadLabel(weeklyLoad: number): {
  label: string;
  color: string;
} {
  if (weeklyLoad < 30) return { label: 'Low', color: '#3B82F6' };
  if (weeklyLoad < 80) return { label: 'Moderate', color: '#22C55E' };
  if (weeklyLoad < 150) return { label: 'High', color: '#F97316' };
  return { label: 'Very High', color: '#EF4444' };
}
