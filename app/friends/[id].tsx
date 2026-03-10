import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/src/services/supabase';
import { removeFriend } from '@/src/services/social.service';
import { useAuth } from '@/src/context/AuthContext';
import { Avatar, Badge, Button, Card, ConfirmModal } from '@/src/components/ui';
import { formatNumber, formatDistance } from '@/src/utils/formatters';
import { usePreferences } from '@/src/context/PreferencesContext';
import { formatDate, formatRelativeDate } from '@/src/utils/date-helpers';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '@/src/constants/theme';
import type { Profile, Activity } from '@/src/types/database';

type FriendStats = {
  totalXP: number;
  totalSteps: number;
  totalActivities: number;
  currentStreak: number;
  level: number;
};

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<FriendStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const { preferences } = usePreferences();
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    if (!id || !user) return;

    let cancelled = false;

    async function load() {
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (profileError) throw profileError;
        if (cancelled) return;
        setProfile(profileData);

        // Fetch XP / level
        const { data: xpData } = await supabase
          .from('user_xp')
          .select('total_xp, current_level')
          .eq('user_id', id)
          .single();

        // Fetch total steps
        const { data: stepsData } = await supabase
          .from('daily_steps')
          .select('step_count')
          .eq('user_id', id);

        const totalSteps = (stepsData ?? []).reduce(
          (sum, row) => sum + (row.step_count ?? 0),
          0
        );

        // Fetch completed activities count
        const { count: activityCount } = await supabase
          .from('activities')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', id)
          .eq('status', 'completed');

        // Fetch recent 5 completed activities
        const { data: recentData } = await supabase
          .from('activities')
          .select('*')
          .eq('user_id', id)
          .eq('status', 'completed')
          .order('started_at', { ascending: false })
          .limit(5);

        // Fetch friendship record
        const { data: friendshipData } = await supabase
          .from('friendships')
          .select('id')
          .eq('status', 'accepted')
          .or(
            `and(requester_id.eq.${user!.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user!.id})`
          )
          .limit(1)
          .single();

        if (cancelled) return;

        setStats({
          totalXP: xpData?.total_xp ?? 0,
          totalSteps,
          totalActivities: activityCount ?? 0,
          currentStreak: profileData.current_streak ?? 0,
          level: xpData?.current_level ?? 1,
        });

        setRecentActivities(recentData ?? []);
        setFriendshipId(friendshipData?.id ?? null);
      } catch (err) {
        console.warn('[FriendProfile] Failed to load:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const handleRemoveFriend = async () => {
    if (!friendshipId) return;
    setRemoving(true);
    try {
      await removeFriend(friendshipId);
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to remove friend.');
    } finally {
      setRemoving(false);
      setConfirmVisible(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Avatar
          uri={profile.avatar_url}
          name={profile.display_name || profile.username}
          size={96}
        />
        <Text style={styles.displayName}>
          {profile.display_name || profile.username || 'Unknown'}
        </Text>
        {profile.username && (
          <Text style={styles.username}>@{profile.username}</Text>
        )}
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        <View style={styles.badgeRow}>
          <Badge label={`Level ${stats?.level ?? 1}`} variant="primary" />
          <Badge
            label={`Joined ${formatDate(profile.created_at)}`}
            variant="muted"
          />
        </View>
      </View>

      {/* Stats Grid */}
      <Card style={styles.statsCard}>
        <Text style={styles.sectionTitle}>STATS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatNumber(stats?.totalXP ?? 0)}
            </Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatNumber(stats?.totalSteps ?? 0)}
            </Text>
            <Text style={styles.statLabel}>Total Steps</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatNumber(stats?.totalActivities ?? 0)}
            </Text>
            <Text style={styles.statLabel}>Activities</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats?.currentStreak ?? 0}
            </Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>
      </Card>

      {/* Recent Activities */}
      <Card style={styles.activitiesCard}>
        <Text style={styles.sectionTitle}>RECENT ACTIVITIES</Text>
        {recentActivities.length === 0 ? (
          <Text style={styles.emptyText}>No recent activities</Text>
        ) : (
          recentActivities.map((activity) => (
            <View key={activity.id} style={styles.activityRow}>
              <View style={styles.activityIcon}>
                <Text style={styles.activityEmoji}>
                  {activity.type === 'run' ? '\u{1F3C3}' : '\u{1F6B6}'}
                </Text>
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityType}>
                  {activity.type === 'run' ? 'Run' : 'Walk'}
                </Text>
                <Text style={styles.activityDate}>
                  {formatRelativeDate(activity.started_at)}
                </Text>
              </View>
              <View style={styles.activityStats}>
                <Text style={styles.activityDistance}>
                  {formatDistance(activity.distance_meters, preferences.distanceUnit)}
                </Text>
                <Text style={styles.activityDuration}>
                  {Math.floor(activity.duration_seconds / 60)} min
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Remove Friend */}
      {friendshipId && (
        <Button
          title="Remove Friend"
          onPress={() => setConfirmVisible(true)}
          variant="danger"
          isLoading={removing}
          style={styles.removeButton}
        />
      )}

      <ConfirmModal
        visible={confirmVisible}
        title="Remove Friend"
        message={`Are you sure you want to remove ${profile.display_name || profile.username || 'this user'} as a friend?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleRemoveFriend}
        onCancel={() => setConfirmVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: Spacing.xxxl * 2,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: FontSize.lg,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  displayName: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.md,
  },
  username: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
  },
  bio: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statsCard: {
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    paddingVertical: Spacing.sm,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  activitiesCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityEmoji: {
    fontSize: 16,
  },
  activityInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  activityType: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  activityDate: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  activityStats: {
    alignItems: 'flex-end',
  },
  activityDistance: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  activityDuration: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  removeButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
  },
});
