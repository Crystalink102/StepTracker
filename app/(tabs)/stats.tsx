export { ErrorBoundary } from '@/src/components/ui/TabErrorBoundary';

import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/hooks/useProfile';
import { useXP } from '@/src/hooks/useXP';
import { usePreferences } from '@/src/context/PreferencesContext';
import * as StepService from '@/src/services/step.service';
import * as ActivityService from '@/src/services/activity.service';
import * as PersonalBestService from '@/src/services/personal-best.service';
import { PersonalBest, Activity, DailySteps } from '@/src/types/database';
import { STANDARD_DISTANCES } from '@/src/constants/config';
import WeeklyTrends from '@/src/components/stats/WeeklyTrends';
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatNumber,
  paceUnitLabel,
} from '@/src/utils/formatters';
import { activeMinutesFromSteps, distanceFromSteps } from '@/src/utils/fitness';
import { ageFromDOB, calculateMaxHR } from '@/src/utils/hr-zones';
import HRZonesReference from '@/src/components/stats/HRZonesReference';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type LifetimeStats = {
  totalSteps: number;
  totalActivities: number;
  totalRuns: number;
  totalWalks: number;
  totalDistanceM: number;
  totalDurationSec: number;
  totalCalories: number;
  totalXP: number;
  longestRunM: number;
  longestDurationSec: number;
  fastestPaceSecPerKm: number | null;
  avgPaceSecPerKm: number | null;
  currentStreak: number;
};

