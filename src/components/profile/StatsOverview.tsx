import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { formatNumber } from '@/src/utils/formatters';

type StatsOverviewProps = {
  totalXP: number;
  totalSteps: number;
  totalActivities: number;
  totalDistanceKm: number;
};

export default function StatsOverview({
  totalXP,
  totalSteps,
  totalActivities,
  totalDistanceKm,
}: StatsOverviewProps) {
  const stats = [
    { label: 'Total XP', value: formatNumber(totalXP) },
    { label: 'Steps', value: formatNumber(totalSteps) },
    { label: 'Activities', value: String(totalActivities) },
    { label: 'Distance', value: `${totalDistanceKm.toFixed(1)} km` },
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.grid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={styles.value}>{stat.value}</Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stat: {
    width: '50%',
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  value: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  label: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
