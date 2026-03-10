import { View, Text, StyleSheet } from 'react-native';
import { ActivityWaypoint } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type ElevationStats = {
  gain: number;
  loss: number;
  max: number;
  min: number;
  /** Normalized elevation samples for chart (0-1 range) */
  samples: number[];
};

function calculateElevation(waypoints: ActivityWaypoint[]): ElevationStats | null {
  const withAlt = waypoints.filter((w) => w.altitude != null);
  if (withAlt.length < 3) return null;

  let gain = 0;
  let loss = 0;

  // Smooth altitude data to reduce GPS noise (simple moving average)
  const smoothed: number[] = [];
  const windowSize = 5;
  for (let i = 0; i < withAlt.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(withAlt.length, i + Math.ceil(windowSize / 2));
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += withAlt[j].altitude!;
    }
    smoothed.push(sum / (end - start));
  }

  let min = smoothed[0];
  let max = smoothed[0];

  for (let i = 1; i < smoothed.length; i++) {
    const diff = smoothed[i] - smoothed[i - 1];
    if (diff > 0.5) gain += diff;
    if (diff < -0.5) loss += Math.abs(diff);
    min = Math.min(min, smoothed[i]);
    max = Math.max(max, smoothed[i]);
  }

  // Downsample to ~60 points for the chart
  const targetSamples = 60;
  const step = Math.max(1, Math.floor(smoothed.length / targetSamples));
  const samples: number[] = [];
  const range = max - min || 1;
  for (let i = 0; i < smoothed.length; i += step) {
    samples.push((smoothed[i] - min) / range);
  }

  return { gain: Math.round(gain), loss: Math.round(loss), max: Math.round(max), min: Math.round(min), samples };
}

type Props = {
  waypoints: ActivityWaypoint[];
};

export default function ElevationProfile({ waypoints }: Props) {
  const stats = calculateElevation(waypoints);
  if (!stats) return null;

  const chartHeight = 80;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Elevation</Text>

      {/* Mini elevation chart */}
      <View style={[styles.chart, { height: chartHeight }]}>
        {stats.samples.map((val, i) => (
          <View
            key={i}
            style={[
              styles.chartBar,
              {
                height: Math.max(2, val * chartHeight),
                flex: 1,
              },
            ]}
          />
        ))}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.gain}m</Text>
          <Text style={styles.statLabel}>Gain</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.loss}m</Text>
          <Text style={styles.statLabel}>Loss</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.max}m</Text>
          <Text style={styles.statLabel}>Max</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.min}m</Text>
          <Text style={styles.statLabel}>Min</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    marginBottom: Spacing.lg,
  },
  chartBar: {
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.surfaceLight,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
