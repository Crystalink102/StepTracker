import { type ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, ViewProps } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/src/constants/theme';

type CardProps = ViewProps & {
  children: ReactNode;
  style?: ViewStyle;
};

export default function Card({ children, style, ...rest }: CardProps) {
  return <View style={[styles.card, style]} {...rest}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
});
