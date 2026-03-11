import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import type { ThemeColors } from '@/src/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

function getVariantStyles(themeColors: ThemeColors): Record<ButtonVariant, { bg: string; text: string }> {
  return {
    primary: { bg: themeColors.primary, text: themeColors.white },
    secondary: { bg: themeColors.secondary, text: themeColors.white },
    danger: { bg: themeColors.danger, text: themeColors.white },
    ghost: { bg: themeColors.transparent, text: themeColors.primary },
  };
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const { colors: themeColors } = useTheme();
  const variantStyles = getVariantStyles(themeColors);
  const variantColor = variantStyles[variant];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: variantColor.bg },
        variant === 'ghost' && { borderWidth: 1.5, borderColor: themeColors.primary },
        (disabled || isLoading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || isLoading, busy: isLoading }}
    >
      {isLoading ? (
        <ActivityIndicator color={variantColor.text} />
      ) : (
        <Text style={[styles.text, { color: variantColor.text }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  disabled: {
    opacity: 0.5,
  },
});
