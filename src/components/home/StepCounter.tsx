import { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { formatNumber, distanceUnitShort } from '@/src/utils/formatters';
import { useSteps } from '@/src/context/StepContext';
import { useProfile } from '@/src/hooks/useProfile';
import { usePreferences } from '@/src/context/PreferencesContext';
import {
  distanceFromSteps,
  caloriesFromSteps,
  activeMinutesFromSteps,
} from '@/src/utils/fitness';

const ANIMATION_DURATION = 500; // ms
const ANIMATION_FRAMES = 20;

export default function StepCounter() {
  const { colors } = useTheme();
  const { todaySteps, isTracking } = useSteps();
  const { profile } = useProfile();
  const { preferences } = usePreferences();
  const unit = preferences.distanceUnit;

  // Animated step counter display
  const [displayedSteps, setDisplayedSteps] = useState(todaySteps);
  const prevStepsRef = useRef(todaySteps);

  useEffect(() => {
    const prevSteps = prevStepsRef.current;
    const targetSteps = todaySteps;

    // Skip animation if going backwards or same value
    if (targetSteps <= prevSteps) {
      setDisplayedSteps(targetSteps);
      prevStepsRef.current = targetSteps;
      return;
    }

    const diff = targetSteps - prevSteps;
    const intervalMs = ANIMATION_DURATION / ANIMATION_FRAMES;
    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      if (frame >= ANIMATION_FRAMES) {
        setDisplayedSteps(targetSteps);
        clearInterval(interval);
      } else {
        // Ease-out: decelerate near the end
        const progress = frame / ANIMATION_FRAMES;
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayedSteps(Math.round(prevSteps + diff * eased));
      }
    }, intervalMs);

    prevStepsRef.current = targetSteps;

    return () => clearInterval(interval);
  }, [todaySteps]);

  const { displayDist, cal, min } = useMemo(() => {
    const distM = distanceFromSteps(todaySteps, profile?.height_cm ?? null);
    return {
      displayDist: unit === 'mi' ? distM * 0.000621371 : unit === 'm' ? distM : distM / 1000,
      cal: caloriesFromSteps(todaySteps, profile?.weight_kg ?? null),
      min: activeMinutesFromSteps(todaySteps),
    };
  }, [todaySteps, profile?.height_cm, profile?.weight_kg, unit]);

  return (
    <Card style={styles.card} accessible accessibilityLabel={`Today's steps: ${formatNumber(todaySteps)}. Distance: ${unit === 'm' ? Math.round(displayDist) : displayDist.toFixed(2)} ${distanceUnitShort(unit)}. Calories: ${cal}. Active minutes: ${min}.`}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textMuted }]}>TODAY'S STEPS</Text>
        <View
          style={[styles.dot, { backgroundColor: isTracking ? Colors.secondary : colors.textMuted }]}
        />
      </View>

      <Text style={[styles.steps, { color: colors.textPrimary }]}>{formatNumber(displayedSteps)}</Text>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{unit === 'm' ? Math.round(displayDist).toLocaleString() : displayDist.toFixed(2)}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{distanceUnitShort(unit)}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{cal}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>cal</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{min}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>min</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  steps: {
    fontSize: 52,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
  },
  statLabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 30,
  },
});
