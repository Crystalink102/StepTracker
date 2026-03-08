import { View, Text, StyleSheet } from 'react-native';
import { formatNumber } from '@/src/utils/formatters';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type StatsSummaryProps = {
  average: number;
  bestDay: { label: string; steps: number };
  total: number;
};

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function StatsSummary({ average, bestDay, total }: StatsSummaryProps) {
  return (
    <View style={styles.container}>
      <StatItem label="Average" value={formatNumber(average)} />
      <StatItem
        label={`Best (${bestDay.label})`}
        value={formatNumber(bestDay.steps)}
      />
      <StatItem label="Total" value={formatNumber(total)} />
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
});
