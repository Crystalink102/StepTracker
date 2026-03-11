import { type ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, ViewProps } from 'react-native';
import { Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type CardProps = ViewProps & {
  children: ReactNode;
  style?: ViewStyle;
};

export default function Card({ children, style, ...rest }: CardProps) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface }, style]} {...rest}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
});
