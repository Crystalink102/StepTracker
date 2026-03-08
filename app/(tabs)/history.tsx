import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/hooks/useProfile';
import { useStepStats } from '@/src/hooks/useStepStats';
import RunListItem from '@/src/components/history/RunListItem';
import PersonalBestBadge from '@/src/components/history/PersonalBestBadge';
import PeriodSelector from '@/src/components/stats/PeriodSelector';
import BarChart from '@/src/components/stats/BarChart';
import StatsSummary from '@/src/components/stats/StatsSummary';
import * as ActivityService from '@/src/services/activity.service';
import * as PBService from '@/src/services/personal-best.service';
import { Activity, PersonalBest } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { profile } = useProfile();
  const { period, setPeriod, data: stepData, average, bestDay, total } = useStepStats();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [acts, pbs] = await Promise.all([
        ActivityService.getActivityHistory(user.id),
        PBService.getPersonalBests(user.id),
      ]);
      setActivities(acts);
      setPersonalBests(pbs);
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <Text style={styles.screenTitle}>History</Text>

            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>STEP STATS</Text>
              <PeriodSelector period={period} onSelect={setPeriod} />
              <BarChart data={stepData} goal={profile?.daily_step_goal ?? 10000} />
              <StatsSummary average={average} bestDay={bestDay} total={total} />
            </View>

            {personalBests.length > 0 && (
              <View style={styles.pbSection}>
                <Text style={styles.sectionTitle}>PERSONAL BESTS</Text>
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

            <Text style={styles.sectionTitle}>RECENT ACTIVITIES</Text>
          </>
        }
        renderItem={({ item }) => (
          <RunListItem
            activity={item}
            onPress={() => router.push(`/run/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No activities yet</Text>
            <Text style={styles.emptySubtext}>
              Start a run or walk to see your history here
            </Text>
          </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: Spacing.xxxl,
  },
  screenTitle: {
    color: Colors.textPrimary,
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
    color: Colors.textMuted,
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
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 2,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    marginTop: Spacing.sm,
  },
});
