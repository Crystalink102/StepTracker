import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'muted';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
};

export default function Badge({ label, variant = 'primary', style }: BadgeProps) {
  const { colors: themeColors } = useTheme();

  const variantMap: Record<BadgeVariant, { bg: string; text: string }> = {
    primary: { bg: Colors.primary + '20', text: Colors.primaryLight },
    secondary: { bg: Colors.secondary + '20', text: Colors.secondaryLight },
    accent: { bg: Colors.accent + '20', text: Colors.accentLight },
    muted: { bg: themeColors.surfaceLight, text: themeColors.textSecondary },
  };

  const vc = variantMap[variant];

  return (
    <View style={[styles.badge, { backgroundColor: vc.bg }, style]}>
      <Text style={[styles.text, { color: vc.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
