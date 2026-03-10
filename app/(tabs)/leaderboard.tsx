export { ErrorBoundary } from '@/src/components/ui/TabErrorBoundary';

import { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { useLeaderboard } from '@/src/hooks/useLeaderboard';
import LeaderboardFilters from '@/src/components/leaderboard/LeaderboardFilters';
import LeaderboardPodium from '@/src/components/leaderboard/LeaderboardPodium';
import LeaderboardRow from '@/src/components/leaderboard/LeaderboardRow';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    metric,
    setMetric,
    period,
    setPeriod,
    scope,
    setScope,
    entries,
    myRank,
    isLoading,
    refresh,
  } = useLeaderboard();

  const topThree = useMemo(() => entries.slice(0, 3), [entries]);
  const rest = useMemo(() => entries.slice(3), [entries]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Ranks</Text>

      <LeaderboardFilters
        metric={metric}
        period={period}
        scope={scope}
        onMetricChange={setMetric}
        onPeriodChange={setPeriod}
        onScopeChange={setScope}
      />

      <FlatList
        data={rest}
        keyExtractor={(item) => item.user_id}
        ListHeaderComponent={
          topThree.length > 0 ? (
            <LeaderboardPodium entries={topThree} />
          ) : null
        }
        renderItem={({ item }) => (
          <LeaderboardRow
            entry={item}
            isCurrentUser={item.user_id === user?.id}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No data yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Start walking to appear on the leaderboard
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {myRank && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You're #{myRank}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
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
  footer: {
    position: 'absolute',
    bottom: 90,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    padding: Spacing.md,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});
