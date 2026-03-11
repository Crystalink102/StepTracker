import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import type { DistanceUnit } from '@/src/context/PreferencesContext';

const KM_TO_MI = 0.621371;

// --- State ---

let enabled = false;
const announcedMilestones = new Set<number>();
const announcedHalfMilestones = new Set<number>();
const announcedTimeMilestones = new Set<number>();

// --- Public API ---

export function setAudioCuesEnabled(on: boolean) {
  enabled = on;
}

export function isAudioCuesEnabled(): boolean {
  return enabled;
}

/**
 * Reset milestone tracking. Call when an activity starts so old
 * milestones don't carry over.
 */
export function resetMilestones() {
  announcedMilestones.clear();
  announcedHalfMilestones.clear();
  announcedTimeMilestones.clear();
}

/**
 * Announce that an activity has started.
 */
export function announceStart(type: 'run' | 'walk') {
  speak(`${type === 'run' ? 'Run' : 'Walk'} started`);
}

/**
 * Announce pause.
 */
export function announcePause() {
  speak('Activity paused');
}

/**
 * Announce resume.
 */
export function announceResume() {
  speak('Activity resumed');
}

/**
 * Announce a lap completion.
 */
export function announceLap(lapNumber: number, paceSecPerKm: number, unit: DistanceUnit) {
  if (!enabled) return;
  const useMiles = unit === 'mi';
  const paceInUnit = useMiles ? paceSecPerKm / KM_TO_MI : paceSecPerKm;
  const paceText = formatPaceForSpeech(paceInUnit);
  const paceUnit = useMiles ? 'per mile' : 'per kilometer';
  speak(`Lap ${lapNumber}. Pace: ${paceText} ${paceUnit}`);
}

/**
 * Check if a new distance milestone has been reached and announce it.
 *
 * @param distanceMeters  Total distance covered so far (meters)
 * @param elapsedSeconds  Total elapsed time (seconds)
 * @param paceSecPerKm    Current pace in seconds per kilometer
 * @param unit            User's distance unit preference
 */
export function checkMilestone(
  distanceMeters: number,
  elapsedSeconds: number,
  paceSecPerKm: number,
  unit: DistanceUnit
) {
  if (!enabled) return;

  // Determine which milestone unit to use
  const useMiles = unit === 'mi';

  // Convert distance to the target unit
  const distanceInUnit = useMiles
    ? (distanceMeters / 1000) * KM_TO_MI
    : distanceMeters / 1000;

  // The latest whole-number milestone they've passed
  const currentMilestone = Math.floor(distanceInUnit);
  if (currentMilestone < 1) return;

  // Announce any milestones that haven't been announced yet
  // (in case multiple were crossed at once, e.g. GPS catch-up)
  for (let m = 1; m <= currentMilestone; m++) {
    if (announcedMilestones.has(m)) continue;
    announcedMilestones.add(m);

    const unitLabel = useMiles ? 'mile' : 'kilometer';
    const unitLabelPlural = useMiles ? 'miles' : 'kilometers';
    const label = m === 1 ? unitLabel : unitLabelPlural;

    // Build the pace string for the announced unit
    const paceInUnit = useMiles
      ? paceSecPerKm / KM_TO_MI // sec/km -> sec/mi
      : paceSecPerKm;

    const paceText = formatPaceForSpeech(paceInUnit);
    const paceUnit = useMiles ? 'per mile' : 'per kilometer';

    const elapsedText = formatElapsedForSpeech(elapsedSeconds);
    const message = `${m} ${label}. Time: ${elapsedText}. Pace: ${paceText} ${paceUnit}`;
    speak(message);
  }
}

/**
 * Check if a new half-distance milestone has been reached and announce it.
 * Same as checkMilestone but with 0.5 increments.
 */
