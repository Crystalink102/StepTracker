import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from './useProfile';
import * as NotificationService from '@/src/services/notification.service';
import * as StepService from '@/src/services/step.service';

export function useNotifications() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const responseCleanupRef = useRef<(() => void) | null>(null);
  const receivedCleanupRef = useRef<(() => void) | null>(null);

  const navigate = useCallback(
    (route: string) => {
      try {
        router.push(route as any);
      } catch {
        // Navigator might not be ready yet
      }
    },
    [router]
  );

  // Register push token on auth
  useEffect(() => {
    if (!user || Platform.OS === 'web') return;
    NotificationService.registerPushToken(user.id).catch(() => {});
  }, [user]);

  // Set up notification response listener (when user taps a notification)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Tap handler — routes user to the right screen
    NotificationService.addNotificationResponseListener(navigate).then((cleanup) => {
      responseCleanupRef.current = cleanup;
    });

    // Check if the app was launched from a notification (cold start)
    NotificationService.getLastNotificationResponse().then((route) => {
      if (route) {
        // Small delay to let the navigator mount
        setTimeout(() => navigate(route), 500);
      }
    });

    return () => {
      responseCleanupRef.current?.();
      responseCleanupRef.current = null;
    };
  }, [navigate]);

  // Foreground notification listener (optional — notifications display via the handler,
  // but this lets us do extra stuff like haptics or in-app banners later)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    NotificationService.addNotificationReceivedListener((_notification) => {
      // Could add haptic feedback or in-app toast here in the future
    }).then((cleanup) => {
      receivedCleanupRef.current = cleanup;
    });

    return () => {
      receivedCleanupRef.current?.();
      receivedCleanupRef.current = null;
    };
  }, []);

  // Schedule/cancel notifications based on user preferences
  useEffect(() => {
    if (!profile || !user || Platform.OS === 'web') return;

    const setup = async () => {
      // Cancel all existing notifications first, then re-schedule enabled ones
      await NotificationService.cancelAllScheduled();

      if (profile.notify_daily_reminder) {
        await NotificationService.scheduleDailyReminder();
      }

      if (profile.notify_streak_warning) {
        await NotificationService.scheduleStreakReminder(profile.current_streak ?? 0);
        await NotificationService.scheduleStreakWarning();
      }

      if (profile.notify_weekly_summary) {
        // Try to get this week's steps for a richer notification body
        try {
          const now = new Date();
          const dayOfWeek = now.getDay(); // 0 = Sunday
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - dayOfWeek);
          startOfWeek.setHours(0, 0, 0, 0);
          const pad = (n: number) => String(n).padStart(2, '0');
          const startDate = `${startOfWeek.getFullYear()}-${pad(startOfWeek.getMonth() + 1)}-${pad(startOfWeek.getDate())}`;
          const endDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

          const history = await StepService.getStepHistory(user.id, startDate, endDate);
          const weeklySteps = history.reduce((sum, d) => sum + d.step_count, 0);
          await NotificationService.scheduleWeeklySummary(weeklySteps);
        } catch {
          // Fall back to generic message
          await NotificationService.scheduleWeeklySummary();
        }
      }
    };

    setup().catch(() => {});
  }, [
    profile?.notify_daily_reminder,
    profile?.notify_streak_warning,
    profile?.notify_weekly_summary,
    profile?.current_streak,
    user,
  ]);
}
