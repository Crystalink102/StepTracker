import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LeaderboardMetric, LeaderboardPeriod, LeaderboardScope } from '@/src/hooks/useLeaderboard';
import { usePreferences } from '@/src/context/PreferencesContext';
import { playButtonPress } from '@/src/utils/sounds';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type LeaderboardFiltersProps = {
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  scope: LeaderboardScope;
  onMetricChange: (m: LeaderboardMetric) => void;
  onPeriodChange: (p: LeaderboardPeriod) => void;
  onScopeChange: (s: LeaderboardScope) => void;
};

const METRICS: { label: string; value: LeaderboardMetric }[] = [
  { label: 'XP', value: 'xp' },
  { label: 'Steps', value: 'steps' },
  { label: 'Streak', value: 'streak' },
];

const PERIODS: { label: string; value: LeaderboardPeriod }[] = [
  { label: 'Today', value: 'daily' },
  { label: 'Week', value: 'weekly' },
  { label: 'Month', value: 'monthly' },
  { label: 'All Time', value: 'all_time' },
];

const SCOPES: { label: string; value: LeaderboardScope }[] = [
  { label: 'Global', value: 'global' },
  { label: 'Friends', value: 'friends' },
];

function PillRow<T extends string>({
  items,
  selected,
  onSelect,
  onTap,
}: {
  items: { label: string; value: T }[];
  selected: T;
  onSelect: (v: T) => void;
  onTap?: () => void;
}) {
  return (
    <View style={styles.row}>
      {items.map((item) => {
        const active = item.value === selected;
        return (
          <TouchableOpacity
            key={item.value}
            style={[styles.pill, active && styles.activePill]}
            onPress={() => {
              onTap?.();
              onSelect(item.value);
            }}
          >
            <Text style={[styles.pillText, active && styles.activePillText]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function LeaderboardFilters({
  metric,
  period,
  scope,
  onMetricChange,
  onPeriodChange,
  onScopeChange,
}: LeaderboardFiltersProps) {
  const { preferences } = usePreferences();
  const handleTap = () => playButtonPress(preferences.hapticFeedback);

  return (
    <View style={styles.container}>
      <PillRow items={SCOPES} selected={scope} onSelect={onScopeChange} onTap={handleTap} />
      <PillRow items={METRICS} selected={metric} onSelect={onMetricChange} onTap={handleTap} />
      {metric !== 'streak' && (
        <PillRow items={PERIODS} selected={period} onSelect={onPeriodChange} onTap={handleTap} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  activePill: {
    backgroundColor: Colors.primary,
  },
  pillText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  activePillText: {
    color: Colors.white,
  },
});
