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

    const setup = async () => {
      // Cancel all existing notifications first, then re-schedule enabled ones
      await NotificationService.cancelAllNotifications();

      if (profile.notify_daily_reminder) {
        await NotificationService.scheduleDailyReminder();
      }

      if (profile.notify_streak_warning) {
        await NotificationService.scheduleStreakWarning();
      }

      if (profile.notify_weekly_summary) {
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
      }
    };

    setup().catch(() => {});
  }, [profile, user]);
}
