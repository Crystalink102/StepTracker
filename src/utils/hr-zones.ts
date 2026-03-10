/**
 * Heart Rate Zone utilities.
 *
 * Standard 5-zone model based on percentage of max heart rate.
 * Max HR is estimated via the classic 220 − age formula, or a user-supplied value.
 */

export type ZoneInfo = {
  zone: number;
  name: string;
  description: string;
  minPercent: number;
  maxPercent: number;
  minHR: number;
  maxHR: number;
  color: string;
};

// Zone colors – visually distinct, dark-UI friendly
const ZONE_COLORS = {
  1: '#3B82F6', // blue
  2: '#22C55E', // green
  3: '#EAB308', // yellow
  4: '#F97316', // orange
  5: '#EF4444', // red
} as const;

const ZONE_NAMES: Record<number, string> = {
  1: 'Recovery',
  2: 'Endurance',
  3: 'Tempo',
  4: 'Threshold',
  5: 'Max',
};

const ZONE_DESCRIPTIONS: Record<number, string> = {
  1: 'Easy effort, active recovery. Great for warm-ups and cool-downs.',
  2: 'Comfortable aerobic pace. Builds endurance and burns fat efficiently.',
  3: 'Moderate effort. Improves aerobic capacity and running economy.',
  4: 'Hard effort at lactate threshold. Boosts speed and race performance.',
  5: 'All-out maximum effort. Short bursts only — builds power and VO2 max.',
};

const ZONE_RANGES: { zone: number; minPercent: number; maxPercent: number }[] = [
  { zone: 1, minPercent: 50, maxPercent: 60 },
  { zone: 2, minPercent: 60, maxPercent: 70 },
  { zone: 3, minPercent: 70, maxPercent: 80 },
  { zone: 4, minPercent: 80, maxPercent: 90 },
  { zone: 5, minPercent: 90, maxPercent: 100 },
];

/**
 * Estimate max heart rate from age using the classic formula.
 */
export function calculateMaxHR(age: number): number {
  return Math.round(220 - age);
}

/**
 * Calculate age from a date-of-birth string (ISO 8601 / YYYY-MM-DD).
 * Returns null if the date is invalid.
 */
export function ageFromDOB(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 && age < 120 ? age : null;
}

/**
 * Determine which HR zone a given heart rate falls into.
 * Returns 1–5. Values below zone 1 return 1, above zone 5 return 5.
 */
export function getZone(hr: number, maxHR: number): number {
  const percent = (hr / maxHR) * 100;
  if (percent >= 90) return 5;
  if (percent >= 80) return 4;
  if (percent >= 70) return 3;
  if (percent >= 60) return 2;
  return 1;
}

/**
 * Get the human-readable name for a zone number (1–5).
 */
export function getZoneName(zone: number): string {
  return ZONE_NAMES[zone] ?? 'Unknown';
}

/**
 * Get the description for a zone number (1–5).
 */
export function getZoneDescription(zone: number): string {
  return ZONE_DESCRIPTIONS[zone] ?? '';
}

/**
 * Get the color associated with a zone number (1–5).
 */
export function getZoneColor(zone: number): string {
  return ZONE_COLORS[zone as keyof typeof ZONE_COLORS] ?? '#71717A';
}

/**
 * Build an array of all 5 zones with computed HR ranges based on the user's max HR.
 */
export function getZoneRanges(maxHR: number): ZoneInfo[] {
  return ZONE_RANGES.map(({ zone, minPercent, maxPercent }) => ({
    zone,
    name: ZONE_NAMES[zone],
    description: ZONE_DESCRIPTIONS[zone],
    minPercent,
    maxPercent,
    minHR: Math.round(maxHR * (minPercent / 100)),
    maxHR: Math.round(maxHR * (maxPercent / 100)),
    color: ZONE_COLORS[zone as keyof typeof ZONE_COLORS],
  }));
}
