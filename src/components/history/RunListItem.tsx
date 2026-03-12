import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { Badge } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { formatDistance, formatDuration, formatPace, paceUnitLabel } from '@/src/utils/formatters';
import { formatRelativeDate, formatTime } from '@/src/utils/date-helpers';
import { usePreferences } from '@/src/context/PreferencesContext';
import { Activity } from '@/src/types/database';

// Lazy load map components once
let MapView: any = null;
let Polyline: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Polyline = Maps.Polyline;
  } catch {
    // Maps not available
  }
}

type Coord = { latitude: number; longitude: number };

type RunListItemProps = {
  activity: Activity;
  route?: Coord[];
  onPress: () => void;
};

function MiniRoute({ coords }: { coords: Coord[] }) {
  if (!MapView || coords.length < 2) return null;

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

export default function RunListItem({ activity, route, onPress }: RunListItemProps) {
  const { colors } = useTheme();
  const { preferences } = usePreferences();
  const unit = preferences.distanceUnit;
  const displayName = activity.name || (activity.type === 'run' ? 'Run' : 'Walk');

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.surface }]} onPress={onPress} activeOpacity={0.7}>
      {route && route.length > 1 && <MiniRoute coords={route} />}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Badge
            label={activity.type}
            variant={activity.type === 'run' ? 'primary' : 'secondary'}
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.activityName, { color: colors.textPrimary }]} numberOfLines={1}>{displayName}</Text>
              {activity.is_favorite && (
                <Text style={{ color: Colors.gold, fontSize: FontSize.sm }}>★</Text>
              )}
            </View>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {formatRelativeDate(activity.started_at)} {'\u2022'} {formatTime(activity.started_at)}
            </Text>
          </View>
        </View>
        <Text style={styles.xp}>+{activity.xp_earned} XP</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatDistance(activity.distance_meters, unit)}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Distance</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatDuration(activity.duration_seconds)}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Duration</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {activity.avg_pace_seconds_per_km
              ? `${formatPace(activity.avg_pace_seconds_per_km, unit)} ${paceUnitLabel(unit)}`
              : '--'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Pace</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
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
    flex: 1,
    marginRight: Spacing.sm,
  },
  activityName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  date: {
    fontSize: FontSize.sm,
    marginTop: 2,
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
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  statLabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
