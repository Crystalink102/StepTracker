export { ErrorBoundary } from '@/src/components/ui/TabErrorBoundary';

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/hooks/useProfile';
import { useStepStats } from '@/src/hooks/useStepStats';
import { usePreferences } from '@/src/context/PreferencesContext';
import RunListItem from '@/src/components/history/RunListItem';
import PersonalBestBadge from '@/src/components/history/PersonalBestBadge';
import PeriodSelector from '@/src/components/stats/PeriodSelector';
import BarChart from '@/src/components/stats/BarChart';
import StatsSummary from '@/src/components/stats/StatsSummary';
import TrainingCalendar from '@/src/components/history/TrainingCalendar';
import * as ActivityService from '@/src/services/activity.service';
import * as PBService from '@/src/services/personal-best.service';
import { Activity, PersonalBest } from '@/src/types/database';
import { EmptyState } from '@/src/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

function ViewToggle({
  mode,
  onChangeMode,
}: {
  mode: 'list' | 'calendar';
  onChangeMode: (m: 'list' | 'calendar') => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.viewToggleRow}>
      <TouchableOpacity
        style={[
          styles.viewToggleBtn,
          { backgroundColor: colors.surface },
          mode === 'list' && { backgroundColor: Colors.primary },
        ]}
        onPress={() => onChangeMode('list')}
      >
        <Ionicons name="list" size={16} color={mode === 'list' ? '#FFF' : colors.textMuted} />
        <Text style={[styles.viewToggleText, { color: mode === 'list' ? '#FFF' : colors.textMuted }]}>List</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.viewToggleBtn,
          { backgroundColor: colors.surface },
          mode === 'calendar' && { backgroundColor: Colors.primary },
        ]}
        onPress={() => onChangeMode('calendar')}
      >
        <Ionicons name="calendar" size={16} color={mode === 'calendar' ? '#FFF' : colors.textMuted} />
        <Text style={[styles.viewToggleText, { color: mode === 'calendar' ? '#FFF' : colors.textMuted }]}>Calendar</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { profile } = useProfile();
  const { preferences } = usePreferences();
  const { period, setPeriod, data: stepData, average, bestDay, total } = useStepStats();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const [routes, setRoutes] = useState<Record<string, { latitude: number; longitude: number }[]>>({});

  const filteredActivities = showFavoritesOnly
    ? activities.filter((a) => a.is_favorite)
    : activities;

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [acts, pbs] = await Promise.all([
        ActivityService.getActivityHistory(user.id),
        PBService.getPersonalBests(user.id),
      ]);
      setActivities(acts);
      setPersonalBests(pbs);

      // Batch-load routes for all activities (single query)
      if (acts.length > 0) {
        const routeData = await ActivityService.getRoutesForActivities(
          acts.map((a) => a.id)
        );
        setRoutes(routeData);
      }
    } catch (err) {
      console.warn('[History] Failed to load data:', err);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {viewMode === 'calendar' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>History</Text>

          <ViewToggle mode={viewMode} onChangeMode={setViewMode} />

          <TrainingCalendar activities={activities} distanceUnit={preferences.distanceUnit} />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>History</Text>

              <ViewToggle mode={viewMode} onChangeMode={setViewMode} />

              <View style={styles.statsSection}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>STEP STATS</Text>
                <PeriodSelector period={period} onSelect={setPeriod} />
                <BarChart data={stepData} goal={profile?.daily_step_goal ?? 10000} />
                <StatsSummary average={average} bestDay={bestDay} total={total} />
              </View>

              {personalBests.length > 0 && (
                <View style={styles.pbSection}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PERSONAL BESTS</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pbList}
                  >
                    {personalBests.map((pb) => (
                      <PersonalBestBadge key={pb.id} pb={pb} />
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.activitiesHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 0 }]}>
                  {showFavoritesOnly ? 'FAVORITES' : 'RECENT ACTIVITIES'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  style={[styles.filterButton, showFavoritesOnly && { backgroundColor: Colors.primary }]}
                >
                  <Ionicons
                    name={showFavoritesOnly ? 'star' : 'star-outline'}
                    size={14}
                    color={showFavoritesOnly ? '#FFF' : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </>
          }
          renderItem={({ item }) => (
            <RunListItem
              activity={item}
              route={routes[item.id]}
              onPress={() => router.push(`/run/${item.id}` as any)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title="No Activities Yet"
              subtitle="Start a run or walk to see your history here"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.xxxl,
  },
  screenTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  statsSection: {
    marginBottom: Spacing.xxl,
  },
  pbSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  pbList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  viewToggleText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
