import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/hooks/useProfile';
import { useToast } from '@/src/hooks/useToast';
import { Button, Input, ConfirmModal } from '@/src/components/ui';
import { usePreferences } from '@/src/context/PreferencesContext';
import * as ProfileService from '@/src/services/profile.service';
import { Profile } from '@/src/types/database';
import { Colors, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.453592;

export default function PersonalInfoScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { refresh: refreshProfile } = useProfile();
  const { showToast } = useToast();
  const { preferences } = usePreferences();

  const heightUnit = preferences.heightUnit;
  const weightUnit = preferences.weightUnit;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [restingHR, setRestingHR] = useState('');
  const [heightValue, setHeightValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [dob, setDob] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '' });

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    ProfileService.getProfile(user.id)
      .then((p) => {
        setProfile(p);
        setRestingHR(String(p.resting_hr || ''));
        if (p.height_cm) {
          setHeightValue(
            heightUnit === 'ft'
              ? (p.height_cm / CM_PER_INCH).toFixed(1)
              : String(p.height_cm)
          );
        }
        if (p.weight_kg) {
          setWeightValue(
            weightUnit === 'lb'
              ? (p.weight_kg / KG_PER_LB).toFixed(1)
              : String(p.weight_kg)
          );
        }
        setDob(p.date_of_birth || '');
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user, heightUnit, weightUnit]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      let heightCm: number | null = null;
      let weightKg: number | null = null;

      if (heightValue) {
        const val = parseFloat(heightValue);
        heightCm = heightUnit === 'ft' ? Math.round(val * CM_PER_INCH) : val;
      }
      if (weightValue) {
        const val = parseFloat(weightValue);
        weightKg = weightUnit === 'lb' ? Math.round(val * KG_PER_LB * 10) / 10 : val;
      }

      await ProfileService.updateProfile(user.id, {
        resting_hr: restingHR ? parseInt(restingHR, 10) : 70,
        height_cm: heightCm,
        weight_kg: weightKg,
        date_of_birth: dob || null,
      });
      await refreshProfile();
      showToast('Personal info saved', 'success');
      router.back();
    } catch (err: any) {
      showToast('Failed to save info', 'error');
      setAlertModal({ visible: true, title: 'Save Failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.form}>
        <Input
          label="Resting Heart Rate (BPM)"
          value={restingHR}
          onChangeText={setRestingHR}
          placeholder="70"
          keyboardType="number-pad"
        />
        <Input
          label={heightUnit === 'ft' ? 'Height (inches)' : 'Height (cm)'}
          value={heightValue}
          onChangeText={setHeightValue}
          placeholder={heightUnit === 'ft' ? '69' : '175'}
          keyboardType="decimal-pad"
        />
        <Input
          label={weightUnit === 'lb' ? 'Weight (lb)' : 'Weight (kg)'}
          value={weightValue}
          onChangeText={setWeightValue}
          placeholder={weightUnit === 'lb' ? '155' : '70'}
          keyboardType="decimal-pad"
        />
        <Input
          label="Date of Birth (YYYY-MM-DD)"
          value={dob}
          onChangeText={setDob}
          placeholder="2000-01-15"
        />
      </View>

      <Button
        title="Save"
        onPress={handleSave}
        isLoading={isSaving}
        style={styles.saveButton}
      />

      <ConfirmModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        onConfirm={() => setAlertModal({ visible: false, title: '', message: '' })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.xxl,
  },
  form: {
    gap: Spacing.xl,
  },
  saveButton: {
    marginTop: Spacing.xxxl,
  },
});
