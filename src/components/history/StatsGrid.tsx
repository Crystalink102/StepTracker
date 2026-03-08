import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { formatDistance, formatDuration, formatPace } from '@/src/utils/formatters';
import { Activity } from '@/src/types/database';

type StatsGridProps = {
  activity: Activity;
};

export default function StatsGrid({ activity }: StatsGridProps) {
  const stats = [
    { label: 'Distance', value: formatDistance(activity.distance_meters) },
    { label: 'Duration', value: formatDuration(activity.duration_seconds) },
    {
      label: 'Avg Pace',
      value: activity.avg_pace_seconds_per_km
        ? `${formatPace(activity.avg_pace_seconds_per_km)} /km`
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
    <View style={styles.grid}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.cell}>
          <Text style={styles.value}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  cell: {
    width: '50%',
    padding: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
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
