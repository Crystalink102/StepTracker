import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { haversineDistance } from '@/src/utils/geo';
import { usePreferences, type DistanceUnit } from '@/src/context/PreferencesContext';

// react-native-maps doesn't support web
let MapView: any = null;
let Polyline: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Polyline = Maps.Polyline;
  Marker = Maps.Marker;
}

type Coord = {
  latitude: number;
  longitude: number;
};

type RouteMapProps = {
  coordinates: Coord[];
  /** Map height in pixels */
  height?: number;
  /** Allow user interaction (zoom/pan) */
  interactive?: boolean;
  /** Show start/finish markers */
  showMarkers?: boolean;
  /** Show km split markers along the route */
  showKmSplits?: boolean;
  /** Polyline stroke width */
  strokeWidth?: number;
  /** Border radius for container */
  borderRadius?: number;
};

/** Dark map style for Google Maps (Android) */
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2a2a4a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a2e' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e0e1a' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2a2a4a' }],
  },
];

/**
 * Calculate km split positions along a route.
 * Returns array of { coord, km } for each full kilometer.
 */
/**
 * Calculate distance split positions along a route.
 * When unit is 'mi', splits at each mile (1609.34m) instead of each km.
 */
function getDistanceSplits(coordinates: Coord[], unit: DistanceUnit = 'km'): { coord: Coord; label: number }[] {
  if (coordinates.length < 2) return [];

  const splitDistance = unit === 'mi' ? 1609.34 : 1000;
  const splits: { coord: Coord; label: number }[] = [];
  let accumulatedMeters = 0;
  let nextSplit = 1;

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    const segmentDist = haversineDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );

    accumulatedMeters += segmentDist;

    while (accumulatedMeters >= nextSplit * splitDistance) {
      const overshoot = accumulatedMeters - nextSplit * splitDistance;
      const ratio = 1 - overshoot / segmentDist;
      const lat = prev.latitude + (curr.latitude - prev.latitude) * ratio;
      const lng = prev.longitude + (curr.longitude - prev.longitude) * ratio;

      splits.push({ coord: { latitude: lat, longitude: lng }, label: nextSplit });
      nextSplit++;
    }
  }

  return splits;
}

/**
 * Calculate map region that fits all coordinates with padding.
 */
function getRegion(coordinates: Coord[]) {
  if (coordinates.length === 0) return undefined;

  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;

  coordinates.forEach((c) => {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLng = Math.min(minLng, c.longitude);
    maxLng = Math.max(maxLng, c.longitude);
  });

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.005),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.005),
  };
}

export default function RouteMap({
  coordinates,
  height = 300,
  interactive = true,
  showMarkers = true,
  showKmSplits = true,
  strokeWidth = 4,
  borderRadius = BorderRadius.lg,
}: RouteMapProps) {
  const { preferences } = usePreferences();
  const unit = preferences.distanceUnit;

  if (!MapView || coordinates.length < 2) {
    return null;
  }

  const region = getRegion(coordinates);
  const distSplits = showKmSplits ? getDistanceSplits(coordinates, unit) : [];
  const start = coordinates[0];
  const finish = coordinates[coordinates.length - 1];

  return (
    <View style={[styles.container, { height, borderRadius }]}>
      <MapView
        style={styles.map}
        initialRegion={region}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        userInterfaceStyle="dark"
        customMapStyle={Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        showsBuildings={false}
        showsIndoors={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        mapPadding={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        {/* Route glow (wider, semi-transparent) */}
        <Polyline
          coordinates={coordinates}
          strokeColor="rgba(168, 85, 247, 0.3)"
          strokeWidth={strokeWidth * 3}
        />

        {/* Main route line */}
        <Polyline
          coordinates={coordinates}
          strokeColor={Colors.primary}
          strokeWidth={strokeWidth}
        />

        {/* Distance split markers (km or mi) */}
        {distSplits.map((split) => (
          <Marker
            key={`split-${split.label}`}
            coordinate={split.coord}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.kmMarker}>
              <Text style={styles.kmText}>{split.label}</Text>
            </View>
          </Marker>
        ))}

        {/* Start marker */}
        {showMarkers && (
          <Marker
            coordinate={start}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.startMarker}>
              <View style={styles.startDot} />
            </View>
          </Marker>
        )}

        {/* Finish marker */}
        {showMarkers && (
          <Marker
            coordinate={finish}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.finishMarker}>
              <View style={styles.finishDot} />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
}

/**
 * Compact route map for list items (small, non-interactive).
 */
export function RouteMapMini({ coordinates }: { coordinates: Coord[] }) {
  return (
    <RouteMap
      coordinates={coordinates}
      height={100}
      interactive={false}
      showMarkers={true}
      showKmSplits={false}
      strokeWidth={3}
      borderRadius={BorderRadius.md}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  startMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  finishMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  kmMarker: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  kmText: {
    color: Colors.textPrimary,
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
});
