import { View, Text, StyleSheet } from 'react-native';
import { StepDay } from '@/src/hooks/useStepStats';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type BarChartProps = {
  data: StepDay[];
  goal?: number;
};

const BAR_MAX_HEIGHT = 120;

export default function BarChart({ data, goal = 10000 }: BarChartProps) {
  const { colors } = useTheme();
  const maxSteps = Math.max(...data.map((d) => d.steps), goal, 1);

  // For month view with many bars, we skip some labels
  const showEveryNth = data.length > 10 ? Math.ceil(data.length / 7) : 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Goal line */}
      <View
        style={[
          styles.goalLine,
          { bottom: (goal / maxSteps) * BAR_MAX_HEIGHT + 20, borderTopColor: colors.textMuted },
        ]}
      >
        <Text style={[styles.goalLabel, { color: colors.textMuted }]}>{(goal / 1000).toFixed(0)}k</Text>
      </View>

      <View style={styles.barsRow}>
        {data.map((day, idx) => {
          const height = Math.max((day.steps / maxSteps) * BAR_MAX_HEIGHT, 2);
          const hitGoal = day.steps >= goal;

          return (
            <View key={day.date} style={styles.barColumn}>
              <View
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: hitGoal ? '#FFD700' : Colors.primary,
                  },
                ]}
              />
              {idx % showEveryNth === 0 ? (
                <Text style={[styles.barLabel, { color: colors.textMuted }]}>{day.label}</Text>
              ) : (
                <Text style={[styles.barLabel, { color: colors.textMuted }]}> </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    height: BAR_MAX_HEIGHT + 60,
  },
  goalLine: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    zIndex: 1,
  },
  goalLabel: {
    position: 'absolute',
    right: 0,
    top: -14,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flex: 1,
    gap: 2,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '70%',
    minWidth: 4,
    maxWidth: 24,
    borderRadius: 3,
  },
  barLabel: {
    fontSize: 9,
    marginTop: 4,
  },
});
