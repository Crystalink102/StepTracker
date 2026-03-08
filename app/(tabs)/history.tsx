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
import RunListItem from '@/src/components/history/RunListItem';
import PersonalBestBadge from '@/src/components/history/PersonalBestBadge';
import * as ActivityService from '@/src/services/activity.service';
import * as PBService from '@/src/services/personal-best.service';
import { Activity, PersonalBest } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
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
    } catch {
      // Silently fail
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
            onPress={() =>
              router.push({
                pathname: '/run/[id]' as any,
                params: { id: item.id },
              })
            }
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
