import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StepStatPeriod } from '@/src/hooks/useStepStats';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type PeriodSelectorProps = {
  period: StepStatPeriod;
  onSelect: (period: StepStatPeriod) => void;
};

const OPTIONS: { label: string; value: StepStatPeriod }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

export default function PeriodSelector({ period, onSelect }: PeriodSelectorProps) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((opt) => {
        const active = opt.value === period;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.pill, active && styles.activePill]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  activePill: {
    backgroundColor: Colors.primary,
  },
  label: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  activeLabel: {
    color: Colors.white,
  },
});
