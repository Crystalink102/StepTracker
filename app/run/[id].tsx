import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Share,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as ActivityService from '@/src/services/activity.service';
import RouteMap from '@/src/components/activity/RouteMap';
import RouteReplay from '@/src/components/activity/RouteReplay';
import PaceGraph from '@/src/components/activity/PaceGraph';
import SplitTimes from '@/src/components/activity/SplitTimes';
import SplitsTable from '@/src/components/activity/SplitsTable';
import ElevationProfile from '@/src/components/activity/ElevationProfile';
import RunPersonalBests from '@/src/components/activity/RunPersonalBests';
import HeartRateZones from '@/src/components/activity/HeartRateZones';
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
import { useProfile } from '@/src/hooks/useProfile';
import { haversineDistance } from '@/src/utils/geo';
import { exportActivity } from '@/src/utils/export';
import { ageFromDOB, calculateMaxHR } from '@/src/utils/hr-zones';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

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
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [waypoints, setWaypoints] = useState<ActivityWaypoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { preferences } = usePreferences();
  const { profile } = useProfile();
  const unit = preferences.distanceUnit;
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);

  const handleReplayEnd = useCallback(() => {
    setIsReplaying(false);
  }, []);

  const handleExport = useCallback(
    async (format: 'gpx' | 'csv') => {
      if (!activity) return;
      setShowExportModal(false);
      setIsExporting(true);
      try {
        await exportActivity(activity, waypoints, format);
      } catch (err: any) {
        Alert.alert('Export failed', err?.message ?? 'Something went wrong');
      } finally {
        setIsExporting(false);
      }
    },
    [activity, waypoints]
  );

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
  const hasEnoughWaypoints = waypoints.length > 5;
  const maxSpeed = useMemo(() => getMaxSpeed(waypoints), [waypoints]);
  const elevGain = useMemo(() => getElevationGain(waypoints), [waypoints]);

  // Compute max HR from user's date of birth, or default to 190
  const userMaxHR = useMemo(() => {
    const age = ageFromDOB(profile?.date_of_birth);
    return age ? calculateMaxHR(age) : 190;
  }, [profile?.date_of_birth]);

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
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Activity not found</Text>
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
          headerStyle: hasRoute ? undefined : { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        {/* Route Map */}
        {hasRoute && !isReplaying ? (
          <RouteMap
            coordinates={routeCoords}
            height={MAP_HEIGHT}
            interactive={true}
            showMarkers={true}
            showKmSplits={true}
            strokeWidth={4}
            borderRadius={0}
          />
        ) : hasRoute && isReplaying ? (
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg }}>
            <RouteReplay
              waypoints={waypoints}
              isReplaying={isReplaying}
              onReplayEnd={handleReplayEnd}
            />
          </View>
        ) : (
          <View style={[styles.noMapPlaceholder, { backgroundColor: colors.surface }]}>
            <Ionicons name="map-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.noMapText, { color: colors.textMuted }]}>No route data</Text>
          </View>
        )}

        {/* Content card overlapping map bottom */}
        <View style={[styles.contentCard, { backgroundColor: colors.background }, !hasRoute && styles.contentCardFlat]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Badge
                label={activity.type}
                variant={activity.type === 'run' ? 'primary' : 'secondary'}
              />
              <View>
                <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>
                  {activity.type === 'run' ? 'Run' : 'Walk'}
                </Text>
                <Text style={[styles.date, { color: colors.textSecondary }]}>
                  {formatRelativeDate(activity.started_at)} at{' '}
                  {formatTime(activity.started_at)}
                </Text>
              </View>
            </View>
            {activity.status === 'completed' && (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => setShowExportModal(true)}
                  style={[styles.shareButton, { backgroundColor: colors.surface }]}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Ionicons name="download-outline" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={[styles.shareButton, { backgroundColor: colors.surface }]}>
                  <Ionicons name="share-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Big distance display */}
          <View style={styles.distanceSection}>
            <Text style={[styles.distanceValue, { color: colors.textPrimary }]}>
              {unit === 'm'
                ? Math.round(metersToDisplayDistance(activity.distance_meters, unit)).toLocaleString()
                : metersToDisplayDistance(activity.distance_meters, unit).toFixed(2)}
            </Text>
            <Text style={[styles.distanceUnit, { color: colors.textMuted }]}>{distanceUnitLabel(unit)}</Text>
          </View>

          {/* Stats Grid */}
          <View style={[styles.statsGrid, { backgroundColor: colors.surface }]}>
            {stats.map((stat) => (
              <View key={stat.label} style={[styles.statCell, { borderColor: colors.surfaceLight }]}>
                <Ionicons name={stat.icon} size={16} color={colors.textMuted} style={styles.statIcon} />
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Replay Route button */}
          {hasRoute && hasEnoughWaypoints && (
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.replayButton, { backgroundColor: colors.surface }]}
                onPress={() => setIsReplaying((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isReplaying ? 'stop-circle-outline' : 'play-circle-outline'}
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.replayButtonText}>
                  {isReplaying ? 'Stop Replay' : 'Replay Route'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pace Graph */}
          {hasEnoughWaypoints && (
            <View style={styles.section}>
              <PaceGraph waypoints={waypoints} />
            </View>
          )}

          {/* Split Times */}
          {hasEnoughWaypoints && (
            <View style={styles.section}>
              <SplitTimes waypoints={waypoints} distanceUnit={unit} />
            </View>
          )}

          {/* Heart Rate Zones */}
          {activity.avg_heart_rate != null && activity.avg_heart_rate > 0 && (
            <View style={styles.section}>
              <HeartRateZones avgHeartRate={activity.avg_heart_rate} maxHR={userMaxHR} />
            </View>
          )}

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

      {/* Export format picker */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowExportModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Export Activity</Text>

            <TouchableOpacity
              style={[styles.exportOption, { backgroundColor: colors.surfaceLight }]}
              onPress={() => handleExport('gpx')}
            >
              <Ionicons name="map-outline" size={22} color={Colors.primary} />
              <View style={styles.exportOptionText}>
                <Text style={[styles.exportOptionTitle, { color: colors.textPrimary }]}>GPX File</Text>
                <Text style={[styles.exportOptionDesc, { color: colors.textSecondary }]}>
                  Standard GPS format — works with Strava, Garmin, etc.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportOption, { backgroundColor: colors.surfaceLight }]}
              onPress={() => handleExport('csv')}
            >
              <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
              <View style={styles.exportOptionText}>
                <Text style={[styles.exportOptionTitle, { color: colors.textPrimary }]}>CSV File</Text>
                <Text style={[styles.exportOptionDesc, { color: colors.textSecondary }]}>
                  Spreadsheet format — open in Excel, Google Sheets, etc.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  section: {
    marginTop: Spacing.xl,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  replayButtonText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  /* Export modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    paddingBottom: 40,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  exportOptionText: {
    flex: 1,
  },
  exportOptionTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  exportOptionDesc: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  cancelText: {
    color: Colors.textMuted,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
  },
});
