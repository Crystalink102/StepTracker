import AsyncStorage from '@react-native-async-storage/async-storage';

export type WorkoutTemplate = {
  id: string;
  name: string;
  runDuration: number;
  restDuration: number;
  intervals: number;
  warmupDuration: number;
  cooldownDuration: number;
  isPreset?: boolean;
};

const STORAGE_KEY = 'workout_templates';

/** Built-in presets that are always available */
export const PRESET_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'preset-5k-speed',
    name: '5K Speedwork',
    runDuration: 180, // 3 min hard
    restDuration: 180, // 3 min easy
    intervals: 6,
    warmupDuration: 600, // 10 min warmup
    cooldownDuration: 300, // 5 min cooldown
    isPreset: true,
  },
  {
    id: 'preset-800m-repeats',
    name: '800m Repeats',
    runDuration: 180,
    restDuration: 120,
    intervals: 8,
    warmupDuration: 600,
    cooldownDuration: 300,
    isPreset: true,
  },
  {
    id: 'preset-tempo-intervals',
    name: 'Tempo Intervals',
    runDuration: 600, // 10 min tempo
    restDuration: 120, // 2 min jog
    intervals: 3,
    warmupDuration: 600,
    cooldownDuration: 300,
    isPreset: true,
  },
  {
    id: 'preset-fartlek',
    name: 'Classic Fartlek',
    runDuration: 60, // 1 min fast
    restDuration: 90, // 1:30 easy
    intervals: 10,
    warmupDuration: 600,
    cooldownDuration: 300,
    isPreset: true,
  },
  {
    id: 'preset-pyramid',
    name: 'Pyramid (1-2-3-2-1)',
    runDuration: 120, // 2 min avg
    restDuration: 90,
    intervals: 5,
    warmupDuration: 600,
    cooldownDuration: 300,
    isPreset: true,
  },
  {
    id: 'preset-hiit',
    name: 'HIIT Sprint',
    runDuration: 30, // 30s all-out
    restDuration: 90, // 1:30 recovery
    intervals: 8,
    warmupDuration: 300,
    cooldownDuration: 300,
    isPreset: true,
  },
];

/**
 * Get all templates (presets + user-saved).
 */
export async function getTemplates(): Promise<WorkoutTemplate[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const userTemplates: WorkoutTemplate[] = stored ? JSON.parse(stored) : [];
    return [...PRESET_TEMPLATES, ...userTemplates];
  } catch {
    return PRESET_TEMPLATES;
  }
}

/**
 * Save a custom workout template.
 */
export async function saveTemplate(template: Omit<WorkoutTemplate, 'id'>): Promise<WorkoutTemplate> {
  const newTemplate: WorkoutTemplate = {
    ...template,
    id: `custom-${Date.now()}`,
  };

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const existing: WorkoutTemplate[] = stored ? JSON.parse(stored) : [];
    existing.push(newTemplate);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('[Templates] Save failed:', err);
  }

  return newTemplate;
}

/**
 * Delete a custom template (presets can't be deleted).
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const existing: WorkoutTemplate[] = stored ? JSON.parse(stored) : [];
    const filtered = existing.filter((t) => t.id !== templateId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('[Templates] Delete failed:', err);
  }
}

/**
 * Format total workout duration.
 */
export function templateTotalDuration(t: WorkoutTemplate): number {
  // No rest after the last interval (matches useIntervalTimer schedule)
  return t.warmupDuration + t.runDuration * t.intervals + t.restDuration * Math.max(0, t.intervals - 1) + t.cooldownDuration;
}

/**
 * Format duration as "Xm" or "Xm Ys".
 */
export function formatTemplateDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}
