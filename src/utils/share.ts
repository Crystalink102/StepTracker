import { Share } from 'react-native';
import { Activity } from '@/src/types/database';
import { formatDistance, formatDuration, formatPace, paceUnitLabel } from '@/src/utils/formatters';
import type { DistanceUnit } from '@/src/context/PreferencesContext';

/**
 * Share an activity summary via the native share sheet.
 * Falls back to clipboard copy on web.
 */
export async function shareActivity(activity: Activity, unit: DistanceUnit): Promise<void> {
  const typeLabel = activity.type === 'run' ? 'run' : 'walk';
  const dist = formatDistance(activity.distance_meters, unit);
  const dur = formatDuration(activity.duration_seconds);

  const parts: string[] = [
    `I just completed a ${typeLabel}!`,
    `${dist} in ${dur}`,
  ];

  if (activity.avg_pace_seconds_per_km) {
    parts.push(`Pace: ${formatPace(activity.avg_pace_seconds_per_km, unit)}${paceUnitLabel(unit)}`);
  }

  if (activity.calories_estimate) {
    parts.push(`${activity.calories_estimate} cal burned`);
  }

  const message = parts.join(' | ') + ' | Tracked with 5tepTracker';

  await Share.share({ message });
}
