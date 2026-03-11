import { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type SkeletonLoaderProps = {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export default function SkeletonLoader({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
          backgroundColor: colors.surfaceLight,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {},
});
