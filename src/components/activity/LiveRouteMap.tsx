import { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/src/constants/theme';

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

type LiveRouteMapProps = {
  waypoints: Coord[];
  /** Whether the activity is currently active */
  isActive: boolean;
};

/** Dark map style for Android */
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
];

export default function LiveRouteMap({ waypoints, isActive }: LiveRouteMapProps) {
  const mapRef = useRef<any>(null);
  const lastAnimateRef = useRef(0);

  // Animate to latest position, throttled to every 3 seconds
  useEffect(() => {
    if (!mapRef.current || waypoints.length === 0) return;

    const now = Date.now();
    if (now - lastAnimateRef.current < 3000) return;
    lastAnimateRef.current = now;

    const latest = waypoints[waypoints.length - 1];
    mapRef.current.animateToRegion(
      {
        latitude: latest.latitude,
        longitude: latest.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      500
    );
  }, [waypoints.length]);

  // Downsample waypoints for rendering performance (max 500 points on map)
  const displayCoords = useMemo(() => {
    if (waypoints.length <= 500) return waypoints;
    const step = Math.ceil(waypoints.length / 500);
    return waypoints.filter((_, i) => i % step === 0 || i === waypoints.length - 1);
  }, [waypoints]);

  if (!MapView) return null;

  const currentPos = waypoints.length > 0 ? waypoints[waypoints.length - 1] : null;
  const startPos = waypoints.length > 0 ? waypoints[0] : null;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={
          currentPos
            ? {
                latitude: currentPos.latitude,
                longitude: currentPos.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }
            : undefined
        }
        scrollEnabled={true}
        zoomEnabled={true}
        rotateEnabled={false}
        pitchEnabled={false}
        userInterfaceStyle="dark"
        customMapStyle={Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
      >
        {/* Route trail (downsampled for performance) */}
        {displayCoords.length > 1 && (
          <>
            <Polyline
              coordinates={displayCoords}
              strokeColor="rgba(168, 85, 247, 0.3)"
              strokeWidth={12}
            />
            <Polyline
              coordinates={displayCoords}
              strokeColor={Colors.primary}
              strokeWidth={4}
            />
          </>
        )}

        {/* Start marker */}
        {startPos && (
          <Marker
            coordinate={startPos}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.startMarker}>
              <View style={styles.startDot} />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  startMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
});
