import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { Card } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { formatNumber } from '@/src/utils/formatters';
import { useSteps } from '@/src/context/StepContext';

export default function StepCounter() {
  const { todaySteps, isTracking } = useSteps();
  const animatedSteps = useSharedValue(0);

  useAnimatedReaction(
    () => todaySteps,
    (current) => {
      animatedSteps.value = withSpring(current, {
        damping: 20,
        stiffness: 100,
      });
    },
    [todaySteps]
  );

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>TODAY'S STEPS</Text>
        <View
          style={[styles.dot, { backgroundColor: isTracking ? Colors.secondary : Colors.textMuted }]}
        />
      </View>

      <Text style={styles.steps}>{formatNumber(todaySteps)}</Text>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {(todaySteps * 0.000762).toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>km</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {Math.round(todaySteps * 0.04)}
          </Text>
          <Text style={styles.statLabel}>cal</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {Math.round(todaySteps / 1312)}
          </Text>
          <Text style={styles.statLabel}>min</Text>
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
    color: Colors.textMuted,
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
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
});
