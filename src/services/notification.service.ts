import { Platform } from 'react-native';
import { supabase } from './supabase';

// Lazy-load expo-notifications only on native (crashes on web/Expo Go)
let Notifications: typeof import('expo-notifications') | null = null;

async function getNotifications() {
  if (Platform.OS === 'web') return null;
  if (Notifications) return Notifications;
  try {
    Notifications = await import('expo-notifications');
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    return Notifications;
  } catch {
    return null;
  }
}

export async function registerPushToken(userId: string): Promise<string | null> {
  const notif = await getNotifications();
  if (!notif) return null;

  try {
    const { status: existing } = await notif.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await notif.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    // getExpoPushTokenAsync can hang in Expo Go (SDK 53+), so add a timeout
    const tokenPromise = notif.getExpoPushTokenAsync({
      projectId: 'e5aa7eb2-9903-475b-9836-df371134c63b',
    });
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
    const tokenData = await Promise.race([tokenPromise, timeoutPromise]);

    if (!tokenData || typeof tokenData !== 'object' || !('data' in tokenData)) return null;
    const token = tokenData.data;

    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    return token;
  } catch {
    // Push notifications not supported in this environment
    return null;
  }
}

export async function scheduleDailyReminder(): Promise<void> {
  const notif = await getNotifications();
  if (!notif) return;

  await notif.scheduleNotificationAsync({
    content: {
      title: "Don't forget to walk!",
      body: 'Open 5tepTracker to log your steps and keep your streak alive.',
    },
    trigger: {
      type: notif.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

export async function scheduleStreakWarning(): Promise<void> {
  const notif = await getNotifications();
  if (!notif) return;

  await notif.scheduleNotificationAsync({
    content: {
      title: 'Streak at risk!',
      body: "You haven't opened the app today. Open now to save your streak!",
    },
    trigger: {
      type: notif.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 30,
    },
  });
}

export async function sendAchievementNotification(
  title: string,
  xpReward: number
): Promise<void> {
  const notif = await getNotifications();
  if (!notif) return;

  await notif.scheduleNotificationAsync({
    content: {
      title: 'Achievement Unlocked!',
      body: `${title}${xpReward > 0 ? ` • +${xpReward} XP` : ''}`,
    },
    trigger: null,
  });
}

export async function scheduleWeeklySummary(weeklySteps: number): Promise<void> {
  const notif = await getNotifications();
  if (!notif) return;

  // Cancel existing weekly notifications and reschedule with fresh data
  const formatted = weeklySteps.toLocaleString('en-US');

  await notif.scheduleNotificationAsync({
    content: {
      title: 'Your Week in Steps',
      body: `You walked ${formatted} steps this week. Keep it up!`,
    },
    trigger: {
      type: notif.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour: 19,
      minute: 0,
    },
  });
}

export async function cancelAllNotifications(): Promise<void> {
  const notif = await getNotifications();
  if (!notif) return;
  await notif.cancelAllScheduledNotificationsAsync();
}
