import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { formatDuration, formatDistance, formatPace, paceUnitLabel, speedUnitLabel } from '@/src/utils/formatters';
import { usePreferences } from '@/src/context/PreferencesContext';
import { useTheme } from '@/src/context/ThemeContext';

type ActiveRunCardProps = {
  type: string;
  elapsedSeconds: number;
  distanceMeters: number;
  currentPaceSecPerKm: number;
  currentSpeed: number;
  isPaused: boolean;
};

export default function ActiveRunCard({
  type,
  elapsedSeconds,
  distanceMeters,
  currentPaceSecPerKm,
  currentSpeed,
  isPaused,
}: ActiveRunCardProps) {
  const { preferences } = usePreferences();
  const { colors } = useTheme();
  const unit = preferences.distanceUnit;
  const speedDisplay = unit === 'mi' ? currentSpeed * 0.621371 : unit === 'm' ? currentSpeed / 3.6 : currentSpeed;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.type}>{type.toUpperCase()}</Text>
        {isPaused && <Text style={styles.paused}>PAUSED</Text>}
      </View>

      <Text style={[styles.timer, { color: colors.textPrimary }]}>{formatDuration(elapsedSeconds)}</Text>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatDistance(distanceMeters, unit)}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Distance</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {currentPaceSecPerKm > 0
              ? `${formatPace(currentPaceSecPerKm, unit)} ${paceUnitLabel(unit)}`
              : '--:--'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Pace</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {currentSpeed > 0 ? `${speedDisplay.toFixed(1)}` : '0.0'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{speedUnitLabel(unit)}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  type: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  paused: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  timer: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  statLabel: {
    fontSize: FontSize.xs,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 35,
  },
});
