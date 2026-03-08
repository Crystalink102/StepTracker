import { View, Text, StyleSheet } from 'react-native';
import { AchievementDefinition, UserAchievement } from '@/src/types/database';
import { CATEGORY_CONFIG } from '@/src/constants/achievements';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type AchievementCardProps = {
  definition: AchievementDefinition;
  userAchievement?: UserAchievement;
};

export default function AchievementCard({ definition, userAchievement }: AchievementCardProps) {
  const isUnlocked = !!userAchievement;
  const categoryColor = CATEGORY_CONFIG[definition.category]?.color ?? Colors.primary;

  const unlockedDate = userAchievement
    ? new Date(userAchievement.unlocked_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <View style={[styles.container, !isUnlocked && styles.locked]}>
      <View style={[styles.iconCircle, { backgroundColor: isUnlocked ? categoryColor : Colors.surfaceLight }]}>
        <Text style={styles.iconText}>
          {isUnlocked ? getIconEmoji(definition.icon_name) : '?'}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.title, !isUnlocked && styles.lockedText]}>
          {definition.title}
        </Text>
        <Text style={[styles.description, !isUnlocked && styles.lockedText]}>
          {definition.description}
        </Text>
        {isUnlocked && unlockedDate && (
          <Text style={styles.date}>Unlocked {unlockedDate}</Text>
        )}
      </View>

      {definition.xp_reward > 0 && (
        <View style={styles.xpBadge}>
          <Text style={[styles.xpText, !isUnlocked && styles.lockedText]}>
            +{definition.xp_reward} XP
          </Text>
        </View>
      )}
    </View>
  );
}

function getIconEmoji(iconName: string): string {
  const map: Record<string, string> = {
    footprints: '\u{1F463}',
    fire: '\u{1F525}',
    trophy: '\u{1F3C6}',
    layers: '\u{1F4DA}',
    award: '\u{1F3C5}',
    zap: '\u{26A1}',
    flame: '\u{1F525}',
    crown: '\u{1F451}',
    play: '\u{25B6}',
    repeat: '\u{1F504}',
    medal: '\u{1F3C5}',
    star: '\u{2B50}',
    gem: '\u{1F48E}',
  };
  return map[iconName] ?? '\u{2B50}';
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  locked: {
    opacity: 0.4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconText: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  date: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  lockedText: {
    color: Colors.textMuted,
  },
  xpBadge: {
    marginLeft: Spacing.sm,
  },
  xpText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});
