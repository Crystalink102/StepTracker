import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from './useProfile';
import * as NotificationService from '@/src/services/notification.service';
import * as StepService from '@/src/services/step.service';

export function useNotifications() {
  const { user } = useAuth();
  const { profile } = useProfile();

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    // Register push token
    NotificationService.registerPushToken(user.id).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!profile || !user || Platform.OS === 'web') return;

    // Cancel all existing notifications first, then re-schedule enabled ones
    NotificationService.cancelAllNotifications().catch(() => {});

    // Schedule or cancel notifications based on preferences
    if (profile.notify_daily_reminder) {
      NotificationService.scheduleDailyReminder().catch(() => {});
    }

    if (profile.notify_streak_warning) {
      NotificationService.scheduleStreakWarning().catch(() => {});
    }

    // Weekly summary notification
    if (profile.notify_weekly_summary) {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, '0');
      const startDate = `${startOfWeek.getFullYear()}-${pad(startOfWeek.getMonth() + 1)}-${pad(startOfWeek.getDate())}`;
      const endDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      StepService.getStepHistory(user.id, startDate, endDate)
        .then((history) => {
          const weeklySteps = history.reduce((sum, d) => sum + d.step_count, 0);
          return NotificationService.scheduleWeeklySummary(weeklySteps);
        })
        .catch(() => {});
    }

  }, [profile, user]);
}
