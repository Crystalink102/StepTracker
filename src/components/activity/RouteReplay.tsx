import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityWaypoint } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

// react-native-maps doesn't support web
let MapView: any = null;
let Polyline: any = null;
let Marker: any = null;
let AnimatedRegion: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Polyline = Maps.Polyline;
  Marker = Maps.Marker;
  AnimatedRegion = Maps.AnimatedRegion;
}

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
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2a2a4a' }],
  },
];

type RouteReplayProps = {
  waypoints: ActivityWaypoint[];
  isReplaying: boolean;
  onReplayEnd: () => void;
};

const MAP_HEIGHT = 300;

export default function RouteReplay({
  waypoints,
  isReplaying,
  onReplayEnd,
}: RouteReplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<any>(null);

  const coords = waypoints.map((wp) => ({
    latitude: wp.latitude,
    longitude: wp.longitude,
  }));

  // Calculate interval to keep total replay between 5-10 seconds
  const totalPoints = coords.length;
  const targetDurationMs = Math.min(10000, Math.max(5000, totalPoints * 50));
  const intervalMs = Math.max(16, Math.floor(targetDurationMs / totalPoints));

  const stopReplay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start/stop replay when isReplaying changes
  useEffect(() => {
    if (!isReplaying) {
      stopReplay();
      return;
    }

    // Reset to start
    setCurrentIndex(0);

    // Start the timer
    let idx = 0;
    timerRef.current = setInterval(() => {
      idx++;
      if (idx >= totalPoints) {
        stopReplay();
        onReplayEnd();
        return;
      }
      setCurrentIndex(idx);
    }, intervalMs);

    return () => stopReplay();
  }, [isReplaying, totalPoints, intervalMs, stopReplay, onReplayEnd]);

  // Animate camera to follow current point
  useEffect(() => {
    if (!isReplaying || !mapRef.current || currentIndex === 0) return;

    const point = coords[currentIndex];
    if (point) {
      mapRef.current.animateToRegion(
        {
          latitude: point.latitude,
          longitude: point.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        intervalMs * 0.8
      );
    }
  }, [currentIndex, isReplaying, coords, intervalMs]);

  const progress = totalPoints > 1 ? currentIndex / (totalPoints - 1) : 0;
  const drawnCoords = coords.slice(0, currentIndex + 1);
  const currentPoint = coords[currentIndex];

  // Web fallback: text-based progress indicator
  if (Platform.OS === 'web' || !MapView) {
    if (!isReplaying) return null;

    return (
      <View style={styles.webContainer}>
        <Text style={styles.webTitle}>Route Replay</Text>
        <View style={styles.webProgressTrack}>
          <View
            style={[styles.webProgressFill, { width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={styles.webProgressText}>
          {Math.round(progress * 100)}% complete
        </Text>
        <Text style={styles.webPointText}>
          Point {currentIndex + 1} of {totalPoints}
        </Text>
      </View>
    );
  }

  if (!isReplaying) return null;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: coords[0].latitude,
          longitude: coords[0].longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
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
      >
        {/* Drawn route so far (glow) */}
        {drawnCoords.length > 1 && (
          <Polyline
            coordinates={drawnCoords}
            strokeColor="rgba(168, 85, 247, 0.3)"
            strokeWidth={12}
          />
        )}

        {/* Drawn route so far */}
        {drawnCoords.length > 1 && (
          <Polyline
            coordinates={drawnCoords}
            strokeColor={Colors.primary}
            strokeWidth={4}
          />
        )}

        {/* Start marker */}
        <Marker
          coordinate={coords[0]}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.startMarker}>
            <View style={styles.startDot} />
          </View>
        </Marker>

        {/* Current position marker */}
        {currentPoint && (
          <Marker
            coordinate={currentPoint}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.currentMarker}>
              <View style={styles.currentDot} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Progress bar overlay */}
      <View style={styles.progressOverlay}>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: MAP_HEIGHT,
    borderRadius: BorderRadius.lg,
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
  currentMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },

  // Web fallback styles
  webContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  webTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  webProgressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  webProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  webProgressText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  webPointText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
});
