import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
};

export default function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
    >
      <Ionicons name={icon} size={64} color={colors.textMuted} accessibilityElementsHidden />
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      {action && (
        <Button
          title={action.label}
          onPress={action.onPress}
          variant="ghost"
          style={styles.actionButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
    paddingHorizontal: Spacing.xxxl,
  },
  title: {
    color: Colors.textSecondary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  actionButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xxxl,
  },
});
