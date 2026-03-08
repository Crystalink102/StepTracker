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
import { Button, Input, ConfirmModal } from '@/src/components/ui';
import * as ProfileService from '@/src/services/profile.service';
import { Profile } from '@/src/types/database';
import { Colors, Spacing } from '@/src/constants/theme';

export default function PersonalInfoScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { refresh: refreshProfile } = useProfile();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [restingHR, setRestingHR] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
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
        setHeightCm(p.height_cm ? String(p.height_cm) : '');
        setWeightKg(p.weight_kg ? String(p.weight_kg) : '');
        setDob(p.date_of_birth || '');
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await ProfileService.updateProfile(user.id, {
        resting_hr: restingHR ? parseInt(restingHR, 10) : 70,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        date_of_birth: dob || null,
      });
      await refreshProfile();
      router.back();
    } catch (err: any) {
      setAlertModal({ visible: true, title: 'Save Failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.form}>
        <Input
          label="Resting Heart Rate (BPM)"
          value={restingHR}
          onChangeText={setRestingHR}
          placeholder="70"
          keyboardType="number-pad"
        />
        <Input
          label="Height (cm)"
          value={heightCm}
          onChangeText={setHeightCm}
          placeholder="175"
          keyboardType="decimal-pad"
        />
        <Input
          label="Weight (kg)"
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="70"
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
