import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { Activity } from '@/src/types/database';

interface LastRunCardProps {
  activity: Activity | null;
  distanceUnit: string;
  onStartRun: () => void;
}

function formatDuration(seconds: number): string {
  const total = Math.floor(seconds) || 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatPace(secondsPerKm: number | null, unit: string): string {
  if (!secondsPerKm || secondsPerKm <= 0) return '--:--';
  const displayUnit = unit === 'mi' ? 'mi' : 'km';
  const pace = unit === 'mi' ? secondsPerKm * 1.60934 : secondsPerKm;
  const min = Math.floor(pace / 60);
  const sec = Math.floor(pace % 60);
  return `${min}:${sec.toString().padStart(2, '0')} /${displayUnit}`;
}

function formatDistance(meters: number, unit: string): string {
  if (unit === 'mi') return `${(meters / 1609.344).toFixed(2)} mi`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function LastRunCard({ activity, distanceUnit, onStartRun }: LastRunCardProps) {
  const { colors } = useTheme();
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    try {
      await onStartRun();
    } finally {
      setStarting(false);
    }
  };

  if (!activity) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="fitness-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No runs yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Start your first run to see your stats here
          </Text>
          <TouchableOpacity
            style={[styles.startBtn, starting && { opacity: 0.6 }]}
            onPress={handleStart}
            activeOpacity={0.8}
            disabled={starting}
          >
            {starting ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="flash" size={18} color={Colors.white} />
                <Text style={styles.startBtnText}>Start a Run</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isRun = activity.type === 'run';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={isRun ? 'trending-up' : 'walk'}
            size={20}
            color={Colors.primary}
          />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Last {isRun ? 'Run' : 'Walk'}
          </Text>
        </View>
        <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
          {timeAgo(activity.ended_at || activity.started_at)}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatDistance(activity.distance_meters, distanceUnit)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Distance</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatDuration(activity.duration_seconds)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Duration</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatPace(activity.avg_pace_seconds_per_km, distanceUnit)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Pace</Text>
        </View>
      </View>

      {activity.calories_estimate != null && activity.calories_estimate > 0 && (
        <View style={styles.caloriesRow}>
          <Ionicons name="flame" size={14} color={Colors.warning} />
          <Text style={[styles.caloriesText, { color: colors.textSecondary }]}>
            {Math.round(activity.calories_estimate)} cal
          </Text>
        </View>
      )}

      <View style={[styles.infoBar, { borderTopColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Enable "Always Allow" location for 24/7 step tracking
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  timeAgo: {
    fontSize: FontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 30,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.md,
    justifyContent: 'center',
  },
  caloriesText: {
    fontSize: FontSize.sm,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoText: {
    fontSize: FontSize.xs,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.md,
  },
  startBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
