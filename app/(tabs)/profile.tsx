export { ErrorBoundary } from '@/src/components/ui/TabErrorBoundary';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View, RefreshControl } from 'react-native';
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
import { Profile } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

const COMPLETION_FIELDS: (keyof Profile)[] = [
  'display_name',
  'username',
  'avatar_url',
  'height_cm',
  'weight_kg',
  'date_of_birth',
  'bio',
  'daily_step_goal',
];

function getProfileCompletion(profile: Profile | null): number {
  if (!profile) return 0;
  let filled = 0;
  for (const field of COMPLETION_FIELDS) {
    const value = profile[field];
    if (value !== null && value !== undefined && value !== '') {
      filled++;
    }
  }
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile, refresh: refreshProfile } = useProfile();
  const { level, totalXP } = useXP();
  const { earnedCount, totalCount } = useAchievements();
  const { pendingCount } = useFriends();
  const router = useRouter();
  const [totalSteps, setTotalSteps] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [totalDistanceKm, setTotalDistanceKm] = useState(0);

  const [refreshing, setRefreshing] = useState(false);

  const completionPct = useMemo(() => getProfileCompletion(profile), [profile]);

  const loadStats = useCallback(() => {
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

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      loadStats();
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile, loadStats]);

  const menuItems = [
    { label: 'Achievements', route: '/achievements' as const, badge: `${earnedCount}/${totalCount}` },
    { label: 'Friends', route: '/friends' as const, badge: pendingCount > 0 ? `${pendingCount}` : undefined },
    { label: 'Notifications', route: '/settings/notifications' as const },
  ];

  const settingsItems = [
    { label: 'Edit Profile', route: '/settings/edit-profile' as const },
    { label: 'Personal Info', route: '/settings/personal-info' as const },
    { label: 'Gear & Shoes', route: '/settings/gear' as const },
    { label: 'Training Paces', route: '/settings/training-paces' as const },
    { label: 'Preferences', route: '/settings/preferences' as const },
    { label: 'Account', route: '/settings/account' as const },
    { label: 'Support', route: '/settings/support' as const },
    { label: 'About', route: '/settings/about' as const },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <ProfileHeader profile={profile} level={level} />

        {/* Profile completion indicator */}
        <View style={[styles.completionContainer, { backgroundColor: colors.surface }]}>
          {completionPct >= 100 ? (
            <View style={styles.completionComplete}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.completionCompleteText}>Profile complete</Text>
            </View>
          ) : (
            <>
              <View style={styles.completionHeader}>
                <Text style={[styles.completionLabel, { color: colors.textMuted }]}>Profile completion</Text>
                <Text style={styles.completionPct}>{completionPct}%</Text>
              </View>
              <View style={[styles.completionBarBg, { backgroundColor: colors.surfaceLight }]}>
                <View
                  style={[styles.completionBarFill, { width: `${completionPct}%` }]}
                />
              </View>
            </>
          )}
        </View>

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
              style={[styles.settingsItem, { backgroundColor: colors.surface }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuItemRow}>
                <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                {item.badge && (
                  <Badge label={item.badge} variant="primary" />
                )}
              </View>
              <Text style={[styles.arrow, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SETTINGS</Text>
          {settingsItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.settingsItem, { backgroundColor: colors.surface }]}
              onPress={() => router.push(item.route)}
            >
              <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <Text style={[styles.arrow, { color: colors.textMuted }]}>›</Text>
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
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  completionContainer: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  completionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  completionPct: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  completionBarBg: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  completionBarFill: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  completionComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkmark: {
    color: Colors.primary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  completionCompleteText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  settingsSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  settingsLabel: {
    fontSize: FontSize.lg,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  arrow: {
    fontSize: FontSize.xxl,
  },
});
