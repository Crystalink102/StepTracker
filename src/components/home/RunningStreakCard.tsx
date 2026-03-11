import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '@/src/components/ui/Card';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type RunningStreakCardProps = {
  streak: number;
};

export default function RunningStreakCard({ streak }: RunningStreakCardProps) {
  const { colors } = useTheme();
  const glowAnim = useRef(new Animated.Value(0)).current;
  const prevStreakRef = useRef(streak);

  // Subtle glow animation when streak increases
  useEffect(() => {
    if (streak > prevStreakRef.current && prevStreakRef.current > 0) {
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();
    }
    prevStreakRef.current = streak;
  }, [streak, glowAnim]);

  if (streak <= 0) return null;

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', Colors.primary + '30'],
  });

  return (
    <Animated.View style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: glowColor as any }}>
      <Card
        style={styles.card}
        accessible
        accessibilityLabel={`${streak}-day run streak`}
      >
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Ionicons name="footsteps" size={24} color={Colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.count, { color: colors.textPrimary }]}>{streak}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>day run streak</Text>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  count: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
});
