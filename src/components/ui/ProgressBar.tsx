import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Colors, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type ProgressBarProps = {
  progress: number; // 0 to 1
  color?: string;
  height?: number;
  style?: ViewStyle;
};

export default function ProgressBar({
  progress,
  color = Colors.primary,
  height = 8,
  style,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${clampedProgress * 100}%`, { duration: 500 }),
  }));

  return (
    <View style={[styles.track, { height, backgroundColor: colors.surfaceLight }, style]}>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color, height },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: BorderRadius.full,
  },
});
