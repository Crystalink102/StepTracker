import { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

export type TrendsDataPoint = {
  label: string;
  value: number;
};

type TrendsChartProps = {
  data: TrendsDataPoint[];
  title: string;
  unit: string;
  color?: string;
  formatValue?: (value: number) => string;
};

const BAR_MAX_HEIGHT = 100;

export default function TrendsChart({
  data,
  title,
  unit,
  color = Colors.primary,
  formatValue,
}: TrendsChartProps) {
  const { colors } = useTheme();
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const maxIndex = data.findIndex((d) => d.value === maxValue && d.value > 0);

  // Create animated values for each bar — rebuild when data length changes
  const animatedValues = useMemo(
    () => data.map(() => new Animated.Value(0)),
    [data.length],
  );

  useEffect(() => {
    // Reset all values to 0
    animatedValues.forEach((v) => v.setValue(0));

    // Stagger animate each bar
    const animations = animatedValues.map((animValue, i) =>
      Animated.timing(animValue, {
        toValue: 1,
        duration: 500,
        delay: i * 60,
        useNativeDriver: false,
      })
    );

    Animated.parallel(animations).start();
  }, [data, animatedValues]);

  const displayValue = (val: number): string => {
    if (formatValue) return formatValue(val);
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 10000) return `${(val / 1000).toFixed(0)}k`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toFixed(val % 1 === 0 ? 0 : 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.unit, { color: colors.textMuted }]}>{unit}</Text>
      </View>

      <View style={styles.barsRow}>
        {data.map((point, idx) => {
          const ratio = maxValue > 0 ? point.value / maxValue : 0;
          const isMax = idx === maxIndex && point.value > 0;
          const barColor = isMax ? Colors.gold : color;

          const animatedHeight = animatedValues[idx]
            ? animatedValues[idx].interpolate({
                inputRange: [0, 1],
                outputRange: [2, Math.max(ratio * BAR_MAX_HEIGHT, 2)],
              })
            : 2;

          return (
            <View key={`${point.label}-${idx}`} style={styles.barColumn}>
              {/* Value label on top of bar (only for max) */}
              {isMax && (
                <Text style={[styles.valueLabel, { color: Colors.gold }]}>
                  {displayValue(point.value)}
                </Text>
              )}

              <Animated.View
                style={[
                  styles.bar,
                  {
                    height: animatedHeight,
                    backgroundColor: barColor,
                    opacity: point.value === 0 ? 0.3 : 1,
                  },
                ]}
              />

              <Text style={[styles.barLabel, { color: colors.textMuted }, isMax && styles.barLabelActive]}>
                {point.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  unit: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: BAR_MAX_HEIGHT + 30, // extra space for value labels
    gap: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '65%',
    minWidth: 6,
    maxWidth: 28,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  barLabelActive: {
    color: Colors.gold,
    fontWeight: FontWeight.semibold,
  },
  valueLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
    textAlign: 'center',
  },
});
