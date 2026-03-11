import { useEffect } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import Button from '@/src/components/ui/Button';
import Confetti from '@/src/components/ui/Confetti';
import { AchievementDefinition } from '@/src/types/database';
import { CATEGORY_CONFIG } from '@/src/constants/achievements';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { usePreferences } from '@/src/context/PreferencesContext';
import { useTheme } from '@/src/context/ThemeContext';
import { playAchievement } from '@/src/utils/sounds';

type AchievementPopupProps = {
  achievement: AchievementDefinition | null;
  onDismiss: () => void;
};

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

export default function AchievementPopup({ achievement, onDismiss }: AchievementPopupProps) {
  const scale = useSharedValue(0);
  const { preferences } = usePreferences();
  const { colors } = useTheme();

  useEffect(() => {
    if (achievement) {
      scale.value = 0;
      scale.value = withDelay(
        100,
        withSpring(1, { damping: 8, stiffness: 120 })
      );
      playAchievement(preferences.hapticFeedback);
    }
  }, [achievement, scale, preferences.hapticFeedback]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!achievement) return null;

  const categoryColor = CATEGORY_CONFIG[achievement.category]?.color ?? Colors.primary;

  return (
    <Modal transparent animationType="fade" visible={!!achievement}>
      <View style={styles.overlay}>
        <Confetti visible={!!achievement} />
        <Animated.View style={[styles.content, animatedStyle]}>
          <View style={[styles.iconCircle, { backgroundColor: categoryColor }]}>
            <Text style={styles.icon}>{getIconEmoji(achievement.icon_name)}</Text>
          </View>

          <Text style={[styles.unlocked, { color: colors.textMuted }]}>Achievement Unlocked!</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{achievement.title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{achievement.description}</Text>

          {achievement.xp_reward > 0 && (
            <Text style={styles.xpReward}>+{achievement.xp_reward} XP</Text>
          )}
        </Animated.View>

        <View style={styles.bottom}>
          <Button
            title="Nice!"
            onPress={onDismiss}
            variant="primary"
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  icon: {
    fontSize: 48,
  },
  unlocked: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSize.lg,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  xpReward: {
    color: Colors.primary,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.xl,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxl + 16,
  },
  button: {
    width: '100%',
  },
});
