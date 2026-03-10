import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityWaypoint } from '@/src/types/database';
import { haversineDistance } from '@/src/utils/geo';
import { formatPace, formatDuration, paceUnitLabel } from '@/src/utils/formatters';
import type { DistanceUnit } from '@/src/context/PreferencesContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type SplitData = {
  number: number;
  distanceLabel: string;
  timeSeconds: number;
  paceSecondsPerKm: number;
};

/**
 * Calculate per-km or per-mile split times from waypoints.
 */
function calculateSplitTimes(
  waypoints: ActivityWaypoint[],
  distanceUnit: DistanceUnit
): SplitData[] {
  if (waypoints.length < 2) return [];

  const splitDistance = distanceUnit === 'mi' ? 1609.34 : 1000; // meters
  const unitLabel = distanceUnit === 'mi' ? 'mi' : 'km';

  const splits: SplitData[] = [];
  let accumulatedDistance = 0;
  let splitStartIdx = 0;
  let splitStartDist = 0;
  let splitNumber = 1;

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const segDist = haversineDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
    accumulatedDistance += segDist;

    while (accumulatedDistance >= splitNumber * splitDistance) {
      const splitEndDist = splitNumber * splitDistance;
      const splitDist = splitEndDist - splitStartDist;

      // Interpolate end time
      const overshoot = accumulatedDistance - splitEndDist;
      const ratio = segDist > 0 ? (segDist - overshoot) / segDist : 1;

      const prevTime = new Date(prev.timestamp).getTime();
      const currTime = new Date(curr.timestamp).getTime();
      const endTime = prevTime + (currTime - prevTime) * ratio;

      const startTime = new Date(waypoints[splitStartIdx].timestamp).getTime();
      const timeSeconds = Math.max(1, Math.round((endTime - startTime) / 1000));

      // Pace in sec/km
      const paceSecPerKm = splitDist > 0 ? (timeSeconds / splitDist) * 1000 : 0;

      splits.push({
        number: splitNumber,
        distanceLabel: `${unitLabel} ${splitNumber}`,
        timeSeconds,
        paceSecondsPerKm: paceSecPerKm,
      });

      // Find the waypoint index closest to the split boundary
      const closerToPrev = ratio > 0.5;
      splitStartIdx = closerToPrev ? i - 1 : i;
      splitStartDist = splitEndDist;
      splitNumber++;
    }
  }

  // Final partial split
  const remainingDist = accumulatedDistance - (splitNumber - 1) * splitDistance;
  if (remainingDist > 50) {
    const startTime = new Date(waypoints[splitStartIdx].timestamp).getTime();
    const endTime = new Date(
      waypoints[waypoints.length - 1].timestamp
    ).getTime();
    const timeSeconds = Math.max(1, Math.round((endTime - startTime) / 1000));
    const paceSecPerKm =
      remainingDist > 0 ? (timeSeconds / remainingDist) * 1000 : 0;

    const partialDistDisplay =
      distanceUnit === 'mi'
        ? (remainingDist / 1609.34).toFixed(2)
        : (remainingDist / 1000).toFixed(2);

    splits.push({
      number: splitNumber,
      distanceLabel: `${partialDistDisplay} ${unitLabel}`,
      timeSeconds,
      paceSecondsPerKm: paceSecPerKm,
    });
  }

  return splits;
}

type SplitTimesProps = {
  waypoints: ActivityWaypoint[];
  distanceUnit: DistanceUnit;
};

