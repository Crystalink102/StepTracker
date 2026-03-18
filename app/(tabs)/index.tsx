export { ErrorBoundary } from '@/src/components/ui/TabErrorBoundary';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import XPCard from '@/src/components/home/XPCard';
import StepGoalRing from '@/src/components/home/StepGoalRing';
import StepCounter from '@/src/components/home/StepCounter';
import LastRunCard from '@/src/components/home/LastRunCard';
import StreakCard from '@/src/components/home/StreakCard';
import RunningStreakCard from '@/src/components/home/RunningStreakCard';
import WeeklyDistanceCard from '@/src/components/home/WeeklyDistanceCard';
import TrainingLoadCard from '@/src/components/home/TrainingLoadCard';
import WeeklySummaryCard from '@/src/components/home/WeeklySummaryCard';
import ChallengesHomeCard from '@/src/components/challenges/ChallengesHomeCard';
import StreakPopup from '@/src/components/home/StreakPopup';
import AchievementPopup from '@/src/components/achievements/AchievementPopup';
import Confetti from '@/src/components/ui/Confetti';
import { OfflineBanner } from '@/src/components/ui';
import OfflineQueueCard from '@/src/components/home/OfflineQueueCard';
import { useStreak } from '@/src/hooks/useStreak';
import { useAchievements } from '@/src/hooks/useAchievements';
import { useXP } from '@/src/hooks/useXP';
import { useCelebration } from '@/src/hooks/useCelebration';
import { useNetwork } from '@/src/context/NetworkContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import { useProfile } from '@/src/hooks/useProfile';
import { useAuth } from '@/src/context/AuthContext';
import { useActivity } from '@/src/context/ActivityContext';
import { useToast } from '@/src/hooks/useToast';
import { playButtonPress } from '@/src/utils/sounds';
import * as ActivityService from '@/src/services/activity.service';
import { Activity } from '@/src/types/database';
import { playLevelUp } from '@/src/utils/sounds';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { getMidnightCT, getCTDateParts } from '@/src/utils/date-helpers';

