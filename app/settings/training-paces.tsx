import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import * as ActivityService from '@/src/services/activity.service';
import { calculateTrainingPaces, estimateThresholdPace, type TrainingPace } from '@/src/utils/running-metrics';
import { formatPace, paceUnitLabel } from '@/src/utils/formatters';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

export default function TrainingPacesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const unit = preferences.distanceUnit;
  const [isLoading, setIsLoading] = useState(true);
  const [thresholdPace, setThresholdPace] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    ActivityService.getActivityHistory(user.id, 100)
      .then((activities) => {
        const tp = estimateThresholdPace(activities);
        setThresholdPace(tp);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  const paces = useMemo(
    () => (thresholdPace ? calculateTrainingPaces(thresholdPace) : []),
    [thresholdPace]
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!thresholdPace || paces.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Not Enough Data</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          Complete a few runs over 20 minutes to see your personalized training pace zones.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Your training paces are calculated from your recent best performances.
        Use these zones to structure your training.
      </Text>

      <View style={[styles.thresholdCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.thresholdLabel, { color: colors.textMuted }]}>ESTIMATED THRESHOLD PACE</Text>
        <Text style={[styles.thresholdValue, { color: Colors.primary }]}>
          {formatPace(thresholdPace, unit)} {paceUnitLabel(unit)}
        </Text>
        <Text style={[styles.thresholdDesc, { color: colors.textMuted }]}>
          The pace you can sustain for ~60 minutes at max effort
        </Text>
      </View>

      {paces.map((pace, i) => (
        <View key={pace.zone} style={[styles.paceCard, { backgroundColor: colors.surface }]}>
          <View style={styles.paceHeader}>
            <View style={[styles.zoneDot, { backgroundColor: pace.color }]} />
            <Text style={[styles.zoneName, { color: colors.textPrimary }]}>{pace.zone}</Text>
          </View>
          <Text style={[styles.paceDescription, { color: colors.textSecondary }]}>
            {pace.description}
          </Text>
          <View style={styles.paceRange}>
            <Text style={[styles.paceValue, { color: pace.color }]}>
              {formatPace(pace.maxPaceSecPerKm, unit)}
            </Text>
            <Text style={[styles.paceSeparator, { color: colors.textMuted }]}> - </Text>
            <Text style={[styles.paceValue, { color: pace.color }]}>
              {formatPace(pace.minPaceSecPerKm, unit)}
            </Text>
            <Text style={[styles.paceUnit, { color: colors.textMuted }]}> {paceUnitLabel(unit)}</Text>
          </View>
          <View style={[styles.paceBar, { backgroundColor: colors.surfaceLight }]}>
            <View style={[styles.paceBarFill, { backgroundColor: pace.color + '44', width: `${100 - i * 15}%` }]} />
          </View>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  content: {
    padding: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  thresholdCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  thresholdLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  thresholdValue: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
  },
  thresholdDesc: {
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  paceCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  paceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  zoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  zoneName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  paceDescription: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  paceRange: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  paceValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  paceSeparator: {
    fontSize: FontSize.lg,
  },
  paceUnit: {
    fontSize: FontSize.sm,
  },
  paceBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  paceBarFill: {
    height: 4,
    borderRadius: 2,
  },
});
