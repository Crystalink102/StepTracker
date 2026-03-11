import { View, Text, StyleSheet } from 'react-native';
import { formatNumber } from '@/src/utils/formatters';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import type { ThemeColors } from '@/src/constants/theme';

type StatsSummaryProps = {
  average: number;
  bestDay: { label: string; steps: number };
  total: number;
};

function StatItem({ label, value, colors }: { label: string; value: string; colors: ThemeColors }) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface }]}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export default function StatsSummary({ average, bestDay, total }: StatsSummaryProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <StatItem label="Average" value={formatNumber(average)} colors={colors} />
      <StatItem
        label={`Best (${bestDay.label})`}
        value={formatNumber(bestDay.steps)}
        colors={colors}
      />
      <StatItem label="Total" value={formatNumber(total)} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  stat: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
});
