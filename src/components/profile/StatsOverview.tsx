import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/src/components/ui';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { formatNumber, distanceUnitShort } from '@/src/utils/formatters';
import { usePreferences } from '@/src/context/PreferencesContext';

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
  const { preferences } = usePreferences();
  const { colors } = useTheme();
  const unit = preferences.distanceUnit;
  const displayDist = unit === 'mi' ? totalDistanceKm * 0.621371 : unit === 'm' ? totalDistanceKm * 1000 : totalDistanceKm;

  const stats = [
    { label: 'Total XP', value: formatNumber(totalXP) },
    { label: 'Steps', value: formatNumber(totalSteps) },
    { label: 'Activities', value: String(totalActivities) },
    { label: 'Distance', value: `${unit === 'm' ? formatNumber(Math.round(displayDist)) : displayDist.toFixed(1)} ${distanceUnitShort(unit)}` },
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.grid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{stat.value}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{stat.label}</Text>
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
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  label: {
    fontSize: FontSize.xs,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
