import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

export type ToastType = 'success' | 'error' | 'info';

type ToastProps = {
  message: string;
  type: ToastType;
  visible: boolean;
  onHide: () => void;
  duration?: number;
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: '#22C55E',
  error: '#EF4444',
  info: '#3B82F6',
};

const TOAST_ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

export default function Toast({ message, type, visible, onHide, duration = 3000 }: ToastProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss
      timerRef.current = setTimeout(() => {
        slideOut();
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const slideOut = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const color = TOAST_COLORS[type];
  const icon = TOAST_ICONS[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + Spacing.sm,
          backgroundColor: colors.surface,
          borderLeftColor: color,
          transform: [{ translateY }],
          opacity,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },
      ]}
    >
      <Ionicons name={icon} size={22} color={color} style={styles.icon} />
      <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    zIndex: 9999,
  },
  icon: {
    marginRight: Spacing.md,
  },
  message: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
});