function computeLifetimeStats(
  activities: Activity[],
  totalSteps: number,
  currentStreak: number,
  totalXP: number
): LifetimeStats {
  let totalDistanceM = 0;
  let totalDurationSec = 0;
  let totalCalories = 0;
  let totalRuns = 0;
  let totalWalks = 0;
  let longestRunM = 0;
  let longestDurationSec = 0;
  let fastestPace: number | null = null;
  let paceSum = 0;
  let paceCount = 0;

  for (const a of activities) {
    totalDistanceM += a.distance_meters || 0;
    totalDurationSec += a.duration_seconds || 0;
    totalCalories += a.calories_estimate || 0;

    if (a.type === 'run') totalRuns++;
    else totalWalks++;

    if (a.type === 'run' && a.distance_meters > longestRunM) longestRunM = a.distance_meters;
    if (a.duration_seconds > longestDurationSec) longestDurationSec = a.duration_seconds;

    if (a.avg_pace_seconds_per_km && a.avg_pace_seconds_per_km > 0) {
      paceSum += a.avg_pace_seconds_per_km;
      paceCount++;
      if (fastestPace === null || a.avg_pace_seconds_per_km < fastestPace) {
        fastestPace = a.avg_pace_seconds_per_km;
      }
    }
  }

  return {
    totalSteps,
    totalActivities: activities.length,
    totalRuns,
    totalWalks,
    totalDistanceM,
    totalDurationSec,
    totalCalories,
    totalXP,
    longestRunM,
    longestDurationSec,
    fastestPaceSecPerKm: fastestPace,
    avgPaceSecPerKm: paceCount > 0 ? Math.round(paceSum / paceCount) : null,
    currentStreak,
  };
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { totalXP, level } = useXP();
  const { preferences } = usePreferences();
  const unit = preferences.distanceUnit;

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([]);
  const [totalSteps, setTotalSteps] = useState(0);
  const [stepHistory, setStepHistory] = useState<DailySteps[]>([]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [acts, pbs, stepHistory] = await Promise.all([
        ActivityService.getActivityHistory(user.id, 10000),
        PersonalBestService.getPersonalBests(user.id),
        StepService.getStepHistory(user.id, '2000-01-01', '2099-12-31'),
      ]);
      setActivities(acts.filter((a) => a.status === 'completed'));
      setPersonalBests(pbs);
      setStepHistory(stepHistory);
      setTotalSteps(stepHistory.reduce((sum, d) => sum + d.step_count, 0));
    } catch (err) {
      console.warn('[Stats] Failed to load:', err);
    }
  };

  useEffect(() => {
    loadData().finally(() => setIsLoading(false));
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const stats = useMemo(
    () =>
      computeLifetimeStats(
        activities,
        totalSteps,
        profile?.current_streak ?? 0,
        totalXP
      ),
    [activities, totalSteps, profile?.current_streak, totalXP]
  );

  // Build PB lookup map
  const pbMap = useMemo(() => {
    const map = new Map<string, PersonalBest>();
    for (const pb of personalBests) {
      map.set(pb.distance_label, pb);
    }
    return map;
  }, [personalBests]);

  // All trackable distances (including ones without PBs yet)
  const allDistances = Object.entries(STANDARD_DISTANCES);

  // Compute max HR from user's date of birth, or default to 190
  const userMaxHR = useMemo(() => {
    const age = ageFromDOB(profile?.date_of_birth);
    return age ? calculateMaxHR(age) : 190;
  }, [profile?.date_of_birth]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered, { backgroundColor: colors.background }]} edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const activeMinutes = activeMinutesFromSteps(totalSteps);
  const stepDistance = distanceFromSteps(totalSteps, profile?.height_cm ?? null);

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
            colors={[Colors.primary]}
          />
        }
      >
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Stats</Text>

        {/* Lifetime Overview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Lifetime</Text>
          <View style={styles.overviewGrid}>
            <OverviewCard
              icon="footsteps-outline"
              value={formatNumber(stats.totalSteps)}
              label="Total Steps"
            />
            <OverviewCard
              icon="map-outline"
              value={formatDistance(stats.totalDistanceM + stepDistance, unit)}
              label="Total Distance"
            />
            <OverviewCard
              icon="timer-outline"
              value={formatDuration(stats.totalDurationSec)}
              label="Active Time"
            />
            <OverviewCard
              icon="flame-outline"
              value={formatNumber(stats.totalCalories)}
              label="Calories"
            />
            <OverviewCard
              icon="fitness-outline"
              value={String(stats.totalRuns)}
              label="Runs"
            />
            <OverviewCard
              icon="walk-outline"
              value={String(stats.totalWalks)}
              label="Walks"
            />
            <OverviewCard
              icon="star-outline"
              value={formatNumber(stats.totalXP)}
              label="Total XP"
            />
            <OverviewCard
              icon="trending-up-outline"
              value={`Lv ${level}`}
              label="Level"
            />
            <OverviewCard
              icon="flash-outline"
              value={String(stats.currentStreak)}
              label="Day Streak"
            />
            <OverviewCard
              icon="time-outline"
              value={formatNumber(activeMinutes)}
              label="Active Min"
            />
            <OverviewCard
              icon="resize-outline"
              value={formatDistance(stats.longestRunM, unit)}
              label="Longest Run"
            />
            <OverviewCard
              icon="stopwatch-outline"
              value={formatDuration(stats.longestDurationSec)}
              label="Longest Duration"
            />
          </View>
        </View>

        {/* Weekly Trends */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Weekly Trends</Text>
          <WeeklyTrends
            activities={activities}
            stepHistory={stepHistory}
            unit={unit}
            weightKg={profile?.weight_kg ?? null}
          />
        </View>

        {/* Pace Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Pace</Text>
          <View style={styles.paceRow}>
            <View style={[styles.paceCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="speedometer-outline" size={20} color={Colors.primary} />
              <Text style={[styles.paceValue, { color: colors.textPrimary }]}>
                {stats.fastestPaceSecPerKm
                  ? `${formatPace(stats.fastestPaceSecPerKm, unit)} ${paceUnitLabel(unit)}`
                  : '--'}
              </Text>
              <Text style={[styles.paceLabel, { color: colors.textMuted }]}>Fastest Pace</Text>
            </View>
            <View style={[styles.paceCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="analytics-outline" size={20} color={Colors.primaryLight} />
              <Text style={[styles.paceValue, { color: colors.textPrimary }]}>
                {stats.avgPaceSecPerKm
                  ? `${formatPace(stats.avgPaceSecPerKm, unit)} ${paceUnitLabel(unit)}`
                  : '--'}
              </Text>
              <Text style={[styles.paceLabel, { color: colors.textMuted }]}>Average Pace</Text>
            </View>
          </View>
        </View>

        {/* Personal Bests - All Distances */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Personal Bests</Text>
          <View style={[styles.pbContainer, { backgroundColor: colors.surface }]}>
            {allDistances.map(([label, distanceM]) => {
              const pb = pbMap.get(label);
              const hasPB = !!pb;

              return (
                <View key={label} style={[styles.pbRow, { borderBottomColor: colors.surfaceLight }]}>
                  <View style={styles.pbLeft}>
                    <View style={[styles.pbIcon, { backgroundColor: colors.surfaceLight }, hasPB && styles.pbIconActive]}>
                      <Ionicons
                        name={hasPB ? 'medal' : 'ellipse-outline'}
                        size={16}
                        color={hasPB ? Colors.gold : colors.textMuted}
                      />
                    </View>
                    <View>
                      <Text style={[styles.pbDistance, { color: colors.textPrimary }, !hasPB && { color: colors.textSecondary }]}>
                        {label}
                      </Text>
                      <Text style={[styles.pbDistanceMeters, { color: colors.textMuted }]}>
                        {formatDistance(distanceM, unit)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.pbRight}>
                    {hasPB ? (
                      <>
                        <Text style={styles.pbTime}>{formatDuration(pb.best_time_seconds)}</Text>
                        <Text style={[styles.pbPace, { color: colors.textMuted }]}>
                          {formatPace(
                            (pb.best_time_seconds / distanceM) * 1000,
                            unit
                          )}{' '}
                          {paceUnitLabel(unit)}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.pbNone, { color: colors.textMuted }]}>--</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Activity Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Activity Breakdown</Text>
          <View style={[styles.breakdownContainer, { backgroundColor: colors.surface }]}>
            <BreakdownRow
              label="Total Activities"
              value={String(stats.totalActivities)}
            />
            <BreakdownRow
              label="Total Runs"
              value={String(stats.totalRuns)}
            />
            <BreakdownRow
              label="Total Walks"
              value={String(stats.totalWalks)}
            />
            <BreakdownRow
              label="Run Distance"
              value={formatDistance(
                activities
                  .filter((a) => a.type === 'run')
                  .reduce((sum, a) => sum + (a.distance_meters || 0), 0),
                unit
              )}
            />
            <BreakdownRow
              label="Walk Distance"
              value={formatDistance(
                activities
                  .filter((a) => a.type === 'walk')
                  .reduce((sum, a) => sum + (a.distance_meters || 0), 0),
                unit
              )}
            />
            <BreakdownRow
              label="Avg Run Distance"
              value={
                stats.totalRuns > 0
                  ? formatDistance(
                      activities
                        .filter((a) => a.type === 'run')
                        .reduce((sum, a) => sum + (a.distance_meters || 0), 0) /
                        stats.totalRuns,
                      unit
                    )
                  : '--'
              }
            />
            <BreakdownRow
              label="Avg Run Duration"
              value={
                stats.totalRuns > 0
                  ? formatDuration(
                      Math.round(
                        activities
                          .filter((a) => a.type === 'run')
                          .reduce((sum, a) => sum + (a.duration_seconds || 0), 0) /
                          stats.totalRuns
                      )
                    )
                  : '--'
              }
            />
          </View>
        </View>

        {/* Heart Rate Zones Reference */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Heart Rate Zones</Text>
          <HRZonesReference maxHR={userMaxHR} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Sub-components ---

function OverviewCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.overviewCard, { backgroundColor: colors.surface }]}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={[styles.overviewValue, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.overviewLabel, { color: colors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.breakdownRow, { borderBottomColor: colors.surfaceLight }]}>
      <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  screenTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },

  // Overview grid
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  overviewCard: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  overviewValue: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  overviewLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },

  // Pace
  paceRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  paceCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  paceValue: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  paceLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Personal Bests
  pbContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  pbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceLight,
  },
  pbLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pbIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pbIconActive: {
    backgroundColor: Colors.gold + '20',
  },
  pbDistance: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  pbDistanceMuted: {
    color: Colors.textSecondary,
  },
  pbDistanceMeters: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  pbRight: {
    alignItems: 'flex-end',
  },
  pbTime: {
    color: Colors.gold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  pbPace: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  pbNone: {
    color: Colors.textMuted,
    fontSize: FontSize.lg,
  },

  // Breakdown
  breakdownContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceLight,
  },
  breakdownLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  breakdownValue: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
