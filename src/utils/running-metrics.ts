/**
 * Advanced running metrics for hardcore runners.
 * Cadence estimation, negative split detection, training paces, best efforts.
 */

import { ActivityWaypoint } from '@/src/types/database';
import { haversineDistance } from './geo';

// ── Cadence Estimation ──────────────────────────────────────────────────

/**
 * Estimate running cadence (steps per minute) from pace.
 * Research: cadence correlates with pace and height.
 * At 5:00/km pace, elite runners average ~180 SPM.
 * At 7:00/km, recreational runners average ~160 SPM.
 */
export function estimateCadence(
  paceSecPerKm: number | null,
  heightCm: number | null
): number | null {
  if (!paceSecPerKm || paceSecPerKm <= 0 || paceSecPerKm > 1200) return null;

  // Base cadence from pace (faster pace = higher cadence)
  // Linear model: cadence = 200 - (pace_min_per_km * 5)
  const paceMin = paceSecPerKm / 60;
  let cadence = 200 - paceMin * 5;

  // Height adjustment: taller runners have slightly lower cadence
  if (heightCm && heightCm > 0) {
    const heightFactor = (175 - heightCm) * 0.1; // +0.1 SPM per cm below 175
    cadence += heightFactor;
  }

  return Math.round(Math.max(120, Math.min(220, cadence)));
}

// ── Negative Split Analysis ─────────────────────────────────────────────

export type SplitAnalysis = {
  firstHalfPace: number; // sec/km
  secondHalfPace: number; // sec/km
  isNegativeSplit: boolean;
  splitDifference: number; // seconds difference per km (negative = faster 2nd half)
  rating: 'perfect' | 'good' | 'even' | 'positive';
  message: string;
};

/**
 * Analyze whether the run was a negative split (2nd half faster than 1st).
 * Negative splits are the gold standard for distance running.
 */
export function analyzeNegativeSplit(
  waypoints: ActivityWaypoint[],
  totalDistanceMeters: number,
  totalDurationSeconds: number
): SplitAnalysis | null {
  if (waypoints.length < 10 || totalDistanceMeters < 500) return null;

  const halfDist = totalDistanceMeters / 2;
  let accumDist = 0;
  let halfIndex = 0;

  // Find the waypoint closest to the halfway point
  for (let i = 1; i < waypoints.length; i++) {
    const d = haversineDistance(
      waypoints[i - 1].latitude,
      waypoints[i - 1].longitude,
      waypoints[i].latitude,
      waypoints[i].longitude
    );
    accumDist += d;
    if (accumDist >= halfDist) {
      halfIndex = i;
      break;
    }
  }

  if (halfIndex === 0 || halfIndex >= waypoints.length - 1) return null;

  const startTime = new Date(waypoints[0].timestamp).getTime();
  const halfTime = new Date(waypoints[halfIndex].timestamp).getTime();
  const endTime = new Date(waypoints[waypoints.length - 1].timestamp).getTime();

  const firstHalfSec = (halfTime - startTime) / 1000;
  const secondHalfSec = (endTime - halfTime) / 1000;

  if (firstHalfSec <= 0 || secondHalfSec <= 0) return null;

  const secondHalfDist = totalDistanceMeters - halfDist;
  if (halfDist <= 0 || secondHalfDist <= 0) return null;

  const firstHalfPace = (firstHalfSec / halfDist) * 1000; // sec/km
  const secondHalfPace = (secondHalfSec / secondHalfDist) * 1000;

  const diff = secondHalfPace - firstHalfPace; // negative = faster 2nd half
  const isNeg = diff < -3; // 3 sec/km threshold

  let rating: SplitAnalysis['rating'];
  let message: string;

  if (diff < -15) {
    rating = 'perfect';
    message = 'Perfect negative split! Strong finish.';
  } else if (diff < -3) {
    rating = 'good';
    message = 'Good negative split. You picked it up in the second half.';
  } else if (diff <= 5) {
    rating = 'even';
    message = 'Even split. Consistent pacing throughout.';
  } else {
    rating = 'positive';
    message = 'Positive split. Try starting a bit slower next time.';
  }

  return {
    firstHalfPace: Math.round(firstHalfPace),
    secondHalfPace: Math.round(secondHalfPace),
    isNegativeSplit: isNeg,
    splitDifference: Math.round(diff),
    rating,
    message,
  };
}

// ── Best Effort Detection ───────────────────────────────────────────────

export type BestEffort = {
  label: string;
  distanceMeters: number;
  timeSeconds: number;
  paceSecPerKm: number;
};

/**
 * Find the fastest time for standard distances within a run.
 * Like Strava's "Best Efforts" - fastest 1K, 1 Mile, 5K, etc.
 */
