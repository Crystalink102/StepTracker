import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Share,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as ActivityService from '@/src/services/activity.service';
import RouteMap from '@/src/components/activity/RouteMap';
import SplitsTable from '@/src/components/activity/SplitsTable';
import ElevationProfile from '@/src/components/activity/ElevationProfile';
import RunPersonalBests from '@/src/components/activity/RunPersonalBests';
import { Badge } from '@/src/components/ui';
import { Activity, ActivityWaypoint } from '@/src/types/database';
import { formatRelativeDate, formatTime } from '@/src/utils/date-helpers';
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  paceUnitLabel,
  metersToDisplayDistance,
  distanceUnitLabel,
} from '@/src/utils/formatters';
import { usePreferences } from '@/src/context/PreferencesContext';
import { haversineDistance } from '@/src/utils/geo';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = Math.round(SCREEN_HEIGHT * 0.45);

/** Calculate max speed from waypoints (m/s) */
function getMaxSpeed(waypoints: ActivityWaypoint[]): number {
  let max = 0;
  for (const wp of waypoints) {
    if (wp.speed != null && wp.speed > max && wp.speed < 15) { // cap at 15 m/s (~54 km/h) to filter GPS spikes
      max = wp.speed;
    }
  }
  return max;
}

/** Calculate elevation gain from waypoints */
function getElevationGain(waypoints: ActivityWaypoint[]): number | null {
  const withAlt = waypoints.filter((w) => w.altitude != null);
  if (withAlt.length < 3) return null;

  // Simple moving average to smooth GPS noise
  const windowSize = 5;
  const smoothed: number[] = [];
  for (let i = 0; i < withAlt.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(withAlt.length, i + Math.ceil(windowSize / 2));
    let sum = 0;
    for (let j = start; j < end; j++) sum += withAlt[j].altitude!;
    smoothed.push(sum / (end - start));
  }

  let gain = 0;
  for (let i = 1; i < smoothed.length; i++) {
    const diff = smoothed[i] - smoothed[i - 1];
    if (diff > 0.5) gain += diff;
  }
  return Math.round(gain);
}

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [waypoints, setWaypoints] = useState<ActivityWaypoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { preferences } = usePreferences();
  const unit = preferences.distanceUnit;

  useEffect(() => {
    if (!id) return;
    ActivityService.getActivityWithWaypoints(id)
      .then(({ activity: act, waypoints: wps }) => {
        setActivity(act);
        setWaypoints(wps);
      })
      .catch((err) => console.warn('[RunDetail] Failed to load activity:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  const routeCoords = useMemo(
    () => waypoints.map((wp) => ({ latitude: wp.latitude, longitude: wp.longitude })),
    [waypoints]
  );

  const hasRoute = routeCoords.length > 1;
  const maxSpeed = useMemo(() => getMaxSpeed(waypoints), [waypoints]);
  const elevGain = useMemo(() => getElevationGain(waypoints), [waypoints]);

  const handleShare = async () => {
    if (!activity) return;
    const emoji = activity.type === 'run' ? '\u{1F3C3}' : '\u{1F6B6}';
    const dist = formatDistance(activity.distance_meters, unit);
    const dur = formatDuration(activity.duration_seconds);
    const pace = activity.avg_pace_seconds_per_km
      ? `${formatPace(activity.avg_pace_seconds_per_km, unit)} ${paceUnitLabel(unit)}`
      : null;
    const cal = activity.calories_estimate
      ? `${activity.calories_estimate} cal`
      : null;

    const lines = [
      `${emoji} ${activity.type === 'run' ? 'Run' : 'Walk'} Complete!`,
      `\u{1F4CF} ${dist}`,
      `\u{23F1}\u{FE0F} ${dur}`,
      pace ? `\u{26A1} ${pace}` : null,
      cal ? `\u{1F525} ${cal}` : null,
      elevGain != null ? `\u{26F0}\u{FE0F} ${elevGain}m elevation gain` : null,
      '',
      'Tracked with 5tepTracker',
    ].filter(Boolean);

    await Share.share({ message: lines.join('\n') });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Activity not found</Text>
      </View>
    );
  }

  // Build stats for the grid
  const stats = [
    {
      icon: 'timer-outline' as const,
      label: 'Duration',
      value: formatDuration(activity.duration_seconds),
    },
    {
      icon: 'speedometer-outline' as const,
      label: 'Avg Pace',
      value: activity.avg_pace_seconds_per_km
        ? `${formatPace(activity.avg_pace_seconds_per_km, unit)} ${paceUnitLabel(unit)}`
        : '--',
    },
    {
      icon: 'heart-outline' as const,
      label: 'Avg HR',
      value: activity.avg_heart_rate ? `${activity.avg_heart_rate} bpm` : '--',
    },
    {
      icon: 'flash-outline' as const,
      label: 'Max Speed',
      value: maxSpeed > 0 ? formatSpeed(maxSpeed, unit) : '--',
    },
    {
      icon: 'flame-outline' as const,
      label: 'Calories',
      value: activity.calories_estimate ? `${activity.calories_estimate}` : '--',
    },
    {
      icon: 'trending-up-outline' as const,
      label: 'Elev Gain',
      value: elevGain != null ? `${elevGain}m` : '--',
    },
    {
      icon: 'star-outline' as const,
      label: 'XP Earned',
      value: `+${activity.xp_earned}`,
    },
    {
      icon: 'pulse-outline' as const,
      label: 'HR Source',
      value: activity.hr_source === 'auto' ? 'Auto' : activity.hr_source === 'manual' ? 'Manual' : '--',
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerTransparent: hasRoute,
          headerStyle: hasRoute ? undefined : { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Route Map */}
        {hasRoute ? (
          <RouteMap
            coordinates={routeCoords}
            height={MAP_HEIGHT}
            interactive={true}
            showMarkers={true}
            showKmSplits={true}
            strokeWidth={4}
            borderRadius={0}
          />
        ) : (
          <View style={styles.noMapPlaceholder}>
            <Ionicons name="map-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.noMapText}>No route data</Text>
          </View>
        )}

        {/* Content card overlapping map bottom */}
        <View style={[styles.contentCard, !hasRoute && styles.contentCardFlat]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Badge
                label={activity.type}
                variant={activity.type === 'run' ? 'primary' : 'secondary'}
              />
              <View>
                <Text style={styles.activityTitle}>
                  {activity.type === 'run' ? 'Run' : 'Walk'}
                </Text>
                <Text style={styles.date}>
                  {formatRelativeDate(activity.started_at)} at{' '}
                  {formatTime(activity.started_at)}
                </Text>
              </View>
            </View>
            {activity.status === 'completed' && (
              <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                <Ionicons name="share-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Big distance display */}
          <View style={styles.distanceSection}>
            <Text style={styles.distanceValue}>
              {unit === 'm'
                ? Math.round(metersToDisplayDistance(activity.distance_meters, unit)).toLocaleString()
                : metersToDisplayDistance(activity.distance_meters, unit).toFixed(2)}
            </Text>
            <Text style={styles.distanceUnit}>{distanceUnitLabel(unit)}</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.statCell}>
                <Ionicons name={stat.icon} size={16} color={Colors.textMuted} style={styles.statIcon} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Personal Bests (if any set on this run) */}
          {id && (
            <View style={styles.section}>
              <RunPersonalBests activityId={id} />
            </View>
          )}

          {/* Mile/KM Splits */}
          {waypoints.length > 1 && (
            <View style={styles.section}>
              <SplitsTable waypoints={waypoints} />
            </View>
          )}

          {/* Elevation Profile */}
          {waypoints.length > 1 && (
            <View style={styles.section}>
              <ElevationProfile waypoints={waypoints} />
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
  },
  noMapPlaceholder: {
    height: 120,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  noMapText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  contentCard: {
    backgroundColor: Colors.background,
    marginTop: -20,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  contentCardFlat: {
    marginTop: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  activityTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  distanceSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  distanceValue: {
    color: Colors.textPrimary,
    fontSize: 56,
    fontWeight: FontWeight.bold,
    lineHeight: 60,
  },
  distanceUnit: {
    color: Colors.textMuted,
    fontSize: FontSize.lg,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  statCell: {
    width: '50%',
    padding: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  statIcon: {
    marginBottom: 4,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginTop: Spacing.xl,
  },
});
