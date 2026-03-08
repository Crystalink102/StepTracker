import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from './useProfile';
import * as NotificationService from '@/src/services/notification.service';

export function useNotifications() {
  const { user } = useAuth();
  const { profile } = useProfile();

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    // Register push token
    NotificationService.registerPushToken(user.id).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!profile || Platform.OS === 'web') return;

    // Schedule or cancel notifications based on preferences
    if (profile.notify_daily_reminder) {
      NotificationService.scheduleDailyReminder().catch(() => {});
    }

    if (profile.notify_streak_warning) {
      NotificationService.scheduleStreakWarning().catch(() => {});
    }

    if (!profile.notify_daily_reminder && !profile.notify_streak_warning) {
      NotificationService.cancelAllNotifications().catch(() => {});
    }
  }, [profile]);
}
