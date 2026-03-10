import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import type { DistanceUnit } from '@/src/context/PreferencesContext';

const KM_TO_MI = 0.621371;

// --- State ---

let enabled = false;
const announcedMilestones = new Set<number>();

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
      ? paceSecPerKm / KM_TO_MI // sec/km → sec/mi
      : paceSecPerKm;

    const paceText = formatPaceForSpeech(paceInUnit);
    const paceUnit = useMiles ? 'per mile' : 'per kilometer';

    const message = `${m} ${label}. Pace: ${paceText} ${paceUnit}`;
    speak(message);
  }
}

// --- Internal helpers ---

/**
 * Convert pace in seconds to a natural speech string.
 * e.g. 330 → "5 minutes 30 seconds"
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
