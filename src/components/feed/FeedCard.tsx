import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar, Badge } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { formatDistance, formatDuration, formatPace, paceUnitLabel } from '@/src/utils/formatters';
import { usePreferences } from '@/src/context/PreferencesContext';
import type { FeedItem } from '@/src/services/feed.service';

// Lazy load map components once (native only)
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

type FeedCardProps = {
  item: FeedItem;
  route?: Coord[];
  onLike: () => void;
  onComment: () => void;
};

/**
 * Format a timestamp into a relative time string like "2h ago", "3d ago", etc.
 */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function MiniRoute({ coords }: { coords: Coord[] }) {
  if (!MapView || coords.length < 2) return null;

  let minLat = coords[0].latitude,
    maxLat = coords[0].latitude;
  let minLng = coords[0].longitude,
    maxLng = coords[0].longitude;
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
    height: 120,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default function FeedCard({ item, route, onLike, onComment }: FeedCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { preferences } = usePreferences();
  const unit = preferences.distanceUnit;

  const displayName = item.author.display_name || item.author.username;
  const endedAt = item.ended_at ?? item.started_at;

  const handlePress = () => {
    router.push(`/run/${item.id}` as any);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header: avatar + name + time */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar
            uri={item.author.avatar_url}
            name={displayName}
            size={40}
          />
          <View style={styles.headerText}>
            <Text style={[styles.authorName, { color: colors.textPrimary }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.timeAgo, { color: colors.textMuted }]}>{timeAgo(endedAt)}</Text>
          </View>
        </View>
        <Badge
          label={item.type}
          variant={item.type === 'run' ? 'primary' : 'secondary'}
        />
      </View>

      {/* Distance - big text */}
      <Text style={[styles.distance, { color: colors.textPrimary }]}>
        {formatDistance(item.distance_meters, unit)}
      </Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {formatDuration(item.duration_seconds)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="speedometer-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {item.avg_pace_seconds_per_km
              ? `${formatPace(item.avg_pace_seconds_per_km, unit)} ${paceUnitLabel(unit)}`
              : '--'}
          </Text>
        </View>
        {item.calories_estimate != null && item.calories_estimate > 0 && (
          <View style={styles.stat}>
            <Ionicons name="flame-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>{Math.round(item.calories_estimate)} cal</Text>
          </View>
        )}
      </View>

      {/* Mini route map */}
      {route && route.length > 1 && <MiniRoute coords={route} />}

      {/* Like / Comment bar */}
      <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onLike();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={item.has_liked ? 'heart' : 'heart-outline'}
            size={22}
            color={item.has_liked ? colors.danger : colors.textSecondary}
          />
          {item.like_count > 0 && (
            <Text
              style={[
                styles.actionCount,
                { color: colors.textSecondary },
                item.has_liked && { color: colors.danger },
              ]}
            >
              {item.like_count}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onComment();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={colors.textSecondary}
          />
          {item.comment_count > 0 && (
            <Text style={[styles.actionCount, { color: colors.textSecondary }]}>{item.comment_count}</Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
    flex: 1,
    gap: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  authorName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  timeAgo: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  distance: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSize.sm,
  },
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
  },
  actionCount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