export function detectBestEfforts(waypoints: ActivityWaypoint[]): BestEffort[] {
  if (waypoints.length < 5) return [];

  const targets = [
    { label: '400m', meters: 400 },
    { label: '1K', meters: 1000 },
    { label: '1 Mile', meters: 1609.34 },
    { label: '2K', meters: 2000 },
    { label: '5K', meters: 5000 },
    { label: '10K', meters: 10000 },
    { label: 'Half Marathon', meters: 21097.5 },
    { label: 'Marathon', meters: 42195 },
  ];

  // Build cumulative distance/time arrays
  const cumDist: number[] = [0];
  const cumTime: number[] = [0];
  const startTime = new Date(waypoints[0].timestamp).getTime();

  for (let i = 1; i < waypoints.length; i++) {
    const d = haversineDistance(
      waypoints[i - 1].latitude,
      waypoints[i - 1].longitude,
      waypoints[i].latitude,
      waypoints[i].longitude
    );
    cumDist.push(cumDist[i - 1] + d);
    cumTime.push((new Date(waypoints[i].timestamp).getTime() - startTime) / 1000);
  }

  const totalDist = cumDist[cumDist.length - 1];
  const results: BestEffort[] = [];

  for (const target of targets) {
    if (totalDist < target.meters) continue;

    let bestTime = Infinity;

    // Sliding window approach
    let j = 0;
    for (let i = 0; i < cumDist.length; i++) {
      while (j < cumDist.length - 1 && cumDist[j] - cumDist[i] < target.meters) {
        j++;
      }

      if (cumDist[j] - cumDist[i] >= target.meters) {
        // Interpolate to exact distance
        const overshoot = cumDist[j] - cumDist[i] - target.meters;
        const segDist = cumDist[j] - cumDist[j - 1];
        const segTime = cumTime[j] - cumTime[j - 1];
        const adjustedTime = segDist > 0 ? (cumTime[j] - cumTime[i]) - (overshoot / segDist) * segTime : cumTime[j] - cumTime[i];

        if (adjustedTime < bestTime && adjustedTime > 0) {
          bestTime = adjustedTime;
        }
      }
    }

    if (bestTime < Infinity) {
      results.push({
        label: target.label,
        distanceMeters: target.meters,
        timeSeconds: Math.round(bestTime),
        paceSecPerKm: Math.round((bestTime / target.meters) * 1000),
      });
    }
  }

  return results;
}

// ── Training Paces ──────────────────────────────────────────────────────

export type TrainingPace = {
  zone: string;
  description: string;
  minPaceSecPerKm: number;
  maxPaceSecPerKm: number;
  color: string;
};

/**
 * Calculate training pace zones based on a recent threshold pace.
 * Uses Jack Daniels' VDOT-inspired zones.
 * thresholdPace = the pace you can sustain for ~1 hour (tempo pace).
 */
export function calculateTrainingPaces(thresholdPaceSecPerKm: number): TrainingPace[] {
  if (!thresholdPaceSecPerKm || thresholdPaceSecPerKm <= 0) return [];

  const tp = thresholdPaceSecPerKm;

  return [
    {
      zone: 'Easy / Recovery',
      description: 'Conversational pace. Most of your mileage should be here.',
      minPaceSecPerKm: Math.round(tp * 1.25),
      maxPaceSecPerKm: Math.round(tp * 1.40),
      color: '#3B82F6',
    },
    {
      zone: 'Marathon Pace',
      description: 'Goal marathon race pace. Sustained aerobic effort.',
      minPaceSecPerKm: Math.round(tp * 1.10),
      maxPaceSecPerKm: Math.round(tp * 1.20),
      color: '#22C55E',
    },
    {
      zone: 'Tempo / Threshold',
      description: 'Comfortably hard. Sustainable for 20-40 minutes.',
      minPaceSecPerKm: Math.round(tp * 0.97),
      maxPaceSecPerKm: Math.round(tp * 1.05),
      color: '#EAB308',
    },
    {
      zone: 'VO2 Max Intervals',
      description: 'Hard effort. 3-5 min repeats with equal rest.',
      minPaceSecPerKm: Math.round(tp * 0.88),
      maxPaceSecPerKm: Math.round(tp * 0.95),
      color: '#F97316',
    },
    {
      zone: 'Speed / Repetition',
      description: 'Near-sprint. Short 200-400m reps with full recovery.',
      minPaceSecPerKm: Math.round(tp * 0.78),
      maxPaceSecPerKm: Math.round(tp * 0.87),
      color: '#EF4444',
    },
  ];
}

