import { useState, useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { Badge } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { formatDistance, formatDuration, formatPace } from '@/src/utils/formatters';
import { formatRelativeDate, formatTime } from '@/src/utils/date-helpers';
import { Activity, ActivityWaypoint } from '@/src/types/database';
import { supabase } from '@/src/services/supabase';

// Lazy load map components
let MapView: any = null;
let Polyline: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Polyline = Maps.Polyline;
}

type RunListItemProps = {
  activity: Activity;
  onPress: () => void;
};

function MiniRoute({ activityId }: { activityId: string }) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);

  useEffect(() => {
    supabase
      .from('activity_waypoints')
      .select('latitude, longitude')
      .eq('activity_id', activityId)
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 1) {
          setCoords(data);
        }
      });
  }, [activityId]);

  if (!MapView || !coords || coords.length < 2) return null;

  // Calculate region
  let minLat = coords[0].latitude, maxLat = coords[0].latitude;
  let minLng = coords[0].longitude, maxLng = coords[0].longitude;
  coords.forEach((c) => {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLng = Math.min(minLng, c.longitude);
    maxLng = Math.max(maxLng, c.longitude);
  });

  const region = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.004),
    longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.004),
  };

  return (
    <View style={miniStyles.container}>
      <MapView
        style={miniStyles.map}
        initialRegion={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        userInterfaceStyle="dark"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        liteMode={Platform.OS === 'android'}
      >
        <Polyline
          coordinates={coords}
          strokeColor={Colors.primary}
          strokeWidth={3}
        />
      </MapView>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  container: {
    height: 100,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default function RunListItem({ activity, onPress }: RunListItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <MiniRoute activityId={activity.id} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Badge
            label={activity.type}
            variant={activity.type === 'run' ? 'primary' : 'secondary'}
          />
          <Text style={styles.date}>
            {formatRelativeDate(activity.started_at)} {'\u2022'} {formatTime(activity.started_at)}
          </Text>
        </View>
        <Text style={styles.xp}>+{activity.xp_earned} XP</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDistance(activity.distance_meters)}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDuration(activity.duration_seconds)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {activity.avg_pace_seconds_per_km
              ? `${formatPace(activity.avg_pace_seconds_per_km)} /km`
              : '--'}
          </Text>
          <Text style={styles.statLabel}>Pace</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  date: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  xp: {
    color: Colors.secondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
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
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
