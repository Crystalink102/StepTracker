import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { formatDistance, formatDuration, formatPace, paceUnitLabel } from '@/src/utils/formatters';
import { usePreferences } from '@/src/context/PreferencesContext';
import { Activity } from '@/src/types/database';

type StatsGridProps = {
  activity: Activity;
};

export default function StatsGrid({ activity }: StatsGridProps) {
  const { colors } = useTheme();
  const { preferences } = usePreferences();
  const unit = preferences.distanceUnit;

  const stats = [
    { label: 'Distance', value: formatDistance(activity.distance_meters, unit) },
    { label: 'Duration', value: formatDuration(activity.duration_seconds) },
    {
      label: 'Avg Pace',
      value: activity.avg_pace_seconds_per_km
        ? `${formatPace(activity.avg_pace_seconds_per_km, unit)} ${paceUnitLabel(unit)}`
        : '--',
    },
    {
      label: 'Avg HR',
      value: activity.avg_heart_rate ? `${activity.avg_heart_rate} bpm` : '--',
    },
    {
      label: 'Calories',
      value: activity.calories_estimate ? `${activity.calories_estimate}` : '--',
    },
    { label: 'XP Earned', value: `+${activity.xp_earned}` },
  ];

  return (
    <View style={[styles.grid, { backgroundColor: colors.surface }]}>
      {stats.map((stat) => (
        <View key={stat.label} style={[styles.cell, { borderColor: colors.surfaceLight }]}>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{stat.value}</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  cell: {
    width: '50%',
    padding: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  value: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  label: {
    fontSize: FontSize.xs,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
