import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/hooks/useProfile';
import { Button, Input } from '@/src/components/ui';
import * as ProfileService from '@/src/services/profile.service';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

const PRESETS = [
  { label: '5,000', value: 5000 },
  { label: '8,000', value: 8000 },
  { label: '10,000', value: 10000 },
  { label: '15,000', value: 15000 },
];

export default function DailyGoalScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refresh: refreshProfile } = useProfile();
  const [selected, setSelected] = useState(10000);
  const [custom, setCustom] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customError, setCustomError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleFinish = async () => {
    if (!user) return;
    setCustomError('');

    let goal = selected;
    if (showCustom) {
      const parsed = parseInt(custom, 10);
      if (!custom.trim() || isNaN(parsed) || parsed < 100 || parsed > 100000) {
        setCustomError('Enter a goal between 100–100,000 steps');
        return;
      }
      goal = parsed;
    }

    setIsSaving(true);
    try {
      const updates: Record<string, number> = { daily_step_goal: goal };
      try {
        const profile = await ProfileService.getProfile(user.id);
        if (profile && profile.height_cm === null) {
          updates.height_cm = 170;
        }
      } catch {
        // Profile fetch failed — just save the goal
        updates.height_cm = 170;
      }
      await ProfileService.updateProfile(user.id, updates);
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (err) {
      console.warn('[Onboarding] Failed to save goal:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.top}>
          <Text style={styles.step}>Step 2 of 2</Text>
          <Text style={styles.title}>Daily Step Goal</Text>
          <Text style={styles.subtitle}>
            Pick a target that feels right. You can always change it later in settings.
          </Text>

          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.preset,
                  !showCustom && selected === p.value && styles.presetActive,
                ]}
                onPress={() => {
                  setSelected(p.value);
                  setShowCustom(false);
                }}
              >
                <Text
                  style={[
                    styles.presetText,
                    !showCustom && selected === p.value && styles.presetTextActive,
                  ]}
                >
                  {p.label}
                </Text>
                <Text style={styles.presetLabel}>steps</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => setShowCustom(true)}
            style={[styles.customToggle, showCustom && styles.customToggleActive]}
          >
            <Text style={styles.customToggleText}>
              {showCustom ? 'Custom goal:' : 'Set custom goal'}
            </Text>
          </TouchableOpacity>

          {showCustom && (
            <Input
              placeholder="Enter step goal"
              keyboardType="numeric"
              value={custom}
              onChangeText={(t) => { setCustom(t); setCustomError(''); }}
              error={customError}
            />
          )}
        </View>

        <View style={styles.bottom}>
          <Button
            title="Let's Go!"
            onPress={handleFinish}
            isLoading={isSaving}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: Spacing.xxxl,
    justifyContent: 'space-between',
  },
  top: {},
  step: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    lineHeight: 20,
    marginBottom: Spacing.xxxl,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  preset: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  presetActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceLight,
  },
  presetText: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  presetTextActive: {
    color: Colors.primary,
  },
  presetLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  customToggle: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  customToggleActive: {},
  customToggleText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  bottom: {
    paddingBottom: Spacing.lg,
  },
});
