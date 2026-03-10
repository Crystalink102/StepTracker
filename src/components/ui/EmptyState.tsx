import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

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
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={Colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
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
