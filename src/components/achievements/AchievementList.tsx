import { View, Text, StyleSheet } from 'react-native';
import { AchievementDefinition, UserAchievement } from '@/src/types/database';
import { CATEGORY_CONFIG, CATEGORY_ORDER } from '@/src/constants/achievements';
import AchievementCard from './AchievementCard';
import { FontSize, FontWeight, Spacing } from '@/src/constants/theme';

type AchievementListProps = {
  definitions: AchievementDefinition[];
  userAchievements: UserAchievement[];
};

export default function AchievementList({ definitions, userAchievements }: AchievementListProps) {
  const achievementMap = new Map(
    userAchievements.map((ua) => [ua.achievement_id, ua])
  );

  // Group by category
  const grouped = new Map<string, AchievementDefinition[]>();
  for (const def of definitions) {
    const list = grouped.get(def.category) ?? [];
    list.push(def);
    grouped.set(def.category, list);
  }

  return (
    <View>
      {CATEGORY_ORDER.map((category) => {
        const defs = grouped.get(category);
        if (!defs || defs.length === 0) return null;
        const config = CATEGORY_CONFIG[category];

        return (
          <View key={category} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: config.color }]}>
              {config.label.toUpperCase()}
            </Text>
            {defs.map((def) => (
              <AchievementCard
                key={def.id}
                definition={def}
                userAchievement={achievementMap.get(def.id)}
              />
            ))}
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
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
});
