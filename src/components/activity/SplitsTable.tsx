import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActivityWaypoint } from '@/src/types/database';
import { haversineDistance } from '@/src/utils/geo';
import { formatPace, paceUnitLabel } from '@/src/utils/formatters';
import { usePreferences, type DistanceUnit } from '@/src/context/PreferencesContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type Split = {
  number: number;
  distanceMeters: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
  /** Elevation change in meters for this split */
  elevationChange: number | null;
};

/**
 * Calculate per-split data from waypoints.
 * Splits at each km or mile depending on user preference.
 */
function calculateSplits(waypoints: ActivityWaypoint[], unit: DistanceUnit): Split[] {
  if (waypoints.length < 2) return [];

  const splitDistance = unit === 'mi' ? 1609.34 : 1000; // meters per split
  const splits: Split[] = [];

  let accumulatedDistance = 0;
  let splitStartIndex = 0;
  let splitStartDistance = 0;
  let splitNumber = 1;

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const segDist = haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    accumulatedDistance += segDist;

    while (accumulatedDistance >= splitNumber * splitDistance) {
      const splitEndDistance = splitNumber * splitDistance;
      const splitDist = splitEndDistance - splitStartDistance;

      // Calculate time for this split
      const startTime = new Date(waypoints[splitStartIndex].timestamp).getTime();
      const endTime = interpolateTime(waypoints, splitEndDistance, accumulatedDistance, i);
      const splitDuration = Math.max(1, Math.round((endTime - startTime) / 1000));

      // Pace in seconds per km
      const paceSecPerKm = splitDist > 0 ? (splitDuration / splitDist) * 1000 : 0;

      // Elevation change
      const startAlt = waypoints[splitStartIndex].altitude;
      const endAltIdx = findWaypointAtDistance(waypoints, splitEndDistance, accumulatedDistance, i);
      const endAlt = waypoints[endAltIdx]?.altitude;
      const elevChange = startAlt != null && endAlt != null ? endAlt - startAlt : null;

      splits.push({
        number: splitNumber,
        distanceMeters: splitDist,
        durationSeconds: splitDuration,
        paceSecondsPerKm: paceSecPerKm,
        elevationChange: elevChange,
      });

      splitStartIndex = findWaypointAtDistance(waypoints, splitEndDistance, accumulatedDistance, i);
      splitStartDistance = splitEndDistance;
      splitNumber++;
    }
  }

  // Final partial split (remaining distance after last full split)
  const remainingDist = accumulatedDistance - (splitNumber - 1) * splitDistance;
  if (remainingDist > 50) { // only show if > 50m
    const startTime = new Date(waypoints[splitStartIndex].timestamp).getTime();
    const endTime = new Date(waypoints[waypoints.length - 1].timestamp).getTime();
    const splitDuration = Math.max(1, Math.round((endTime - startTime) / 1000));
    const paceSecPerKm = remainingDist > 0 ? (splitDuration / remainingDist) * 1000 : 0;

    const startAlt = waypoints[splitStartIndex].altitude;
    const endAlt = waypoints[waypoints.length - 1].altitude;
    const elevChange = startAlt != null && endAlt != null ? endAlt - startAlt : null;

    splits.push({
      number: splitNumber,
      distanceMeters: remainingDist,
      durationSeconds: splitDuration,
      paceSecondsPerKm: paceSecPerKm,
      elevationChange: elevChange,
    });
  }

  return splits;
}

/** Interpolate timestamp at a target cumulative distance */
function interpolateTime(
  waypoints: ActivityWaypoint[],
  targetDist: number,
  currentAccum: number,
  currentIdx: number
): number {
  const prev = waypoints[currentIdx - 1];
  const curr = waypoints[currentIdx];
  const segDist = haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
  const overshoot = currentAccum - targetDist;
  const ratio = segDist > 0 ? (segDist - overshoot) / segDist : 1;

  const prevTime = new Date(prev.timestamp).getTime();
  const currTime = new Date(curr.timestamp).getTime();
  return prevTime + (currTime - prevTime) * ratio;
}

