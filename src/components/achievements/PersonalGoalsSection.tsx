import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import type { CustomGoal } from '@/src/services/custom-goals.service';

const TYPE_LABELS: Record<string, string> = {
  steps: 'Steps',
  distance: 'Distance',
  activities: 'Activities',
  streak: 'Streak',
};

const TYPE_ICONS: Record<string, string> = {
  steps: '\u{1F463}',
  distance: '\u{1F4CF}',
  activities: '\u{1F3C3}',
  streak: '\u{1F525}',
};

type PersonalGoalsSectionProps = {
  goals: CustomGoal[];
  onDelete: (id: string) => void;
  onCreatePress: () => void;
};

export default function PersonalGoalsSection({
  goals,
  onDelete,
  onCreatePress,
}: PersonalGoalsSectionProps) {
  const handleDelete = (goal: CustomGoal) => {
    Alert.alert('Delete Goal', `Remove "${goal.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(goal.id) },
    ]);
  };

  const isExpired = (goal: CustomGoal) => {
    if (!goal.deadline) return false;
    return new Date(goal.deadline + 'T23:59:59') < new Date();
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>PERSONAL GOALS</Text>
        <TouchableOpacity onPress={onCreatePress} style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {goals.length === 0 && (
        <TouchableOpacity style={styles.emptyCard} onPress={onCreatePress}>
          <Ionicons name="flag-outline" size={28} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Create your first personal goal</Text>
        </TouchableOpacity>
      )}

      {goals.map((goal) => {
        const progress = Math.min(goal.progress / goal.target, 1);
        const expired = isExpired(goal);

        return (
          <View key={goal.id} style={[styles.goalCard, expired && !goal.completed && styles.expired]}>
            <View style={styles.goalTop}>
              <Text style={styles.goalIcon}>{TYPE_ICONS[goal.type] ?? '\u{2B50}'}</Text>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName} numberOfLines={1}>
                  {goal.name}
                </Text>
                <Text style={styles.goalMeta}>
                  {TYPE_LABELS[goal.type] ?? goal.type}
                  {goal.deadline ? ` \u{00B7} Due ${goal.deadline}` : ''}
                </Text>
              </View>
              {goal.completed ? (
                <Ionicons name="checkmark-circle" size={22} color={Colors.gold} />
              ) : (
                <TouchableOpacity
                  onPress={() => handleDelete(goal)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.progressRow}>
              <ProgressBar
                progress={progress}
                color={goal.completed ? Colors.gold : Colors.primary}
                height={6}
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>
                {goal.progress.toLocaleString()} / {goal.target.toLocaleString()}
              </Text>
            </View>

            {expired && !goal.completed && (
              <Text style={styles.expiredText}>Expired</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    color: Colors.gold,
  },
  addButton: {
    padding: Spacing.xs,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xxl,
    marginHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  expired: {
    opacity: 0.5,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  goalIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  goalMeta: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  progressBar: {
    flex: 1,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    minWidth: 80,
    textAlign: 'right',
  },
  expiredText: {
    color: Colors.danger,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.xs,
  },
});
