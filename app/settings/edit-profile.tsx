import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/hooks/useProfile';
import { Avatar, Button, Input, ConfirmModal } from '@/src/components/ui';
import * as ProfileService from '@/src/services/profile.service';
import * as StorageService from '@/src/services/storage.service';
import { Profile } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { refresh: refreshProfile } = useProfile();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [stepGoal, setStepGoal] = useState('10000');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string) =>
    setAlertModal({ visible: true, title, message });

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    ProfileService.getProfile(user.id)
      .then((p) => {
        setProfile(p);
        setDisplayName(p.display_name || '');
        setUsername(p.username || '');
        setStepGoal(String(p.daily_step_goal ?? 10000));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !user) return;

    try {
      const avatarUrl = await StorageService.uploadAvatar(
        user.id,
        result.assets[0].uri
      );
      await ProfileService.updateProfile(user.id, { avatar_url: avatarUrl });
      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : null));
      await refreshProfile();
    } catch (err: any) {
      showAlert('Upload Failed', err.message);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const goalNum = parseInt(stepGoal, 10);
      const updated = await ProfileService.updateProfile(user.id, {
        display_name: displayName || null,
        username: username || null,
        daily_step_goal: isNaN(goalNum) || goalNum < 100 ? 10000 : goalNum,
      });
      setProfile(updated);
      await refreshProfile();
      router.back();
    } catch (err: any) {
      showAlert('Save Failed', err.message);
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
      <TouchableOpacity style={styles.avatarSection} onPress={handlePickImage}>
        <Avatar
          uri={profile?.avatar_url}
          name={displayName || username}
          size={100}
        />
        <Text style={styles.changePhoto}>Change Photo</Text>
      </TouchableOpacity>

      <View style={styles.form}>
        <Input
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
        />
        <Input
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="username"
          autoCapitalize="none"
        />
        <Input
          label="Daily Step Goal"
          value={stepGoal}
          onChangeText={setStepGoal}
          placeholder="10000"
          keyboardType="numeric"
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  changePhoto: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.md,
  },
  form: {
    gap: Spacing.xl,
  },
  saveButton: {
    marginTop: Spacing.xxxl,
  },
});