function getStartOfWeek(weekStartsMonday: boolean): Date {
  const { dayOfWeek } = getCTDateParts();
  const diff = weekStartsMonday
    ? (dayOfWeek === 0 ? 6 : dayOfWeek - 1) // Monday-based
    : dayOfWeek; // Sunday-based
  const midnight = getMidnightCT();
  return new Date(midnight.getTime() - diff * 24 * 60 * 60 * 1000);
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { streak, showPopup, dismissPopup, freezeUsed, freezeAvailable, freezeEnabled } = useStreak();
  const { pendingPopup, dismissPopup: dismissAchievement, refresh: refreshAchievements } = useAchievements();
  const { isOnline } = useNetwork();
  const { level, isLoading: xpLoading, refresh: refreshXP } = useXP();
  const { preferences } = usePreferences();
  const { profile, refresh: refreshProfile } = useProfile();
  const { user } = useAuth();
  const router = useRouter();
  const { showConfetti, celebrate, onConfettiComplete } = useCelebration();
  const { startActivity, isActive } = useActivity();
  const { showToast } = useToast();
  const prevLevelRef = useRef(level);
  const [refreshing, setRefreshing] = useState(false);
  const [weekActivities, setWeekActivities] = useState<Activity[]>([]);
  const [quickStarting, setQuickStarting] = useState(false);
  const [hasBackgroundLocation, setHasBackgroundLocation] = useState(true); // default to showing steps
  const [lastRun, setLastRun] = useState<Activity | null>(null);

  const handleQuickStart = useCallback(async (type: 'run' | 'walk') => {
    if (quickStarting || isActive) return;
    playButtonPress(preferences.hapticFeedback);
    setQuickStarting(true);
    try {
      await startActivity(type);
      showToast(`${type === 'run' ? 'Run' : 'Walk'} started!`, 'success');
      router.push('/(tabs)/activity' as any);
    } catch (err: any) {
      showToast(err.message || 'Could not start. Check location permissions.', 'error');
    } finally {
      setQuickStarting(false);
    }
  }, [startActivity, isActive, quickStarting, preferences.hapticFeedback, showToast, router]);

  // Check background location permission to decide home screen layout
  useEffect(() => {
    if (Platform.OS === 'web') {
      setHasBackgroundLocation(true); // web always shows steps
      return;
    }
    (async () => {
      try {
        const { status } = await Location.getBackgroundPermissionsAsync();
        setHasBackgroundLocation(status === 'granted');
      } catch {
        setHasBackgroundLocation(true); // default to steps on error
      }
    })();
  }, []);

  // Load most recent completed run/walk when not using background location
  const loadLastRun = useCallback(async () => {
    if (!user || hasBackgroundLocation) return;
    try {
      const history = await ActivityService.getActivityHistory(user.id, 1);
      setLastRun(history.length > 0 ? history[0] : null);
    } catch {
      // silently fail
    }
  }, [user, hasBackgroundLocation]);

  useEffect(() => {
    loadLastRun();
  }, [loadLastRun]);

  // Load activities for this week
  const loadWeekActivities = useCallback(async () => {
    if (!user) return;
    try {
      const all = await ActivityService.getActivityHistory(user.id, 100);
      const weekStart = getStartOfWeek(preferences.weekStartsMonday);
      const thisWeek = all.filter((a) => new Date(a.started_at) >= weekStart);
      setWeekActivities(thisWeek);
    } catch {
      // Silently fail
    }
  }, [user, preferences.weekStartsMonday]);

  useEffect(() => {
    loadWeekActivities();
  }, [loadWeekActivities]);

  const weeklyDistanceMeters = useMemo(() => {
    return weekActivities.reduce((sum, a) => sum + a.distance_meters, 0);
  }, [weekActivities]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshXP(),
        refreshProfile(),
        refreshAchievements(),
        loadWeekActivities(),
        loadLastRun(),
      ]);
    } catch {
      // Swallow errors — individual hooks handle their own
    } finally {
      setRefreshing(false);
    }
  }, [refreshXP, refreshProfile, refreshAchievements, loadWeekActivities, loadLastRun]);

  // Celebrate level-ups
  useEffect(() => {
    if (level > prevLevelRef.current && prevLevelRef.current > 0) {
      celebrate();
      playLevelUp(preferences.hapticFeedback);
    }
    prevLevelRef.current = level;
  }, [level, celebrate, preferences.hapticFeedback]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <Confetti visible={showConfetti} onComplete={onConfettiComplete} />
      {!isOnline && <OfflineBanner />}
      <OfflineQueueCard />
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
        <XPCard />
        {hasBackgroundLocation ? (
          <>
            <StepGoalRing />
            <StepCounter />
          </>
        ) : (
          <LastRunCard
            activity={lastRun}
            distanceUnit={preferences.distanceUnit}
            onStartRun={() => handleQuickStart('run')}
          />
        )}

        {/* Quick Start Card */}
        {!isActive && (
          <View style={[styles.quickStartCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.quickStartRun}
              activeOpacity={0.8}
              onPress={() => handleQuickStart('run')}
              disabled={quickStarting}
            >
              {quickStarting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="flash" size={22} color={Colors.white} />
                  <Text style={styles.quickStartRunText}>Quick Start Run</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickStartWalk, { borderColor: Colors.primary }]}
              activeOpacity={0.8}
              onPress={() => handleQuickStart('walk')}
              disabled={quickStarting}
            >
              <Ionicons name="walk" size={18} color={Colors.primary} />
              <Text style={[styles.quickStartWalkText, { color: Colors.primary }]}>Walk</Text>
            </TouchableOpacity>
          </View>
        )}

        {(weeklyDistanceMeters > 0 || (profile?.weekly_distance_goal_meters ?? 0) > 0) && (
          <WeeklyDistanceCard
            goalMeters={profile?.weekly_distance_goal_meters ?? 0}
            currentMeters={weeklyDistanceMeters}
            distanceUnit={preferences.distanceUnit}
            onSetGoal={() => router.push('/settings/personal-info' as any)}
          />
        )}
        <TrainingLoadCard />
        <WeeklySummaryCard />
        <ChallengesHomeCard />
        <StreakCard
          streak={streak}
          freezeAvailable={freezeAvailable}
          freezeEnabled={freezeEnabled}
          freezeUsed={freezeUsed}
        />
        <RunningStreakCard streak={profile?.running_streak ?? 0} />
      </ScrollView>
      <StreakPopup visible={showPopup} streak={streak} onDismiss={dismissPopup} />
      <AchievementPopup achievement={pendingPopup} onDismiss={dismissAchievement} />
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
  },
  quickStartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  quickStartRun: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  quickStartRunText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  quickStartWalk: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  quickStartWalkText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
