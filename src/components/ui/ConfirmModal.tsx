import { View, Text, Modal, StyleSheet } from 'react-native';
import Button from './Button';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colors } = useTheme();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel ?? onConfirm}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          <View style={styles.actions}>
            {onCancel && (
              <Button
                title={cancelLabel}
                onPress={onCancel}
                variant="ghost"
                style={styles.button}
              />
            )}
            <Button
              title={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? 'danger' : 'primary'}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  dialog: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.md,
    lineHeight: 20,
    marginBottom: Spacing.xxl,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
  },
});
