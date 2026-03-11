import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActivityWaypoint } from '@/src/types/database';
import { haversineDistance } from '@/src/utils/geo';
import { formatPace, paceUnitLabel } from '@/src/utils/formatters';
import { usePreferences, type DistanceUnit } from '@/src/context/PreferencesContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type PacePoint = {
  distanceKm: number;
  paceSecondsPerKm: number;
};

/**
 * Calculate pace at each waypoint segment using haversine distance and time deltas.
 * Returns raw pace points (not yet smoothed).
 */
function calculateRawPacePoints(waypoints: ActivityWaypoint[]): PacePoint[] {
  if (waypoints.length < 2) return [];

  const points: PacePoint[] = [];
  let cumulativeDistance = 0;

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];

    const dist = haversineDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );

    const timeDelta =
      (new Date(curr.timestamp).getTime() -
        new Date(prev.timestamp).getTime()) /
      1000;

    cumulativeDistance += dist;

    // Skip segments with no distance or unrealistic pace
    if (dist < 0.5 || timeDelta <= 0) continue;

    const paceSecPerKm = (timeDelta / dist) * 1000;

    // Filter out extreme outliers (slower than 30 min/km or faster than 1:30/km)
    if (paceSecPerKm > 1800 || paceSecPerKm < 90) continue;

    points.push({
      distanceKm: cumulativeDistance / 1000,
      paceSecondsPerKm: paceSecPerKm,
    });
  }

  return points;
}

/**
 * Smooth pace data with a rolling average.
 */
function smoothPaceData(points: PacePoint[], windowSize: number = 5): PacePoint[] {
  if (points.length <= windowSize) return points;

  const smoothed: PacePoint[] = [];
  const half = Math.floor(windowSize / 2);

  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(points.length, i + half + 1);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += points[j].paceSecondsPerKm;
    }
    smoothed.push({
      distanceKm: points[i].distanceKm,
      paceSecondsPerKm: sum / (end - start),
    });
  }

  return smoothed;
}

/**
 * Downsample points for rendering (max ~80 points for the chart).
 */
function downsample(points: PacePoint[], maxPoints: number = 80): PacePoint[] {
  if (points.length <= maxPoints) return points;

  const step = Math.ceil(points.length / maxPoints);
  const result: PacePoint[] = [];

  for (let i = 0; i < points.length; i += step) {
    result.push(points[i]);
  }

  // Always include the last point
  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1]);
  }

  return result;
}

const CHART_HEIGHT = 200;
const Y_AXIS_WIDTH = 50;
const X_AXIS_HEIGHT = 24;
const GRID_LINES = 5;

type PaceGraphProps = {
  waypoints: ActivityWaypoint[];
};

