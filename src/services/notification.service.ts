import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

// Set notification handler to show in-app
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Save token to profile
  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);

  return token;
}

export async function scheduleDailyReminder(): Promise<void> {
  // Cancel existing daily reminders
  await cancelScheduledByTag('daily-reminder');

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Don't forget to walk!",
      body: 'Open StepTracker to log your steps and keep your streak alive.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

export async function scheduleStreakWarning(): Promise<void> {
  // Cancel existing streak warnings
  await cancelScheduledByTag('streak-warning');

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Streak at risk!',
      body: "You haven't opened the app today. Open now to save your streak!",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 30,
    },
  });
}

export async function sendAchievementNotification(
  title: string,
  xpReward: number
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Achievement Unlocked!',
      body: `${title}${xpReward > 0 ? ` • +${xpReward} XP` : ''}`,
    },
    trigger: null, // Immediately
  });
}

async function cancelScheduledByTag(_tag: string): Promise<void> {
  // Cancel all scheduled notifications (simple approach)
  // In a real app, you'd track IDs per tag
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    await Notifications.cancelScheduledNotificationAsync(notif.identifier);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
