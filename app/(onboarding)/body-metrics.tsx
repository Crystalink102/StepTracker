import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Button, Input } from '@/src/components/ui';
import * as ProfileService from '@/src/services/profile.service';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

export default function BodyMetricsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const updates: Record<string, number> = {};
      const h = parseInt(height, 10);
      const w = parseInt(weight, 10);
      if (h > 0) updates.height_cm = h;
      if (w > 0) updates.weight_kg = w;

      if (Object.keys(updates).length > 0) {
        await ProfileService.updateProfile(user.id, updates);
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
              onChangeText={setHeight}
            />
            <Input
              label="WEIGHT (KG)"
              placeholder="70"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
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
