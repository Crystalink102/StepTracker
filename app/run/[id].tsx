import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';

// react-native-maps doesn't support web
let MapView: any = null;
let Polyline: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Polyline = Maps.Polyline;
}
import * as ActivityService from '@/src/services/activity.service';
import StatsGrid from '@/src/components/history/StatsGrid';
import { Badge } from '@/src/components/ui';
import { Activity, ActivityWaypoint } from '@/src/types/database';
import { formatRelativeDate, formatTime } from '@/src/utils/date-helpers';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [waypoints, setWaypoints] = useState<ActivityWaypoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    ActivityService.getActivityWithWaypoints(id)
      .then(({ activity: act, waypoints: wps }) => {
        setActivity(act);
        setWaypoints(wps);
      })
      .catch(() => {})
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

  const routeCoords = waypoints.map((wp) => ({
    latitude: wp.latitude,
    longitude: wp.longitude,
  }));

  // Calculate map region from waypoints
  const getMapRegion = () => {
    if (routeCoords.length === 0) return undefined;

    let minLat = routeCoords[0].latitude;
    let maxLat = routeCoords[0].latitude;
    let minLng = routeCoords[0].longitude;
    let maxLng = routeCoords[0].longitude;

    routeCoords.forEach((c) => {
      minLat = Math.min(minLat, c.latitude);
      maxLat = Math.max(maxLat, c.latitude);
      minLng = Math.min(minLng, c.longitude);
      maxLng = Math.max(maxLng, c.longitude);
    });

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.3 + 0.005,
      longitudeDelta: (maxLng - minLng) * 1.3 + 0.005,
    };
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `${activity.type === 'run' ? 'Run' : 'Walk'} Details`,
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Map - native only */}
        {routeCoords.length > 1 && MapView && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={getMapRegion()}
              scrollEnabled={false}
              zoomEnabled={false}
              userInterfaceStyle="dark"
            >
              <Polyline
                coordinates={routeCoords}
                strokeColor={Colors.primary}
                strokeWidth={4}
              />
            </MapView>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Badge
            label={activity.type}
            variant={activity.type === 'run' ? 'primary' : 'secondary'}
          />
          <Text style={styles.date}>
            {formatRelativeDate(activity.started_at)} at{' '}
            {formatTime(activity.started_at)}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatsGrid activity={activity} />
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
  mapContainer: {
    height: 250,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    margin: Spacing.lg,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  date: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  statsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
});
