import { View, Text, StyleSheet } from 'react-native';
import { useSteps } from '@/src/context/StepContext';
import { useProfile } from '@/src/hooks/useProfile';
import { formatNumber } from '@/src/utils/formatters';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

const RING_SIZE = 180;
const STROKE_WIDTH = 12;

export default function StepGoalRing() {
  const { todaySteps } = useSteps();
  const { profile } = useProfile();

  const goal = profile?.daily_step_goal ?? 10000;
  const progress = Math.min(todaySteps / goal, 1);
  const isGoalHit = todaySteps >= goal;

  const ringColor = isGoalHit ? Colors.gold : Colors.primary;

  return (
    <View style={styles.container}>
      <View style={styles.ringContainer}>
        {/* Background ring */}
        <View style={styles.svgContainer}>
          <View
            style={[
              styles.backgroundRing,
              {
                width: RING_SIZE,
                height: RING_SIZE,
                borderRadius: RING_SIZE / 2,
                borderWidth: STROKE_WIDTH,
                borderColor: Colors.surfaceLight,
              },
            ]}
          />
          {/* Progress ring using a rotated bordered view */}
          <View
            style={[
              styles.progressRing,
              {
                width: RING_SIZE,
                height: RING_SIZE,
                borderRadius: RING_SIZE / 2,
                borderWidth: STROKE_WIDTH,
                borderColor: ringColor,
                borderTopColor: progress > 0.25 ? ringColor : 'transparent',
                borderRightColor: progress > 0.5 ? ringColor : 'transparent',
                borderBottomColor: progress > 0.75 ? ringColor : 'transparent',
                borderLeftColor: ringColor,
                transform: [{ rotate: '-90deg' }],
                opacity: progress > 0 ? 1 : 0,
              },
            ]}
          />
        </View>

        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={[styles.stepCount, isGoalHit && styles.goalHitText]}>
            {formatNumber(todaySteps)}
          </Text>
          <Text style={styles.goalText}>/ {formatNumber(goal)}</Text>
        </View>
      </View>

      {isGoalHit && (
        <Text style={styles.goalHitLabel}>Goal reached!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.lg,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  backgroundRing: {
    position: 'absolute',
  },
  progressRing: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
  },
  stepCount: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
  },
  goalHitText: {
    color: Colors.gold,
  },
  goalText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  goalHitLabel: {
    color: Colors.gold,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.sm,
  },
});
