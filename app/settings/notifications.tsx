import { useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/hooks/useProfile';
import * as ProfileService from '@/src/services/profile.service';
import * as NotificationService from '@/src/services/notification.service';
import { Profile } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type NotifSetting = {
  key: keyof Pick<Profile, 'notify_daily_reminder' | 'notify_streak_warning' | 'notify_achievements' | 'notify_friend_requests' | 'notify_weekly_summary'>;
  label: string;
  description: string;
};

const SETTINGS: NotifSetting[] = [
  {
    key: 'notify_daily_reminder',
    label: 'Daily Reminder',
    description: 'Get reminded to walk every evening',
  },
  {
    key: 'notify_streak_warning',
    label: 'Streak Warning',
    description: "Alert when you haven't opened the app today",
  },
  {
    key: 'notify_achievements',
    label: 'Achievements',
    description: 'Notify when you unlock an achievement',
  },
  {
    key: 'notify_friend_requests',
    label: 'Friend Requests',
    description: 'Notify when someone sends you a friend request',
  },
  {
    key: 'notify_weekly_summary',
    label: 'Weekly Summary',
    description: 'Sunday morning recap of your week',
  },
];

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile, refresh: refreshProfile } = useProfile();
  const [optimistic, setOptimistic] = useState<Partial<Record<NotifSetting['key'], boolean>>>({});
  const [isSending, setIsSending] = useState(false);

  const handleToggle = async (key: NotifSetting['key'], value: boolean) => {
    if (!user || !profile) return;

    // Optimistic update
    setOptimistic((prev) => ({ ...prev, [key]: value }));

    try {
      // Save preference to DB
      await ProfileService.updateProfile(user.id, { [key]: value });
      await refreshProfile();
      // The useNotifications hook reacts to profile changes and
      // will automatically cancel/re-schedule notifications
    } catch {
      // Revert on error
      setOptimistic((prev) => ({ ...prev, [key]: !value }));
    }
  };

  const getValue = (key: NotifSetting['key']): boolean => {
    if (key in optimistic) return optimistic[key]!;
    return profile?.[key] ?? true;
  };

  const handleTestNotification = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Push notifications are not available on web.');
      return;
    }

    setIsSending(true);
    try {
      const permission = await NotificationService.getPermissionStatus();
      if (permission !== 'granted') {
        const granted = await NotificationService.requestPermissions();
        if (!granted) {
          Alert.alert(
            'Permissions Required',
            'Please enable notifications in your device settings to receive push notifications.'
          );
          setIsSending(false);
          return;
        }
      }

      await NotificationService.sendLocalNotification(
        'Test Notification \u{1F6CE}\u{FE0F}',
        'If you see this, notifications are working!',
        { type: 'daily_reminder' }
      );
    } catch {
      Alert.alert('Error', 'Failed to send test notification. Make sure notification permissions are enabled.');
    } finally {
      setIsSending(false);
    }
  };

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {SETTINGS.map((setting) => (
        <View key={setting.key} style={[styles.row, { borderBottomColor: colors.surface }]}>
          <View style={styles.textSection}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{setting.label}</Text>
            <Text style={[styles.description, { color: colors.textMuted }]}>{setting.description}</Text>
          </View>
          <Switch
            value={getValue(setting.key)}
            onValueChange={(val) => handleToggle(setting.key, val)}
            trackColor={{ false: colors.surfaceLight, true: Colors.primaryLight }}
            thumbColor={getValue(setting.key) ? Colors.primary : colors.textMuted}
          />
        </View>
      ))}

      {/* Test Notification Button */}
      <TouchableOpacity
        style={[styles.testButton, isSending && styles.testButtonDisabled]}
        onPress={handleTestNotification}
        disabled={isSending}
        activeOpacity={0.7}
      >
        {isSending ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        )}
      </TouchableOpacity>

      {Platform.OS === 'web' && (
        <Text style={[styles.webNote, { color: colors.textMuted }]}>
          Push notifications are only available on iOS and Android.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xxl,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  textSection: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  label: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
  },
  description: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  testButton: {
    marginTop: Spacing.xxxl,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  webNote: {
    marginTop: Spacing.lg,
    fontSize: FontSize.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
