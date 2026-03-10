import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { Button, Input } from '@/src/components/ui';
import DateScrollPicker from '@/src/components/ui/DateScrollPicker';
import type { CustomGoal } from '@/src/services/custom-goals.service';

type GoalType = CustomGoal['type'];

const GOAL_TYPES: { value: GoalType; label: string; icon: string }[] = [
  { value: 'steps', label: 'Steps', icon: '\u{1F463}' },
  { value: 'distance', label: 'Distance', icon: '\u{1F4CF}' },
  { value: 'activities', label: 'Activities', icon: '\u{1F3C3}' },
  { value: 'streak', label: 'Streak', icon: '\u{1F525}' },
];

type CreateGoalModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (goal: Omit<CustomGoal, 'id' | 'progress' | 'completed' | 'created_at'>) => void;
};

export default function CreateGoalModal({ visible, onClose, onSave }: CreateGoalModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<GoalType>('steps');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<{ name?: string; target?: string; deadline?: string }>({});

  const resetForm = () => {
    setName('');
    setType('steps');
    setTarget('');
    setDeadline('');
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Goal name is required';
    const targetNum = parseInt(target, 10);
    if (!target || isNaN(targetNum) || targetNum <= 0) {
      newErrors.target = 'Enter a valid positive number';
    }
    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      newErrors.deadline = 'Invalid date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name: name.trim(),
      type,
      target: parseInt(target, 10),
      deadline: deadline || undefined,
    });
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.handleBar} />
            <Text style={styles.title}>Create Personal Goal</Text>

            <Input
              label="GOAL NAME"
              placeholder="e.g., Run 50km this month"
              value={name}
              onChangeText={setName}
              error={errors.name}
              containerStyle={styles.field}
            />

            <View style={styles.field}>
              <Text style={styles.label}>TYPE</Text>
              <View style={styles.typeRow}>
                {GOAL_TYPES.map((gt) => (
                  <TouchableOpacity
                    key={gt.value}
                    style={[styles.typeChip, type === gt.value && styles.typeChipActive]}
                    onPress={() => setType(gt.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: type === gt.value }}
                  >
                    <Text style={styles.typeIcon}>{gt.icon}</Text>
                    <Text
                      style={[
                        styles.typeLabel,
                        type === gt.value && styles.typeLabelActive,
                      ]}
                    >
                      {gt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Input
              label="TARGET VALUE"
              placeholder="e.g., 50000"
              value={target}
              onChangeText={setTarget}
              keyboardType="numeric"
              error={errors.target}
              containerStyle={styles.field}
            />

            <DateScrollPicker
              label="Deadline (Optional)"
              value={deadline}
              onValueChange={setDeadline}
              minYear={new Date().getFullYear()}
              maxYear={new Date().getFullYear() + 10}
              placeholder="Select a deadline"
              error={errors.deadline}
              clearable
              containerStyle={styles.field}
            />

            <View style={styles.actions}>
              <Button title="Cancel" onPress={handleClose} variant="ghost" style={styles.button} />
              <Button title="Save Goal" onPress={handleSave} style={styles.button} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    paddingBottom: Spacing.xxxl * 2,
    maxHeight: '85%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xxl,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeChip: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceLight,
  },
  typeIcon: {
    fontSize: 18,
    marginBottom: Spacing.xs,
  },
  typeLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  typeLabelActive: {
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  button: {
    flex: 1,
  },
});
