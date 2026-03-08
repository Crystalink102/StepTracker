import { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import * as ProfileService from '@/src/services/profile.service';
import { Profile } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

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
    description: 'Sunday evening recap of your week',
  },
];

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    ProfileService.getProfile(user.id)
      .then((p) => setProfile(p))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleToggle = async (key: NotifSetting['key'], value: boolean) => {
    if (!user || !profile) return;

    // Optimistic update
    setProfile({ ...profile, [key]: value });

    try {
      await ProfileService.updateProfile(user.id, { [key]: value });
    } catch {
      // Revert on error
      setProfile({ ...profile, [key]: !value });
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {SETTINGS.map((setting) => (
        <View key={setting.key} style={styles.row}>
          <View style={styles.textSection}>
            <Text style={styles.label}>{setting.label}</Text>
            <Text style={styles.description}>{setting.description}</Text>
          </View>
          <Switch
            value={profile?.[setting.key] ?? true}
            onValueChange={(val) => handleToggle(setting.key, val)}
            trackColor={{ false: Colors.surfaceLight, true: Colors.primaryLight }}
            thumbColor={profile?.[setting.key] ? Colors.primary : Colors.textMuted}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    borderBottomColor: Colors.surface,
  },
  textSection: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
  },
  description: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
});
