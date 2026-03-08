import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/hooks/useProfile';
import { Button, Input } from '@/src/components/ui';
import * as ProfileService from '@/src/services/profile.service';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

export default function BodyMetricsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refresh: refreshProfile } = useProfile();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [heightError, setHeightError] = useState('');
  const [weightError, setWeightError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (!user) return;

    // Validate inputs if provided
    let hasError = false;
    setHeightError('');
    setWeightError('');

    if (height.trim()) {
      const h = parseInt(height, 10);
      if (isNaN(h) || h < 50 || h > 300) {
        setHeightError('Enter a height between 50–300 cm');
        hasError = true;
      }
    }
    if (weight.trim()) {
      const w = parseInt(weight, 10);
      if (isNaN(w) || w < 20 || w > 500) {
        setWeightError('Enter a weight between 20–500 kg');
        hasError = true;
      }
    }
    if (hasError) return;

    setIsSaving(true);
    try {
      const updates: Record<string, number> = {};
      if (height.trim()) updates.height_cm = parseInt(height, 10);
      if (weight.trim()) updates.weight_kg = parseInt(weight, 10);

      if (Object.keys(updates).length > 0) {
        await ProfileService.updateProfile(user.id, updates);
        await refreshProfile();
      }
      router.push('/(onboarding)/daily-goal');
    } catch (err) {
      console.warn('[Onboarding] Failed to save metrics:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    router.push('/(onboarding)/daily-goal');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.top}>
          <Text style={styles.step}>Step 1 of 2</Text>
          <Text style={styles.title}>About You</Text>
          <Text style={styles.subtitle}>
            This helps us calculate calories and stride length more accurately.
          </Text>

          <View style={styles.form}>
            <Input
              label="HEIGHT (CM)"
              placeholder="170"
              keyboardType="numeric"
              value={height}
              onChangeText={(t) => { setHeight(t); setHeightError(''); }}
              error={heightError}
            />
            <Input
              label="WEIGHT (KG)"
              placeholder="70"
              keyboardType="numeric"
              value={weight}
              onChangeText={(t) => { setWeight(t); setWeightError(''); }}
              error={weightError}
            />
          </View>
        </View>

        <View style={styles.bottom}>
          <Button
            title="Continue"
            onPress={handleContinue}
            isLoading={isSaving}
          />
          <Button
            title="Skip for now"
            variant="ghost"
            onPress={handleSkip}
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
  form: {
    gap: Spacing.xxl,
  },
  bottom: {
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
});
