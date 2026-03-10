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

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'achievement'
  | 'friend_request'
  | 'streak'
  | 'weekly_summary'
  | 'daily_reminder';

export type NotificationData = {
  type: NotificationType;
  [key: string]: unknown;
};

// Map notification types to screen routes
const NOTIFICATION_ROUTES: Record<NotificationType, string> = {
  achievement: '/achievements',
  friend_request: '/friends/requests',
  streak: '/(tabs)',
  weekly_summary: '/(tabs)/stats',
  daily_reminder: '/(tabs)',
};

// ─── Push Token Registration ──────────────────────────────────────────────────

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

// ─── Scheduled Notifications ──────────────────────────────────────────────────

export async function scheduleDailyReminder(): Promise<void> {
  const notif = await getNotifications();
  if (!notif) return;

  await notif.scheduleNotificationAsync({
    content: {
      title: "Don't forget to walk!",
      body: 'Open 5tepTracker to log your steps and keep your streak alive.',
      data: { type: 'daily_reminder' } as NotificationData,
    },
    trigger: {
      type: notif.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

export async function scheduleStreakReminder(currentStreak: number): Promise<void> {
  const notif = await getNotifications();
  if (!notif) return;

  const streakText = currentStreak > 0
    ? `your ${currentStreak}-day streak alive!`
    : 'building a new streak!';

  await notif.scheduleNotificationAsync({
    content: {
      title: "Don't lose your streak! \u{1F525}",
      body: `You haven't logged any steps today. Open the app to keep ${streakText}`,
      data: { type: 'streak' } as NotificationData,
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
      data: { type: 'streak' } as NotificationData,
    },
    trigger: {
      type: notif.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 30,
    },
  });
}

export async function scheduleWeeklySummary(weeklySteps?: number): Promise<void> {
  const notif = await getNotifications();
  if (!notif) return;

  const body = weeklySteps != null && weeklySteps > 0
    ? `You walked ${weeklySteps.toLocaleString('en-US')} steps this week. Keep it up!`
    : 'Check out how you did this week!';

  await notif.scheduleNotificationAsync({
    content: {
      title: 'Your Weekly Summary \u{1F4CA}',
      body,
      data: { type: 'weekly_summary' } as NotificationData,
    },
    trigger: {
      type: notif.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour: 10,
      minute: 0,
    },
  });
}

// ─── Immediate Local Notifications ────────────────────────────────────────────

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: NotificationData
): Promise<void> {
  const notif = await getNotifications();
  if (!notif) return;

  await notif.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
    },
    trigger: null,
  });
}

export async function sendAchievementNotification(
  title: string,
  xpReward: number
): Promise<void> {
  await sendLocalNotification(
    'Achievement Unlocked! \u{1F3C6}',
    `${title}${xpReward > 0 ? ` \u2022 +${xpReward} XP` : ''}`,
    { type: 'achievement' }
  );
}

// ─── Cancel Notifications ─────────────────────────────────────────────────────

export async function cancelAllNotifications(): Promise<void> {
  const notif = await getNotifications();
  if (!notif) return;
  await notif.cancelAllScheduledNotificationsAsync();
}

export async function cancelAllScheduled(): Promise<void> {
  return cancelAllNotifications();
}

// ─── Notification Response Handling ───────────────────────────────────────────

/**
 * Returns the route to navigate to based on the notification data.
 * The caller is responsible for actually performing the navigation.
 */
export function getRouteForNotification(
  data: Record<string, unknown> | undefined
): string | null {
  if (!data || !data.type) return null;
  const notifType = data.type as NotificationType;
  return NOTIFICATION_ROUTES[notifType] ?? null;
}

/**
 * Sets up the notification response listener (when user taps a notification).
 * Returns a cleanup function.
 *
 * @param navigate - A function that receives a route string and navigates to it.
 */
export async function addNotificationResponseListener(
  navigate: (route: string) => void
): Promise<(() => void) | null> {
  const notif = await getNotifications();
  if (!notif) return null;

  const subscription = notif.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined;
    const route = getRouteForNotification(data);
    if (route) {
      navigate(route);
    }
  });

  return () => subscription.remove();
}

/**
 * Checks if there was a notification response that launched the app (cold start).
 * Returns the route to navigate to, or null.
 */
export async function getLastNotificationResponse(): Promise<string | null> {
  const notif = await getNotifications();
  if (!notif) return null;

  const response = await notif.getLastNotificationResponseAsync();
  if (!response) return null;

  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  return getRouteForNotification(data);
}

// ─── Notification Listeners ───────────────────────────────────────────────────

/**
 * Adds a foreground notification listener. Returns a cleanup function.
 */
export async function addNotificationReceivedListener(
  callback: (notification: { title: string | null; body: string | null; data: Record<string, unknown> }) => void
): Promise<(() => void) | null> {
  const notif = await getNotifications();
  if (!notif) return null;

  const subscription = notif.addNotificationReceivedListener((notification) => {
    callback({
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: (notification.request.content.data ?? {}) as Record<string, unknown>,
    });
  });

  return () => subscription.remove();
}

// ─── Permission Helpers ───────────────────────────────────────────────────────

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const notif = await getNotifications();
  if (!notif) return 'denied';

  try {
    const { status } = await notif.getPermissionsAsync();
    return status as 'granted' | 'denied' | 'undetermined';
  } catch {
    return 'denied';
  }
}

export async function requestPermissions(): Promise<boolean> {
  const notif = await getNotifications();
  if (!notif) return false;

  try {
    const { status } = await notif.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}
