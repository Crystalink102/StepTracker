import { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useXP } from '@/src/hooks/useXP';
import { useAchievements } from '@/src/hooks/useAchievements';
import { useFriends } from '@/src/hooks/useFriends';
import ProfileHeader from '@/src/components/profile/ProfileHeader';
import StatsOverview from '@/src/components/profile/StatsOverview';
import { Badge } from '@/src/components/ui';
import * as ProfileService from '@/src/services/profile.service';
import { Profile } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { level, totalXP } = useXP();
  const { earnedCount, totalCount } = useAchievements();
  const { pendingCount } = useFriends();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    ProfileService.getProfile(user.id)
      .then(setProfile)
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
          totalSteps={0}
          totalActivities={0}
          totalDistanceKm={0}
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
