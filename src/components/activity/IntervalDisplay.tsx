import { View, Text, StyleSheet } from 'react-native';
import { Card, ProgressBar } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { IntervalPhase, IntervalTimerState, formatTotalTime } from '@/src/hooks/useIntervalTimer';

type IntervalDisplayProps = IntervalTimerState;

// Phase color mapping
const PHASE_COLORS: Record<IntervalPhase, string> = {
  warmup: '#3B82F6',   // blue
  run: '#22C55E',      // green
  rest: '#FACC15',     // yellow
  cooldown: '#3B82F6', // blue
  complete: Colors.primary,
};

const PHASE_LABELS: Record<IntervalPhase, string> = {
  warmup: 'WARM UP',
  run: 'RUN',
  rest: 'REST',
  cooldown: 'COOL DOWN',
  complete: 'COMPLETE',
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function IntervalDisplay({
  currentPhase,
  phaseTimeRemaining,
  currentInterval,
  totalIntervals,
  totalElapsed,
  totalDuration,
  isComplete,
}: IntervalDisplayProps) {
  const { colors } = useTheme();
  const phaseColor = PHASE_COLORS[currentPhase];
  const progress = totalDuration > 0 ? totalElapsed / totalDuration : 0;

  return (
    <Card style={styles.card}>
      {/* Phase indicator header */}
      <View style={[styles.phaseHeader, { backgroundColor: phaseColor + '20' }]}>
        <View style={[styles.phaseBadge, { backgroundColor: phaseColor }]}>
          <Text style={styles.phaseBadgeText}>{PHASE_LABELS[currentPhase]}</Text>
        </View>
        {currentPhase === 'run' || currentPhase === 'rest' ? (
          <Text style={[styles.intervalCounter, { color: colors.textSecondary }]}>
            Interval {currentInterval} of {totalIntervals}
          </Text>
        ) : null}
      </View>

      {/* Big countdown timer */}
      {!isComplete ? (
        <Text style={[styles.countdown, { color: phaseColor }]}>
          {formatCountdown(phaseTimeRemaining)}
        </Text>
      ) : (
        <Text style={[styles.countdown, { color: phaseColor }]}>Done!</Text>
      )}

      {/* Phase dots */}
      <View style={styles.dotsContainer}>
        {Array.from({ length: totalIntervals }).map((_, i) => {
          const intervalNum = i + 1;
          let dotColor = colors.surfaceLight;
          if (intervalNum < currentInterval) {
            dotColor = '#22C55E'; // completed - green
          } else if (intervalNum === currentInterval && currentPhase === 'run') {
            dotColor = '#22C55E80'; // current run - translucent green
          } else if (intervalNum === currentInterval && currentPhase === 'rest') {
            dotColor = '#FACC1580'; // current rest - translucent yellow
          }
          if (isComplete) {
            dotColor = '#22C55E'; // all done
          }
          return (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: dotColor },
                intervalNum === currentInterval && !isComplete && [styles.dotActive, { borderColor: colors.textPrimary }],
              ]}
            />
          );
        })}
      </View>

      {/* Overall progress bar */}
      <View style={styles.progressSection}>
        <ProgressBar progress={progress} color={phaseColor} height={6} />
        <View style={styles.progressLabels}>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>{formatTotalTime(totalElapsed)}</Text>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>{formatTotalTime(totalDuration)}</Text>
        </View>
      </View>

      {/* Next up preview */}
      {!isComplete && (
        <View style={styles.nextUp}>
          <Text style={[styles.nextUpLabel, { color: colors.textMuted }]}>Next:</Text>
          <Text style={[styles.nextUpValue, { color: colors.textSecondary }]}>{getNextPhaseLabel(currentPhase, currentInterval, totalIntervals)}</Text>
        </View>
      )}
    </Card>
  );
}

function getNextPhaseLabel(
  currentPhase: IntervalPhase,
  currentInterval: number,
  totalIntervals: number,
): string {
  switch (currentPhase) {
    case 'warmup':
      return 'Run (Interval 1)';
    case 'run':
      if (currentInterval >= totalIntervals) return 'Cool down / Finish';
      return 'Rest';
    case 'rest':
      return `Run (Interval ${currentInterval + 1})`;
    case 'cooldown':
      return 'Finish!';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  phaseBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  phaseBadgeText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  intervalCounter: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  countdown: {
    fontSize: 64,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginVertical: Spacing.sm,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
    flexWrap: 'wrap',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  progressSection: {
    marginTop: Spacing.sm,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  progressText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  nextUp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  nextUpLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  nextUpValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