export default function SplitTimes({ waypoints, distanceUnit }: SplitTimesProps) {
  const unit: DistanceUnit = distanceUnit === 'm' ? 'km' : distanceUnit;

  const splits = useMemo(
    () => calculateSplitTimes(waypoints, unit),
    [waypoints, unit]
  );

  if (splits.length === 0) return null;

  // Find fastest and slowest split indices (only full splits, not partial)
  const fullSplitDistance = unit === 'mi' ? 1609.34 : 1000;
  const fullSplits = splits.filter((_, i) => {
    // Last split might be partial
    if (i === splits.length - 1) {
      return !splits[i].distanceLabel.includes('.');
    }
    return true;
  });

  let fastestIdx = -1;
  let slowestIdx = -1;
  let fastestPace = Infinity;
  let slowestPace = 0;

  splits.forEach((s, i) => {
    // Only consider full splits for fastest/slowest
    const isFullSplit = !s.distanceLabel.includes('.');
    if (!isFullSplit) return;

    if (s.paceSecondsPerKm < fastestPace) {
      fastestPace = s.paceSecondsPerKm;
      fastestIdx = i;
    }
    if (s.paceSecondsPerKm > slowestPace) {
      slowestPace = s.paceSecondsPerKm;
      slowestIdx = i;
    }
  });

  const getPaceColor = (index: number): string => {
    if (index === fastestIdx) return '#22C55E'; // green
    if (index === slowestIdx) return '#EF4444'; // red
    return Colors.textPrimary;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Split Times</Text>

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, styles.colNumber]}>#</Text>
        <Text style={[styles.headerText, styles.colDistance]}>Split</Text>
        <Text style={[styles.headerText, styles.colTime]}>Time</Text>
        <Text style={[styles.headerText, styles.colPace]}>Pace</Text>
      </View>

      {/* Rows */}
      {splits.map((split, index) => {
        const paceColor = getPaceColor(index);
        const isPartial = split.distanceLabel.includes('.');

        return (
          <View
            key={split.number}
            style={[
              styles.row,
              index === splits.length - 1 && styles.lastRow,
            ]}
          >
            <View style={styles.colNumber}>
              <View
                style={[
                  styles.numberBadge,
                  index === fastestIdx && styles.fastestBadge,
                  index === slowestIdx && styles.slowestBadge,
                ]}
              >
                <Text
                  style={[
                    styles.numberText,
                    index === fastestIdx && styles.fastestNumberText,
                    index === slowestIdx && styles.slowestNumberText,
                  ]}
                >
                  {split.number}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.cellText,
                styles.colDistance,
                isPartial && styles.mutedText,
              ]}
            >
              {split.distanceLabel}
              {isPartial ? ' *' : ''}
            </Text>

            <Text style={[styles.cellText, styles.colTime]}>
              {formatDuration(split.timeSeconds)}
            </Text>

            <Text
              style={[
                styles.cellText,
                styles.colPace,
                { color: paceColor },
              ]}
            >
              {formatPace(split.paceSecondsPerKm, unit)}
              <Text style={[styles.paceUnit, { color: paceColor }]}>
                {' '}
                {paceUnitLabel(unit)}
              </Text>
            </Text>
          </View>
        );
      })}

      {/* Legend */}
      <View style={styles.legend}>
        {fastestIdx >= 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.legendText}>Fastest</Text>
          </View>
        )}
        {slowestIdx >= 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Slowest</Text>
          </View>
        )}
        {splits.some((s) => s.distanceLabel.includes('.')) && (
          <Text style={styles.partialNote}>* partial split</Text>
        )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
    marginBottom: Spacing.xs,
  },
  headerText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceLight,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  cellText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  colNumber: {
    width: 40,
    alignItems: 'flex-start',
  },
  colDistance: {
    flex: 1,
  },
  colTime: {
    width: 70,
    textAlign: 'center',
  },
  colPace: {
    width: 90,
    textAlign: 'right',
  },
  numberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fastestBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  slowestBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  numberText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  fastestNumberText: {
    color: '#22C55E',
  },
  slowestNumberText: {
    color: '#EF4444',
  },
  mutedText: {
    color: Colors.textMuted,
  },
  paceUnit: {
    fontSize: FontSize.xs,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  partialNote: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontStyle: 'italic',
  },
});
