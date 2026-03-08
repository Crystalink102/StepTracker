import {
  XP_BASE,
  XP_POWER,
  HR_BASELINE,
  HR_XP_PER_BPM,
  STEPS_PER_XP,
  AUTO_HR_UNLOCK_LEVEL,
} from '@/src/constants/config';

/**
 * XP required to reach a given level.
 * Formula: XP = 100 * level^1.68
 */
export function xpForLevel(level: number): number {
  return Math.round(XP_BASE * Math.pow(level, XP_POWER));
}

/**
 * Total cumulative XP needed from level 1 to reach target level.
 */
export function totalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

/**
 * Given total XP, calculate current level.
 */
export function levelFromTotalXP(totalXP: number): number {
  let level = 1;
  let accumulated = 0;
  while (true) {
    const needed = xpForLevel(level);
    if (accumulated + needed > totalXP) break;
    accumulated += needed;
    level++;
  }
  return level;
}

/**
 * Progress within current level (0 to 1).
 */
export function levelProgress(totalXP: number): number {
  const level = levelFromTotalXP(totalXP);
  const xpAtLevelStart = totalXPForLevel(level - 1);
  const xpNeeded = xpForLevel(level);
  const xpIntoLevel = totalXP - xpAtLevelStart;
  return Math.min(xpIntoLevel / xpNeeded, 1);
}

/**
 * XP remaining to next level.
 */
export function xpToNextLevel(totalXP: number): number {
  const level = levelFromTotalXP(totalXP);
  const xpAtLevelStart = totalXPForLevel(level - 1);
  const xpNeeded = xpForLevel(level);
  return xpNeeded - (totalXP - xpAtLevelStart);
}

/**
 * Calculate heart rate XP multiplier.
 * Every BPM above baseline = +0.1 XP per step.
 * Returns additional XP per step.
 */
export function hrXPBonus(heartRate: number): number {
  if (heartRate <= HR_BASELINE) return 0;
  return (heartRate - HR_BASELINE) * HR_XP_PER_BPM;
}

/**
 * Calculate XP earned from steps.
 * Base: 1 XP per STEPS_PER_XP steps (default 10).
 * Heart rate bonus is per-step.
 */
export function xpFromSteps(steps: number, avgHeartRate?: number): number {
  const baseXP = Math.floor(steps / STEPS_PER_XP);
  if (avgHeartRate) {
    const bonus = hrXPBonus(avgHeartRate);
    return Math.round(baseXP + steps * bonus);
  }
  return baseXP;
}

/**
 * Calculate XP from an activity (run/walk).
 * Considers distance, duration, and heart rate.
 */
export function xpFromActivity(
  distanceMeters: number,
  durationSeconds: number,
  avgHeartRate?: number
): number {
  // Base: 1 XP per 10 meters
  const baseXP = Math.floor(distanceMeters / 10);

  // Duration bonus: 1 XP per minute
  const durationBonus = Math.floor(durationSeconds / 60);

  // HR bonus applied to base
  let hrBonus = 0;
  if (avgHeartRate) {
    hrBonus = Math.round(baseXP * (hrXPBonus(avgHeartRate) / 10));
  }

  return baseXP + durationBonus + hrBonus;
}

/**
 * Estimate heart rate from pace (speed in km/h).
 * Used for "Auto HR" feature unlocked at level 3+.
 */
export function estimateHRFromPace(
  speedKmh: number,
  restingHR: number = 70
): number {
  // Offset based on resting HR difference from average
  const hrOffset = restingHR - 70;

  if (speedKmh <= 5) {
    // Very slow walk
    return Math.round(85 + hrOffset);
  } else if (speedKmh <= 6.5) {
    // Brisk walk
    const t = (speedKmh - 5) / 1.5;
    return Math.round(90 + t * 10 + hrOffset);
  } else if (speedKmh <= 8) {
    // Walk to jog transition
    const t = (speedKmh - 6.5) / 1.5;
    return Math.round(100 + t * 20 + hrOffset);
  } else if (speedKmh <= 10) {
    // Jogging
    const t = (speedKmh - 8) / 2;
    return Math.round(120 + t * 20 + hrOffset);
  } else if (speedKmh <= 14.5) {
    // Running
    const t = (speedKmh - 10) / 4.5;
    return Math.round(140 + t * 30 + hrOffset);
  } else {
    // Sprinting
    const t = Math.min((speedKmh - 14.5) / 3.5, 1);
    return Math.round(170 + t * 20 + hrOffset);
  }
}

/**
 * Check if auto HR feature is unlocked.
 */
export function isAutoHRUnlocked(level: number): boolean {
  return level >= AUTO_HR_UNLOCK_LEVEL;
}
