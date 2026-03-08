import { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/hooks/useProfile';
import { useXP } from '@/src/hooks/useXP';
import { useAchievements } from '@/src/hooks/useAchievements';
import { useFriends } from '@/src/hooks/useFriends';
import ProfileHeader from '@/src/components/profile/ProfileHeader';
import StatsOverview from '@/src/components/profile/StatsOverview';
import { Badge } from '@/src/components/ui';
import * as StepService from '@/src/services/step.service';
import * as ActivityService from '@/src/services/activity.service';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { level, totalXP } = useXP();
  const { earnedCount, totalCount } = useAchievements();
  const { pendingCount } = useFriends();
  const router = useRouter();
  const [totalSteps, setTotalSteps] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [totalDistanceKm, setTotalDistanceKm] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Fetch all-time step total
    StepService.getStepHistory(user.id, '2000-01-01', '2099-12-31')
      .then((history) => {
        setTotalSteps(history.reduce((sum, d) => sum + d.step_count, 0));
      })
      .catch(() => {});

    // Fetch activity stats
    ActivityService.getActivityHistory(user.id, 1000)
      .then((activities) => {
        setTotalActivities(activities.length);
        const distM = activities.reduce((sum, a) => sum + (a.distance_meters || 0), 0);
        setTotalDistanceKm(distM / 1000);
      })
      .catch(() => {});
  }, [user]);

  const menuItems = [
    { label: 'Achievements', route: '/achievements' as const, badge: `${earnedCount}/${totalCount}` },
    { label: 'Friends', route: '/friends' as const, badge: pendingCount > 0 ? `${pendingCount}` : undefined },
    { label: 'Notifications', route: '/settings/notifications' as const },
  ];

  const settingsItems = [
    { label: 'Edit Profile', route: '/settings/edit-profile' as const },
    { label: 'Personal Info', route: '/settings/personal-info' as const },
    { label: 'Preferences', route: '/settings/preferences' as const },
    { label: 'Account', route: '/settings/account' as const },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader profile={profile} level={level} />

        <StatsOverview
          totalXP={totalXP}
          totalSteps={totalSteps}
          totalActivities={totalActivities}
          totalDistanceKm={totalDistanceKm}
        />

        <View style={styles.settingsSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.settingsItem}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuItemRow}>
                <Text style={styles.settingsLabel}>{item.label}</Text>
                {item.badge && (
                  <Badge label={item.badge} variant="primary" />
                )}
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>SETTINGS</Text>
          {settingsItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.settingsItem}
              onPress={() => router.push(item.route)}
            >
              <Text style={styles.settingsLabel}>{item.label}</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  settingsSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  settingsLabel: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  arrow: {
    color: Colors.textMuted,
    fontSize: FontSize.xxl,
  },
});
