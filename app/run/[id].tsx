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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import * as ActivityService from '@/src/services/activity.service';
import RouteMap from '@/src/components/activity/RouteMap';
import RouteReplay from '@/src/components/activity/RouteReplay';
import PaceGraph from '@/src/components/activity/PaceGraph';
import SplitTimes from '@/src/components/activity/SplitTimes';
import SplitsTable from '@/src/components/activity/SplitsTable';
import ElevationProfile from '@/src/components/activity/ElevationProfile';
import RunPersonalBests from '@/src/components/activity/RunPersonalBests';
import HeartRateZones from '@/src/components/activity/HeartRateZones';
import { Badge, ConfirmModal } from '@/src/components/ui';
import { Activity, ActivityWaypoint, Gear } from '@/src/types/database';
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
import { useAuth } from '@/src/context/AuthContext';
import { haversineDistance } from '@/src/utils/geo';
import { exportActivity } from '@/src/utils/export';
import { ageFromDOB, calculateMaxHR } from '@/src/utils/hr-zones';
import { getSubtypeLabel, ACTIVITY_SUBTYPES, PRIVACY_OPTIONS } from '@/src/utils/activity-name';
import {
  estimateCadence,
  analyzeNegativeSplit,
  detectBestEfforts,
} from '@/src/utils/running-metrics';
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
  const router = useRouter();
  const { user } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [waypoints, setWaypoints] = useState<ActivityWaypoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { preferences } = usePreferences();
  const { profile } = useProfile();
  const unit = preferences.distanceUnit;
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editEffort, setEditEffort] = useState<number | null>(null);
  const [editSubtype, setEditSubtype] = useState<string | null>(null);
  const [editPrivacy, setEditPrivacy] = useState('public');
  const [isEditSaving, setIsEditSaving] = useState(false);

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

  const handleToggleFavorite = useCallback(async () => {
    if (!activity || !id) return;
    try {
      const newVal = await ActivityService.toggleFavorite(id, activity.is_favorite);
      setActivity((prev) => prev ? { ...prev, is_favorite: newVal } : prev);
    } catch (err) {
      console.warn('[RunDetail] Favorite toggle failed:', err);
    }
  }, [activity, id]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    setShowDeleteConfirm(false);
    try {
      await ActivityService.deleteActivity(id);
      router.back();
    } catch (err: any) {
      Alert.alert('Delete Failed', err?.message || 'Could not delete activity');
    }
  }, [id, router]);

  const openEditModal = useCallback(() => {
    if (!activity) return;
    setEditName(activity.name || '');
    setEditDesc(activity.description || '');
    setEditEffort(activity.perceived_effort);
    setEditSubtype(activity.activity_subtype);
    setEditPrivacy(activity.privacy || 'public');
    setShowEditModal(true);
  }, [activity]);

  const handleEditSave = useCallback(async () => {
    if (!id || isEditSaving) return;
    setIsEditSaving(true);
    try {
      const updated = await ActivityService.editActivity(id, {
        name: editName.trim() || null,
        description: editDesc.trim() || null,
        perceived_effort: editEffort,
        activity_subtype: editSubtype,
        privacy: editPrivacy,
      });
      setActivity(updated);
      setShowEditModal(false);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save changes');
    } finally {
      setIsEditSaving(false);
    }
  }, [id, editName, editDesc, editEffort, editSubtype, editPrivacy, isEditSaving]);

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

  // Advanced running metrics
  const cadence = useMemo(
    () => activity ? estimateCadence(activity.avg_pace_seconds_per_km, profile?.height_cm ?? null) : null,
    [activity, profile?.height_cm]
  );

  const negativeSplit = useMemo(
    () => activity ? analyzeNegativeSplit(waypoints, activity.distance_meters, activity.duration_seconds) : null,
    [activity, waypoints]
  );

  const bestEfforts = useMemo(
    () => detectBestEfforts(waypoints),
    [waypoints]
  );

  const activityDisplayName = activity?.name || (activity?.type === 'run' ? 'Run' : 'Walk');
  const subtypeLabel = activity ? getSubtypeLabel(activity.activity_subtype) : null;

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
      `${emoji} ${activityDisplayName}`,
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
      icon: 'footsteps-outline' as const,
      label: 'Cadence',
      value: cadence ? `${cadence} spm` : '--',
    },
    {
      icon: 'star-outline' as const,
      label: 'XP Earned',
      value: `+${activity.xp_earned}`,
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
                label={subtypeLabel || activity.type}
                variant={activity.type === 'run' ? 'primary' : 'secondary'}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activityTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {activityDisplayName}
                </Text>
                <Text style={[styles.date, { color: colors.textSecondary }]}>
                  {formatRelativeDate(activity.started_at)} at{' '}
                  {formatTime(activity.started_at)}
                </Text>
              </View>
            </View>
            {activity.status === 'completed' && (
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleToggleFavorite} style={[styles.shareButton, { backgroundColor: colors.surface }]}>
                  <Ionicons
                    name={activity.is_favorite ? 'star' : 'star-outline'}
                    size={20}
                    color={activity.is_favorite ? Colors.gold : colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={openEditModal} style={[styles.shareButton, { backgroundColor: colors.surface }]}>
                  <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={[styles.shareButton, { backgroundColor: colors.surface }]}>
                  <Ionicons name="share-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Description */}
          {activity.description ? (
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {activity.description}
            </Text>
          ) : null}

          {/* Effort + Privacy row */}
          {(activity.perceived_effort != null || activity.privacy !== 'public') && (
            <View style={styles.metaRow}>
              {activity.perceived_effort != null && (
                <View style={[styles.metaBadge, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.metaBadgeText, { color: colors.textSecondary }]}>
                    Effort: {activity.perceived_effort}/10
                  </Text>
                </View>
              )}
              {activity.privacy !== 'public' && (
                <View style={[styles.metaBadge, { backgroundColor: colors.surface }]}>
                  <Ionicons
                    name={activity.privacy === 'private' ? 'lock-closed-outline' : 'people-outline'}
                    size={12}
                    color={colors.textMuted}
                  />
                  <Text style={[styles.metaBadgeText, { color: colors.textSecondary }]}>
                    {activity.privacy === 'private' ? 'Private' : 'Friends'}
                  </Text>
                </View>
              )}
            </View>
          )}

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

          {/* Negative Split Analysis */}
          {negativeSplit && (
            <View style={[styles.splitAnalysis, { backgroundColor: colors.surface }]}>
              <View style={styles.splitAnalysisHeader}>
                <Ionicons
                  name={negativeSplit.isNegativeSplit ? 'trending-down-outline' : 'trending-up-outline'}
                  size={18}
                  color={negativeSplit.rating === 'perfect' ? '#22C55E' : negativeSplit.rating === 'good' ? '#22C55E' : negativeSplit.rating === 'even' ? colors.textSecondary : '#F59E0B'}
                />
                <Text style={[styles.splitAnalysisTitle, { color: colors.textPrimary }]}>
                  {negativeSplit.isNegativeSplit ? 'Negative Split' : negativeSplit.rating === 'even' ? 'Even Split' : 'Positive Split'}
                </Text>
              </View>
              <Text style={[styles.splitAnalysisMsg, { color: colors.textSecondary }]}>
                {negativeSplit.message}
              </Text>
              <View style={styles.splitAnalysisPaces}>
                <View style={styles.splitAnalysisPace}>
                  <Text style={[styles.splitPaceLabel, { color: colors.textMuted }]}>1st Half</Text>
                  <Text style={[styles.splitPaceValue, { color: colors.textPrimary }]}>
                    {formatPace(negativeSplit.firstHalfPace, unit)} {paceUnitLabel(unit)}
                  </Text>
                </View>
                <View style={styles.splitAnalysisPace}>
                  <Text style={[styles.splitPaceLabel, { color: colors.textMuted }]}>2nd Half</Text>
                  <Text style={[styles.splitPaceValue, { color: negativeSplit.isNegativeSplit ? '#22C55E' : colors.textPrimary }]}>
                    {formatPace(negativeSplit.secondHalfPace, unit)} {paceUnitLabel(unit)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Best Efforts */}
          {bestEfforts.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>BEST EFFORTS</Text>
              <View style={[styles.bestEffortsCard, { backgroundColor: colors.surface }]}>
                {bestEfforts.map((be, i) => (
                  <View
                    key={be.label}
                    style={[
                      styles.bestEffortRow,
                      i < bestEfforts.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.surfaceLight },
                    ]}
                  >
                    <Text style={[styles.bestEffortLabel, { color: colors.textPrimary }]}>{be.label}</Text>
                    <Text style={[styles.bestEffortTime, { color: colors.textSecondary }]}>
                      {formatDuration(be.timeSeconds)}
                    </Text>
                    <Text style={[styles.bestEffortPace, { color: Colors.primary }]}>
                      {formatPace(be.paceSecPerKm, unit)} {paceUnitLabel(unit)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

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

          {/* Action buttons */}
          {activity.status === 'completed' && (
            <View style={styles.section}>
              <TouchableOpacity
                onPress={() => setShowExportModal(true)}
                style={[styles.actionButton, { backgroundColor: colors.surface }]}
                disabled={isExporting}
              >
                <Ionicons name="download-outline" size={20} color={Colors.primary} />
                <Text style={[styles.actionButtonText, { color: Colors.primary }]}>Export Activity</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(true)}
                style={[styles.actionButton, { backgroundColor: colors.surface, marginTop: Spacing.sm }]}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <Text style={[styles.actionButtonText, { color: colors.danger }]}>Delete Activity</Text>
              </TouchableOpacity>
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

      {/* Edit Activity Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
          <Pressable style={[styles.editModalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.editModalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={[{ color: colors.textMuted, fontSize: FontSize.lg }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Edit Activity</Text>
              <TouchableOpacity onPress={handleEditSave} disabled={isEditSaving}>
                {isEditSaving ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={{ color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold }}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.editLabel, { color: colors.textMuted }]}>TITLE</Text>
              <TextInput
                style={[styles.editInput, { color: colors.textPrimary, borderBottomColor: colors.surfaceLight }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Activity name"
                placeholderTextColor={colors.textMuted}
                maxLength={100}
              />

              <Text style={[styles.editLabel, { color: colors.textMuted, marginTop: Spacing.xl }]}>DESCRIPTION</Text>
              <TextInput
                style={[styles.editDescInput, { color: colors.textPrimary, backgroundColor: colors.surfaceLight }]}
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="Add notes..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />

              <Text style={[styles.editLabel, { color: colors.textMuted, marginTop: Spacing.xl }]}>
                EFFORT {editEffort ? `(${editEffort}/10)` : ''}
              </Text>
              <View style={styles.editEffortRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.editEffortDot,
                      { backgroundColor: colors.surfaceLight },
                      editEffort != null && n <= editEffort && {
                        backgroundColor: n <= 3 ? '#22C55E' : n <= 6 ? '#F59E0B' : n <= 8 ? '#F97316' : '#EF4444',
                      },
                    ]}
                    onPress={() => setEditEffort(editEffort === n ? null : n)}
                  >
                    <Text style={[{ fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: colors.textMuted }, editEffort != null && n <= editEffort && { color: '#FFF' }]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.editLabel, { color: colors.textMuted, marginTop: Spacing.xl }]}>ACTIVITY TYPE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                {(ACTIVITY_SUBTYPES[(activity?.type as 'run' | 'walk') || 'run'] || ACTIVITY_SUBTYPES.run).map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.editChip,
                      { backgroundColor: colors.surfaceLight },
                      editSubtype === opt.value && { backgroundColor: Colors.primary },
                    ]}
                    onPress={() => setEditSubtype(editSubtype === opt.value ? null : opt.value)}
                  >
                    <Text style={[{ fontSize: FontSize.sm, color: colors.textSecondary }, editSubtype === opt.value && { color: '#FFF' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.editLabel, { color: colors.textMuted, marginTop: Spacing.xl }]}>VISIBILITY</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {PRIVACY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.editChip,
                      { backgroundColor: colors.surfaceLight, flexDirection: 'row', gap: 4 },
                      editPrivacy === opt.value && { backgroundColor: Colors.primary },
                    ]}
                    onPress={() => setEditPrivacy(opt.value)}
                  >
                    <Ionicons name={opt.icon} size={14} color={editPrivacy === opt.value ? '#FFF' : colors.textMuted} />
                    <Text style={[{ fontSize: FontSize.sm, color: colors.textSecondary }, editPrivacy === opt.value && { color: '#FFF' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Activity"
        message="This will permanently delete this activity and all its data. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FontSize.lg,
  },
  noMapPlaceholder: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  noMapText: {
    fontSize: FontSize.md,
  },
  contentCard: {
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
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  distanceSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  distanceValue: {
    fontSize: 56,
    fontWeight: FontWeight.bold,
    lineHeight: 60,
  },
  distanceUnit: {
    fontSize: FontSize.lg,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  statCell: {
    width: '50%',
    padding: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  statIcon: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  statLabel: {
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
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  exportOptionText: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  exportOptionDesc: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  cancelText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
  },
  descriptionText: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  metaBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  actionButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  editModalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  editLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  editInput: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    borderBottomWidth: 1,
    paddingBottom: Spacing.sm,
  },
  editDescInput: {
    fontSize: FontSize.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 80,
  },
  editEffortRow: {
    flexDirection: 'row',
    gap: 4,
  },
  editEffortDot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 30,
  },
  editChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  splitAnalysis: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  splitAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  splitAnalysisTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  splitAnalysisMsg: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  splitAnalysisPaces: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  splitAnalysisPace: {},
  splitPaceLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  splitPaceValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  bestEffortsCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  bestEffortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  bestEffortLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  bestEffortTime: {
    fontSize: FontSize.md,
    marginRight: Spacing.lg,
  },
  bestEffortPace: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    minWidth: 80,
    textAlign: 'right',
  },
});
