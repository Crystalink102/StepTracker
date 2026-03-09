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
import { useLocalSearchParams, Stack } from 'expo-router';
import * as ActivityService from '@/src/services/activity.service';
import RouteMap from '@/src/components/activity/RouteMap';
import StatsGrid from '@/src/components/history/StatsGrid';
import { Badge } from '@/src/components/ui';
import { Activity, ActivityWaypoint } from '@/src/types/database';
import { formatRelativeDate, formatTime } from '@/src/utils/date-helpers';
import { formatDistance, formatDuration, formatPace, metersToDisplayDistance, distanceUnitLabel } from '@/src/utils/formatters';
import { usePreferences } from '@/src/context/PreferencesContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = Math.round(SCREEN_HEIGHT * 0.45);

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

  const handleShare = async () => {
    if (!activity) return;
    const emoji = activity.type === 'run' ? '\u{1F3C3}' : '\u{1F6B6}';
    const dist = formatDistance(activity.distance_meters, unit);
    const dur = formatDuration(activity.duration_seconds);
    const pace = activity.avg_pace_seconds_per_km
      ? `${formatPace(activity.avg_pace_seconds_per_km, unit)} ${unit === 'mi' ? '/mi' : '/km'}`
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
      '',
      'Tracked with 5tepTracker',
    ].filter(Boolean);

    await Share.share({ message: lines.join('\n') });
  };

  const routeCoords = useMemo(
    () => waypoints.map((wp) => ({ latitude: wp.latitude, longitude: wp.longitude })),
    [waypoints]
  );

  const hasRoute = routeCoords.length > 1;

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
                <Text style={styles.shareIcon}>{'\u2197'}</Text>
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

          {/* Stats */}
          <View style={styles.statsContainer}>
            <StatsGrid activity={activity} />
          </View>
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
    paddingBottom: Spacing.xxxl,
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
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    color: Colors.primary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  date: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  distanceSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    paddingVertical: Spacing.lg,
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
  statsContainer: {
    marginBottom: Spacing.lg,
  },
});
