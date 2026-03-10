import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

async function haptic(
  style: Haptics.ImpactFeedbackStyle,
  hapticEnabled: boolean
) {
  if (!hapticEnabled || Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Haptics not available
  }
}

async function notify(
  type: Haptics.NotificationFeedbackType,
  hapticEnabled: boolean
) {
  if (!hapticEnabled || Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(type);
  } catch {
    // Haptics not available
  }
}

export async function playLevelUp(hapticEnabled = true) {
  await haptic(Haptics.ImpactFeedbackStyle.Heavy, hapticEnabled);
  setTimeout(() => notify(Haptics.NotificationFeedbackType.Success, hapticEnabled), 150);
}

export async function playAchievement(hapticEnabled = true) {
  await haptic(Haptics.ImpactFeedbackStyle.Medium, hapticEnabled);
  setTimeout(() => notify(Haptics.NotificationFeedbackType.Success, hapticEnabled), 100);
}

export async function playGoalHit(hapticEnabled = true) {
  await haptic(Haptics.ImpactFeedbackStyle.Heavy, hapticEnabled);
}

export async function playButtonPress(hapticEnabled = true) {
  await haptic(Haptics.ImpactFeedbackStyle.Light, hapticEnabled);
}
