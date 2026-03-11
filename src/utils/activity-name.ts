import { APP_TIMEZONE } from './date-helpers';

/**
 * Generate an auto-name for an activity based on time of day and type.
 * Follows Strava's naming convention: "Morning Run", "Lunch Walk", etc.
 */
export function generateActivityName(
  type: string,
  startedAt: string | Date
): string {
  const d = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;

  // Get hour in Central Time
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  }).format(d);
  const hour = parseInt(hourStr, 10);

  let timeOfDay: string;
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'Morning';
  } else if (hour >= 12 && hour < 14) {
    timeOfDay = 'Lunch';
  } else if (hour >= 14 && hour < 17) {
    timeOfDay = 'Afternoon';
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'Evening';
  } else {
    timeOfDay = 'Night';
  }

  const typeLabel = type === 'run' ? 'Run' : type === 'walk' ? 'Walk' : type.charAt(0).toUpperCase() + type.slice(1);

  return `${timeOfDay} ${typeLabel}`;
}

/** Activity subtypes with display labels */
export const ACTIVITY_SUBTYPES = {
  run: [
    { value: 'easy_run', label: 'Easy Run' },
    { value: 'long_run', label: 'Long Run' },
    { value: 'tempo', label: 'Tempo Run' },
    { value: 'intervals', label: 'Intervals' },
    { value: 'fartlek', label: 'Fartlek' },
    { value: 'trail_run', label: 'Trail Run' },
    { value: 'track', label: 'Track' },
    { value: 'race', label: 'Race' },
    { value: 'recovery', label: 'Recovery Run' },
  ],
  walk: [
    { value: 'walk', label: 'Walk' },
    { value: 'hike', label: 'Hike' },
    { value: 'power_walk', label: 'Power Walk' },
  ],
} as const;

export const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Everyone', icon: 'globe-outline' as const },
  { value: 'friends', label: 'Friends', icon: 'people-outline' as const },
  { value: 'private', label: 'Only Me', icon: 'lock-closed-outline' as const },
] as const;

/** Get a subtype label from its value */
export function getSubtypeLabel(subtype: string | null): string | null {
  if (!subtype) return null;
  for (const list of Object.values(ACTIVITY_SUBTYPES)) {
    const found = list.find((s) => s.value === subtype);
    if (found) return found.label;
  }
  return subtype;
}