export default function PaceGraph({ waypoints }: PaceGraphProps) {
  const { preferences } = usePreferences();
  const { colors } = useTheme();
  const unit: DistanceUnit =
    preferences.distanceUnit === 'm' ? 'km' : preferences.distanceUnit;

  const { chartData, avgPace, minPace, maxPace, maxDistKm } = useMemo(() => {
    const raw = calculateRawPacePoints(waypoints);
    if (raw.length < 3) {
      return {
        chartData: [],
        avgPace: 0,
        minPace: 0,
        maxPace: 0,
        maxDistKm: 0,
      };
    }

    const smoothed = smoothPaceData(raw, 5);
    const data = downsample(smoothed);

    const paces = data.map((p) => p.paceSecondsPerKm);
    const avg = paces.reduce((a, b) => a + b, 0) / paces.length;
    const min = Math.min(...paces);
    const max = Math.max(...paces);
    const maxDist = data[data.length - 1]?.distanceKm ?? 0;

    return {
      chartData: data,
      avgPace: avg,
      minPace: min,
      maxPace: max,
      maxDistKm: maxDist,
    };
  }, [waypoints]);

  if (chartData.length < 3) return null;

  // Add some padding to Y range
  const paceRange = maxPace - minPace || 60;
  const yPadding = paceRange * 0.1;
  const yMin = minPace - yPadding; // Fastest pace (top of chart)
  const yMax = maxPace + yPadding; // Slowest pace (bottom of chart)
  const yRange = yMax - yMin;

  // Generate grid line values (evenly spaced)
  const gridLines: number[] = [];
  for (let i = 0; i <= GRID_LINES; i++) {
    gridLines.push(yMin + (yRange * i) / GRID_LINES);
  }

  // Convert pace point to Y position (inverted: faster pace = higher on chart)
  const paceToY = (pace: number) => {
    return ((pace - yMin) / yRange) * (CHART_HEIGHT - X_AXIS_HEIGHT);
  };

  // Convert distance to X position
  const distToX = (dist: number) => {
    return maxDistKm > 0 ? (dist / maxDistKm) * 100 : 0;
  };

  // Average pace Y position
  const avgPaceY = paceToY(avgPace);

  // X-axis labels (distance markers)
  const xLabels: { value: number; label: string }[] = [];
  const maxDistDisplay = unit === 'mi' ? maxDistKm * 0.621371 : maxDistKm;
  const xStep = Math.max(0.5, Math.ceil(maxDistDisplay) / 4);
  for (let d = 0; d <= maxDistDisplay; d += xStep) {
    xLabels.push({
      value: d,
      label: d === 0 ? '0' : d % 1 === 0 ? `${d}` : d.toFixed(1),
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pace</Text>

      <View style={styles.chartContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          {gridLines.map((pace, i) => (
            <View
              key={i}
              style={[
                styles.yLabel,
                {
                  top: paceToY(pace) - 6,
                },
              ]}
            >
              <Text style={[styles.yLabelText, { color: colors.textMuted }]}>
                {formatPace(pace, unit)}
              </Text>
            </View>
          ))}
        </View>

        {/* Chart area */}
        <View style={styles.chartArea}>
          {/* Horizontal grid lines */}
          {gridLines.map((pace, i) => (
            <View
              key={`grid-${i}`}
              style={[
                styles.gridLine,
                {
                  top: paceToY(pace),
                  backgroundColor: colors.surfaceLight,
                },
              ]}
            />
          ))}

          {/* Average pace dashed line */}
          <View
            style={[
              styles.avgLine,
              { top: avgPaceY },
            ]}
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <View
                key={`dash-${i}`}
                style={[
                  styles.dash,
                  i % 2 === 0
                    ? { backgroundColor: colors.warning }
                    : styles.dashInvisible,
                ]}
              />
            ))}
          </View>

          {/* Avg pace label */}
          <View style={[styles.avgLabel, { top: avgPaceY - 18, backgroundColor: colors.surface }]}>
            <Text style={[styles.avgLabelText, { color: colors.warning }]}>
              avg {formatPace(avgPace, unit)}
            </Text>
          </View>

          {/* Pace line segments (using connected bars) */}
          {chartData.map((point, i) => {
            if (i === 0) return null;

            const prev = chartData[i - 1];
            const x1 = distToX(prev.distanceKm);
            const x2 = distToX(point.distanceKm);
            const y1 = paceToY(prev.paceSecondsPerKm);
            const y2 = paceToY(point.paceSecondsPerKm);

            const width = x2 - x1;
            if (width <= 0) return null;

            // Draw a filled area from the bottom up to the pace line
            const topY = Math.min(y1, y2);
            const chartBottom = CHART_HEIGHT - X_AXIS_HEIGHT;

            return (
              <View
                key={`bar-${i}`}
                style={[
                  styles.paceBar,
                  {
                    left: `${x1}%`,
                    width: `${Math.max(width, 0.5)}%`,
                    top: topY,
                    height: chartBottom - topY,
                  },
                ]}
              />
            );
          })}

          {/* Pace line (thin line on top of bars for definition) */}
          {chartData.map((point, i) => {
            const x = distToX(point.distanceKm);
            const y = paceToY(point.paceSecondsPerKm);

            return (
              <View
                key={`dot-${i}`}
                style={[
                  styles.paceDot,
                  {
                    left: `${x}%`,
                    top: y - 1.5,
                  },
                ]}
              />
            );
          })}

          {/* X-axis labels */}
          <View style={[styles.xAxis, { borderTopColor: colors.surfaceLight }]}>
            {xLabels.map((label, i) => {
              const xPos = maxDistDisplay > 0
                ? (label.value / maxDistDisplay) * 100
                : 0;
              return (
                <Text
                  key={`xlabel-${i}`}
                  style={[
                    styles.xLabelText,
                    { left: `${xPos}%`, color: colors.textMuted },
                  ]}
                >
                  {label.label}
                </Text>
              );
            })}
          </View>
        </View>
      </View>

      {/* Axis unit labels */}
      <View style={styles.axisLabels}>
        <Text style={[styles.axisUnitLabel, { color: colors.textMuted }]}>
          {paceUnitLabel(unit)}
        </Text>
        <Text style={[styles.axisUnitLabel, { color: colors.textMuted }]}>
          {unit === 'mi' ? 'miles' : 'km'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  chartContainer: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT - X_AXIS_HEIGHT,
    position: 'relative',
  },
  yLabel: {
    position: 'absolute',
    right: Spacing.xs,
  },
  yLabelText: {
    fontSize: 9,
    textAlign: 'right',
  },
  chartArea: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  avgLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  dash: {
    flex: 1,
    height: 2,
  },
  dashInvisible: {
    backgroundColor: 'transparent',
  },
  avgLabel: {
    position: 'absolute',
    right: 0,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  avgLabelText: {
    fontSize: 9,
    fontWeight: FontWeight.semibold,
  },
  paceBar: {
    position: 'absolute',
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
  },
  paceDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.primary,
    marginLeft: -1.5,
  },
  xAxis: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: X_AXIS_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  xLabelText: {
    position: 'absolute',
    top: 4,
    fontSize: 9,
    marginLeft: -8,
  },
  axisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingLeft: Y_AXIS_WIDTH,
  },
  axisUnitLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
