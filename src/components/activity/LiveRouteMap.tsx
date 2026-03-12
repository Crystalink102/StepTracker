import { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSize, FontWeight } from '@/src/constants/theme';
import { usePreferences } from '@/src/context/PreferencesContext';
import { useTheme } from '@/src/context/ThemeContext';
import { formatDistance as fmtDist, formatPace as fmtPace, paceUnitLabel } from '@/src/utils/formatters';

// react-native-maps doesn't support web
let MapView: any = null;
let Polyline: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Polyline = Maps.Polyline;
    Marker = Maps.Marker;
  } catch (err) {
    console.warn('[LiveRouteMap] react-native-maps failed to load:', err);
  }
}

type Coord = {
  latitude: number;
  longitude: number;
};

type LiveRouteMapProps = {
  waypoints: Coord[];
  /** Whether the activity is currently active */
  isActive: boolean;
  /** Total distance in meters */
  distanceMeters: number;
  /** Current pace in seconds per km */
  currentPaceSecPerKm: number;
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

/** Local pace formatting that handles invalid values */
function safePace(secPerKm: number, unit: 'km' | 'mi' | 'm'): string {
  if (secPerKm <= 0 || !isFinite(secPerKm)) return '--:--';
  return fmtPace(secPerKm, unit);
}

/** Pulsing blue dot for current position (native only) */
function PulsingDot() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.6,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.currentPosContainer}>
      <Animated.View
        style={[
          styles.currentPosRing,
          { transform: [{ scale: pulseAnim }] },
        ]}
      />
      <View style={styles.currentPosDot} />
    </View>
  );
}

/** Web fallback: show a simple coordinate list + stats */
function WebFallback({ waypoints, distanceMeters, currentPaceSecPerKm }: Omit<LiveRouteMapProps, 'isActive'>) {
  const lastCoord = waypoints.length > 0 ? waypoints[waypoints.length - 1] : null;
  const { preferences } = usePreferences();
  const { colors } = useTheme();
  const unit = preferences.distanceUnit;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.webFallback}>
        <Text style={[styles.webFallbackTitle, { color: colors.textPrimary }]}>Live Route</Text>
        <Text style={[styles.webFallbackSubtitle, { color: colors.textMuted }]}>Map not available on web</Text>

        <View style={styles.webStatsRow}>
          <View style={styles.webStat}>
            <Text style={[styles.webStatValue, { color: colors.textPrimary }]}>{fmtDist(distanceMeters, unit)}</Text>
            <Text style={[styles.webStatLabel, { color: colors.textSecondary }]}>Distance</Text>
          </View>
          <View style={[styles.webStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.webStat}>
            <Text style={[styles.webStatValue, { color: colors.textPrimary }]}>{safePace(currentPaceSecPerKm, unit)}</Text>
            <Text style={[styles.webStatLabel, { color: colors.textSecondary }]}>Pace {paceUnitLabel(unit)}</Text>
          </View>
        </View>

        {lastCoord && (
          <Text style={[styles.webCoordText, { color: colors.textSecondary }]}>
            {lastCoord.latitude.toFixed(5)}, {lastCoord.longitude.toFixed(5)}
          </Text>
        )}
        <Text style={[styles.webWaypointCount, { color: colors.textMuted }]}>{waypoints.length} waypoints recorded</Text>
      </View>
    </View>
  );
}

export default function LiveRouteMap({
  waypoints,
  isActive,
  distanceMeters,
  currentPaceSecPerKm,
}: LiveRouteMapProps) {
  const { preferences } = usePreferences();
  const { colors } = useTheme();
  const unit = preferences.distanceUnit;
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

  // Web fallback
  if (!MapView) {
    return (
      <WebFallback
        waypoints={waypoints}
        distanceMeters={distanceMeters}
        currentPaceSecPerKm={currentPaceSecPerKm}
      />
    );
  }

  const currentPos = waypoints.length > 0 ? waypoints[waypoints.length - 1] : null;
  const startPos = waypoints.length > 0 ? waypoints[0] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
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
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
      >
        {/* Route trail - glow layer */}
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

        {/* Start marker - green dot */}
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

        {/* Current position - pulsing blue dot */}
        {currentPos && (
          <Marker
            coordinate={currentPos}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={isActive}
          >
            <PulsingDot />
          </Marker>
        )}
      </MapView>

      {/* Distance & pace overlay */}
      <View style={styles.overlay}>
        <View style={styles.overlayStat}>
          <Text style={[styles.overlayValue, { color: colors.textPrimary }]}>{fmtDist(distanceMeters, unit)}</Text>
          <Text style={[styles.overlayLabel, { color: colors.textMuted }]}>dist</Text>
        </View>
        <View style={[styles.overlayDivider, { backgroundColor: colors.border }]} />
        <View style={styles.overlayStat}>
          <Text style={[styles.overlayValue, { color: colors.textPrimary }]}>{safePace(currentPaceSecPerKm, unit)}</Text>
          <Text style={[styles.overlayLabel, { color: colors.textMuted }]}>{paceUnitLabel(unit)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 240,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },

  // Start marker (green)
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

  // Current position (pulsing blue dot)
  currentPosContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPosRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  currentPosDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // Distance & pace overlay
  overlay: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  overlayStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  overlayValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  overlayLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  overlayDivider: {
    width: 1,
    height: 14,
    marginHorizontal: Spacing.sm,
  },

  // Web fallback
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  webFallbackTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  webFallbackSubtitle: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.lg,
  },
  webStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  webStat: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  webStatValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  webStatLabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  webStatDivider: {
    width: 1,
    height: 24,
  },
  webCoordText: {
    fontSize: FontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: Spacing.sm,
  },
  webWaypointCount: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
});