/** Find the closest waypoint index at a given cumulative distance */
function findWaypointAtDistance(
  waypoints: ActivityWaypoint[],
  targetDist: number,
  currentAccum: number,
  currentIdx: number
): number {
  const prev = waypoints[currentIdx - 1];
  const curr = waypoints[currentIdx];
  const segDist = haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
  const overshoot = currentAccum - targetDist;
  const ratio = segDist > 0 ? (segDist - overshoot) / segDist : 1;
  return ratio > 0.5 ? currentIdx - 1 : currentIdx;
}

type SplitsTableProps = {
  waypoints: ActivityWaypoint[];
};

export default function SplitsTable({ waypoints }: SplitsTableProps) {
  const { preferences } = usePreferences();
  const unit: DistanceUnit = preferences.distanceUnit === 'm' ? 'km' : preferences.distanceUnit;
  const splits = useMemo(() => calculateSplits(waypoints, unit), [waypoints, unit]);

  if (splits.length === 0) return null;

  // Find min/max pace for bar scaling
  const paces = splits.map((s) => s.paceSecondsPerKm);
  const minPace = Math.min(...paces);
  const maxPace = Math.max(...paces);
  const paceRange = maxPace - minPace || 1;
  const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;

  const isPartial = (s: Split) => {
    const fullSplitDist = unit === 'mi' ? 1609.34 : 1000;
    return s.distanceMeters < fullSplitDist * 0.95;
  };

  const splitLabel = unit === 'mi' ? 'Mile' : 'KM';
  const hasElevation = splits.some((s) => s.elevationChange != null);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Splits</Text>

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, styles.colSplit]}>{splitLabel}</Text>
        <Text style={[styles.headerText, styles.colPace]}>Pace</Text>
        <Text style={[styles.headerText, styles.colBar]} />
        {hasElevation && (
          <Text style={[styles.headerText, styles.colElev]}>Elev</Text>
        )}
      </View>

      {/* Rows */}
      {splits.map((split) => {
        const isFaster = split.paceSecondsPerKm < avgPace;
        // Invert: faster pace = longer bar (lower seconds = better)
        const barPercent = paceRange > 0
          ? 1 - (split.paceSecondsPerKm - minPace) / paceRange
          : 0.5;
        const barWidth = Math.max(10, barPercent * 100);
        const partial = isPartial(split);

        return (
          <View key={split.number} style={styles.row}>
            <Text style={[styles.cellText, styles.colSplit, partial && styles.mutedText]}>
              {split.number}{partial ? '*' : ''}
            </Text>
            <Text style={[styles.cellText, styles.colPace, isFaster ? styles.fastPace : styles.slowPace]}>
              {formatPace(split.paceSecondsPerKm, unit)}
              <Text style={styles.paceUnit}> {paceUnitLabel(unit)}</Text>
            </Text>
            <View style={styles.colBar}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: isFaster ? Colors.primary : Colors.primaryDark,
                    },
                  ]}
                />
              </View>
            </View>
            {hasElevation && (
              <Text style={[styles.cellText, styles.colElev, styles.mutedText]}>
                {split.elevationChange != null
                  ? `${split.elevationChange >= 0 ? '+' : ''}${Math.round(split.elevationChange)}m`
                  : '--'}
              </Text>
            )}
          </View>
        );
      })}

      {splits.some((s) => isPartial(s)) && (
        <Text style={styles.partialNote}>* partial split</Text>
      )}
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
    marginBottom: Spacing.sm,
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
  cellText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  colSplit: {
    width: 45,
  },
  colPace: {
    width: 90,
  },
  colBar: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  colElev: {
    width: 55,
    textAlign: 'right',
  },
  barTrack: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  fastPace: {
    color: Colors.primary,
  },
  slowPace: {
    color: Colors.textSecondary,
  },
  mutedText: {
    color: Colors.textMuted,
  },
  paceUnit: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  partialNote: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});
