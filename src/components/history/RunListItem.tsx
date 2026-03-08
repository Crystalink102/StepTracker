import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Badge } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { formatDistance, formatDuration, formatPace } from '@/src/utils/formatters';
import { formatRelativeDate, formatTime } from '@/src/utils/date-helpers';
import { Activity } from '@/src/types/database';

type RunListItemProps = {
  activity: Activity;
  onPress: () => void;
};

export default function RunListItem({ activity, onPress }: RunListItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Badge
            label={activity.type}
            variant={activity.type === 'run' ? 'primary' : 'secondary'}
          />
          <Text style={styles.date}>
            {formatRelativeDate(activity.started_at)} • {formatTime(activity.started_at)}
          </Text>
        </View>
        <Text style={styles.xp}>+{activity.xp_earned} XP</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDistance(activity.distance_meters)}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDuration(activity.duration_seconds)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {activity.avg_pace_seconds_per_km
              ? `${formatPace(activity.avg_pace_seconds_per_km)} /km`
              : '--'}
          </Text>
          <Text style={styles.statLabel}>Pace</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  date: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  xp: {
    color: Colors.secondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