/**
 * Estimate threshold pace from recent activity history.
 * Uses the best pace from runs > 20 minutes as an approximation.
 */
export function estimateThresholdPace(
  recentActivities: { avg_pace_seconds_per_km: number | null; duration_seconds: number; type: string }[]
): number | null {
  const qualifyingRuns = recentActivities.filter(
    (a) =>
      a.type === 'run' &&
      a.avg_pace_seconds_per_km != null &&
      a.avg_pace_seconds_per_km > 0 &&
      a.duration_seconds >= 1200 // at least 20 min
  );

  if (qualifyingRuns.length === 0) return null;

  // Best (fastest) pace from qualifying runs ≈ close to threshold
  const bestPace = Math.min(
    ...qualifyingRuns.map((a) => a.avg_pace_seconds_per_km!)
  );

  // Adjust slightly slower since race pace ≈ threshold but not exactly
  return Math.round(bestPace * 1.03);
}

// ── VO2max Estimation ──────────────────────────────────────────────────

/**
 * Estimate VO2max from threshold (tempo) pace using the Jack Daniels formula.
 * thresholdPaceSecPerKm = pace sustainable for ~60 minutes
 */
export function estimateVO2max(thresholdPaceSecPerKm: number): number {
  // Convert to velocity in meters per minute
  const velocityMPerMin = 1000 / (thresholdPaceSecPerKm / 60);

  // Daniels/Gilbert formula for VO2 at given velocity:
  // VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
  // where v = velocity in m/min
  // At threshold pace, runner is at ~88% of VO2max
  const vo2AtThreshold = -4.60 + 0.182258 * velocityMPerMin + 0.000104 * velocityMPerMin * velocityMPerMin;

  return Math.round(vo2AtThreshold / 0.88 * 10) / 10; // Round to 1 decimal
}

/**
 * Estimate VO2max from a race result (more accurate than threshold estimation).
 * Uses the Daniels/Gilbert formula.
 */
export function vo2maxFromRaceResult(distanceMeters: number, timeSeconds: number): number {
  const timeMin = timeSeconds / 60;
  const velocityMPerMin = distanceMeters / timeMin;

  // Percent VO2max sustained depends on duration
  // Approximation: shorter races = higher % VO2max
  const pctVO2max = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMin)
                   + 0.2989558 * Math.exp(-0.1932605 * timeMin);

  const vo2 = -4.60 + 0.182258 * velocityMPerMin + 0.000104 * velocityMPerMin * velocityMPerMin;

  return Math.round(vo2 / pctVO2max * 10) / 10;
}

/**
 * Get a VO2max fitness rating based on age and value.
 * Uses general population norms.
 */
export function getVO2maxRating(vo2max: number, ageYears?: number | null): {
  label: string;
  color: string;
  description: string;
} {
  // Simplified rating (adjusts slightly by age)
  const ageAdjust = ageYears && ageYears > 30 ? (ageYears - 30) * 0.3 : 0;
  const adjusted = vo2max + ageAdjust;

  if (adjusted >= 60) return { label: 'Elite', color: '#A855F7', description: 'Top 1% fitness level' };
  if (adjusted >= 52) return { label: 'Excellent', color: '#22C55E', description: 'Well above average' };
  if (adjusted >= 44) return { label: 'Good', color: '#3B82F6', description: 'Above average fitness' };
  if (adjusted >= 36) return { label: 'Fair', color: '#F59E0B', description: 'Average fitness level' };
  return { label: 'Below Average', color: '#EF4444', description: 'Room for improvement' };
}

// ── Race Time Prediction ───────────────────────────────────────────────

/**
 * Predict race time using the Riegel formula.
 * T2 = T1 * (D2/D1)^1.06
 */
export function predictRaceTime(
  knownDistanceM: number,
  knownTimeS: number,
  targetDistanceM: number
): number {
  return knownTimeS * Math.pow(targetDistanceM / knownDistanceM, 1.06);
}

/**
 * Predict times for all standard race distances from a known result.
 */
export function predictAllRaceTimes(
  knownDistanceM: number,
  knownTimeS: number
): { label: string; distanceM: number; predictedTimeS: number; predictedPaceSecPerKm: number }[] {
  const distances = [
    { label: '5K', distanceM: 5000 },
    { label: '10K', distanceM: 10000 },
    { label: 'Half Marathon', distanceM: 21097.5 },
    { label: 'Marathon', distanceM: 42195 },
  ];

  return distances.map(d => {
    const time = predictRaceTime(knownDistanceM, knownTimeS, d.distanceM);
    return {
      ...d,
      predictedTimeS: Math.round(time),
      predictedPaceSecPerKm: Math.round((time / d.distanceM) * 1000),
    };
  });
}
