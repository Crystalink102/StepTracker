import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '@/src/components/ui/Card';
import { DistanceUnit } from '@/src/context/PreferencesContext';
import { formatDistance, metersToDisplayDistance, distanceUnitShort } from '@/src/utils/formatters';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type WeeklyDistanceCardProps = {
  goalMeters: number;
  currentMeters: number;
  distanceUnit: DistanceUnit;
  onSetGoal?: () => void;
};

export default function WeeklyDistanceCard({
  goalMeters,
  currentMeters,
  distanceUnit,
  onSetGoal,
}: WeeklyDistanceCardProps) {
  const { colors } = useTheme();

  const percentage = goalMeters > 0 ? Math.min(100, Math.round((currentMeters / goalMeters) * 100)) : 0;
  const isComplete = goalMeters > 0 && currentMeters >= goalMeters;

  if (goalMeters <= 0) {
    return (
      <Card style={styles.card}>
        <TouchableOpacity onPress={onSetGoal} style={styles.setGoalRow}>
          <Ionicons name="flag-outline" size={20} color={Colors.primary} />
          <Text style={[styles.setGoalText, { color: Colors.primary }]}>Set a Weekly Distance Goal</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </Card>
    );
  }

  const currentDisplay = metersToDisplayDistance(currentMeters, distanceUnit);
  const goalDisplay = metersToDisplayDistance(goalMeters, distanceUnit);
  const unit = distanceUnitShort(distanceUnit);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons
          name="flag"
          size={18}
          color={isComplete ? Colors.gold : Colors.primary}
        />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Weekly Distance</Text>
        {isComplete && (
          <View style={styles.completeBadge}>
            <Ionicons name="checkmark" size={12} color="#FFF" />
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceLight }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${percentage}%`,
              backgroundColor: isComplete ? Colors.gold : Colors.primary,
            },
          ]}
        />
      </View>

      <View style={styles.detailsRow}>
        <Text style={[styles.distanceText, { color: colors.textPrimary }]}>
          {currentDisplay.toFixed(1)} {unit}
        </Text>
        <Text style={[styles.goalLabel, { color: colors.textMuted }]}>
          / {goalDisplay.toFixed(1)} {unit}
        </Text>
        <Text style={[styles.percentText, { color: isComplete ? Colors.gold : Colors.primary }]}>
          {percentage}%
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  setGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  setGoalText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  completeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: 8,
    borderRadius: BorderRadius.full,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  distanceText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  goalLabel: {
    fontSize: FontSize.sm,
    flex: 1,
  },
  percentText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