export function checkHalfMilestone(
  distanceMeters: number,
  elapsedSeconds: number,
  paceSecPerKm: number,
  unit: DistanceUnit
) {
  if (!enabled) return;

  const useMiles = unit === 'mi';

  const distanceInUnit = useMiles
    ? (distanceMeters / 1000) * KM_TO_MI
    : distanceMeters / 1000;

  // Check half increments: 0.5, 1.0, 1.5, 2.0, etc.
  const currentHalfMilestone = Math.floor(distanceInUnit * 2); // multiply by 2 so 0.5 -> 1, 1.0 -> 2, etc.
  if (currentHalfMilestone < 1) return;

  for (let h = 1; h <= currentHalfMilestone; h++) {
    if (announcedHalfMilestones.has(h)) continue;
    announcedHalfMilestones.add(h);

    const distValue = h / 2;
    const useMilesLabel = useMiles;
    const unitLabel = useMilesLabel ? 'miles' : 'kilometers';

    // Format distance: show "0.5" or "1" or "1.5" etc.
    const distText = distValue % 1 === 0 ? `${distValue}` : distValue.toFixed(1);

    const paceInUnit = useMiles
      ? paceSecPerKm / KM_TO_MI
      : paceSecPerKm;

    const paceText = formatPaceForSpeech(paceInUnit);
    const paceUnit = useMiles ? 'per mile' : 'per kilometer';

    const elapsedText = formatElapsedForSpeech(elapsedSeconds);
    const message = `${distText} ${unitLabel}. Time: ${elapsedText}. Pace: ${paceText} ${paceUnit}`;
    speak(message);
  }
}

/**
 * Check for time-based milestones (every 5 or 10 minutes).
 */
export function checkTimeMilestone(
  elapsedSeconds: number,
  distanceMeters: number,
  paceSecPerKm: number,
  unit: DistanceUnit,
  frequency: 'every_5min' | 'every_10min'
) {
  if (!enabled) return;

  const intervalSec = frequency === 'every_5min' ? 300 : 600;
  const currentMilestone = Math.floor(elapsedSeconds / intervalSec);
  if (currentMilestone < 1) return;

  for (let m = 1; m <= currentMilestone; m++) {
    if (announcedTimeMilestones.has(m)) continue;
    announcedTimeMilestones.add(m);

    const minutes = m * (intervalSec / 60);
    const distText = formatDistanceForSpeech(distanceMeters, unit);

    const useMiles = unit === 'mi';
    const paceInUnit = useMiles ? paceSecPerKm / KM_TO_MI : paceSecPerKm;
    const paceText = formatPaceForSpeech(paceInUnit);
    const paceUnit = useMiles ? 'per mile' : 'per kilometer';

    speak(`${minutes} minutes. Distance: ${distText}. Pace: ${paceText} ${paceUnit}`);
  }
}

// --- Internal helpers ---

/**
 * Convert pace in seconds to a natural speech string.
 * e.g. 330 -> "5 minutes 30 seconds"
 */
function formatPaceForSpeech(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds);
  if (rounded <= 0 || !isFinite(rounded)) return 'unknown';
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;

  if (minutes === 0) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  if (seconds === 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
}

/**
 * Convert elapsed time to a natural speech string.
 */
function formatElapsedForSpeech(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h} hour${h > 1 ? 's' : ''} ${m} minutes`;
  if (m > 0) return `${m} minute${m > 1 ? 's' : ''}${s > 0 ? ` ${s} seconds` : ''}`;
  return `${s} seconds`;
}

/**
 * Convert distance meters to a spoken string in the user's unit.
 */
function formatDistanceForSpeech(meters: number, unit: DistanceUnit): string {
  if (unit === 'mi') {
    const mi = (meters / 1000) * KM_TO_MI;
    return `${mi.toFixed(1)} miles`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} kilometers`;
}

/**
 * Speak a message using expo-speech, respecting the enabled flag.
 */
function speak(message: string) {
  if (!enabled) return;

  // expo-speech isn't available on web in most environments
  if (Platform.OS === 'web') return;

  try {
    Speech.speak(message, {
      language: 'en-US',
      rate: 0.95,
      pitch: 1.0,
    });
  } catch (err) {
    console.warn('[AudioCues] Speech error:', err);
  }
}
