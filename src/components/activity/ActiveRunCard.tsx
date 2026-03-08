import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { formatDuration, formatDistance, formatPace } from '@/src/utils/formatters';

type ActiveRunCardProps = {
  type: string;
  elapsedSeconds: number;
  distanceMeters: number;
  currentPaceSecPerKm: number;
  currentSpeed: number;
  isPaused: boolean;
  isActive?: boolean;
};

export default function ActiveRunCard({
  type,
  elapsedSeconds,
  distanceMeters,
  currentPaceSecPerKm,
  currentSpeed,
  isPaused,
}: ActiveRunCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.type}>{type.toUpperCase()}</Text>
        {isPaused && <Text style={styles.paused}>PAUSED</Text>}
      </View>

      <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDistance(distanceMeters)}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {currentPaceSecPerKm > 0
              ? `${formatPace(currentPaceSecPerKm)} /km`
              : '--:--'}
          </Text>
          <Text style={styles.statLabel}>Pace</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {currentSpeed > 0 ? `${currentSpeed.toFixed(1)}` : '0.0'}
          </Text>
          <Text style={styles.statLabel}>km/h</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  type: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  paused: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  timer: {
    color: Colors.textPrimary,
    fontSize: 48,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
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
    marginTop: 4,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 35,
    backgroundColor: Colors.border,
  },
});
