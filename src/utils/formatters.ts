import type { DistanceUnit } from '@/src/context/PreferencesContext';

const KM_TO_MI = 0.621371;
const M_TO_FT = 3.28084;

/**
 * Format a number with commas: 12345 → "12,345"
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Format seconds into mm:ss or h:mm:ss
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format pace as mm:ss
 * When unit is 'mi', converts from sec/km to sec/mi.
 */
export function formatPace(secondsPerKm: number, unit: DistanceUnit = 'km'): string {
  const paceValue = unit === 'mi' ? secondsPerKm / KM_TO_MI : secondsPerKm;
  const totalSeconds = Math.round(paceValue);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Pace unit label: "/km" or "/mi"
 */
export function paceUnitLabel(unit: DistanceUnit = 'km'): string {
  return unit === 'mi' ? '/mi' : '/km';
}

/**
 * Format distance: meters → "1.23 km" or "0.76 mi"
 */
export function formatDistance(meters: number, unit: DistanceUnit = 'km'): string {
  if (unit === 'mi') {
    const mi = meters * KM_TO_MI / 1000;
    if (mi >= 0.1) return `${mi.toFixed(2)} mi`;
    const ft = meters * M_TO_FT;
    return `${Math.round(ft)} ft`;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format distance short: meters → "1.2km" or "0.8mi"
 */
export function formatDistanceShort(meters: number, unit: DistanceUnit = 'km'): string {
  if (unit === 'mi') {
    const mi = meters * KM_TO_MI / 1000;
    if (mi >= 0.1) return `${mi.toFixed(1)}mi`;
    return `${Math.round(meters * M_TO_FT)}ft`;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
}

/**
 * Format speed: m/s → km/h or mph string
 */
export function formatSpeed(metersPerSecond: number, unit: DistanceUnit = 'km'): string {
  if (unit === 'mi') {
    return `${(metersPerSecond * 3.6 * KM_TO_MI).toFixed(1)} mph`;
  }
  return `${(metersPerSecond * 3.6).toFixed(1)} km/h`;
}

/**
 * Speed unit label
 */
export function speedUnitLabel(unit: DistanceUnit = 'km'): string {
  return unit === 'mi' ? 'mph' : 'km/h';
}

/**
 * Convert meters to display value in the user's preferred unit.
 * Returns the numeric value (not formatted).
 */
export function metersToDisplayDistance(meters: number, unit: DistanceUnit = 'km'): number {
  return unit === 'mi' ? meters * KM_TO_MI / 1000 : meters / 1000;
}

/**
 * Distance unit label: "kilometers" or "miles"
 */
export function distanceUnitLabel(unit: DistanceUnit = 'km'): string {
  return unit === 'mi' ? 'miles' : 'kilometers';
}

/**
 * Short distance unit: "km" or "mi"
 */
export function distanceUnitShort(unit: DistanceUnit = 'km'): string {
  return unit === 'mi' ? 'mi' : 'km';
}
