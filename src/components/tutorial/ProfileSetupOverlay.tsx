import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/hooks/useProfile';
import { Avatar, Input } from '@/src/components/ui';
import * as ProfileService from '@/src/services/profile.service';
import * as StorageService from '@/src/services/storage.service';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

const PROFILE_SETUP_KEY = 'profile_setup_completed';
const { width: SCREEN_W } = Dimensions.get('window');

const STEPS = [
  {
    icon: 'camera' as const,
    title: 'Add a Profile Photo',
    subtitle: 'Let people know who you are',
  },
  {
    icon: 'person' as const,
    title: 'Set Your Display Name',
    subtitle: 'This is how others will see you',
  },
  {
    icon: 'at' as const,
    title: 'Pick a Username',
    subtitle: 'A unique handle for your profile',
  },
];

type Props = {
  onComplete: () => void;
};

export default function ProfileSetupOverlay({ onComplete }: Props) {
  const { user } = useAuth();
  const { profile, refresh: refreshProfile } = useProfile();
  const { colors } = useTheme();

  const [step, setStep] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Pre-populate from existing profile data (e.g. username set during signup)
  useEffect(() => {
    if (profile && !loaded) {
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
      if (profile.display_name) setDisplayName(profile.display_name);
      if (profile.username) setUsername(profile.username);
      setLoaded(true);
    }
  }, [profile, loaded]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Entrance animation
  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEPS.length,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  // Icon pulse
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    animateIn();
    setError('');
  }, [step, animateIn]);

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Photo access is needed to set your avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !user) return;

      setIsSaving(true);
      setError('');
      const url = await StorageService.uploadAvatar(user.id, result.assets[0].uri);
      await ProfileService.updateProfile(user.id, { avatar_url: url });
      setAvatarUrl(url);
      await refreshProfile();
      setIsSaving(false);
    } catch (err: any) {
      setError(err?.message || 'Could not upload photo.');
      setIsSaving(false);
    }
  };

  const handleSaveAndNext = async () => {
    if (!user) return;
    setError('');

    if (step === 0) {
      // Photo step — already saved on pick, just advance
      goNext();
      return;
    }

    if (step === 1) {
      // Display name
      if (!displayName.trim()) {
        goNext(); // treat empty as skip
        return;
      }
      setIsSaving(true);
      try {
        await ProfileService.updateProfile(user.id, { display_name: displayName.trim() });
        await refreshProfile();
      } catch (err: any) {
        setError(err?.message || 'Could not save display name.');
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
      goNext();
      return;
    }

    if (step === 2) {
      // Username
      if (!username.trim()) {
        finishSetup(); // treat empty as skip
        return;
      }
      setIsSaving(true);
      try {
        await ProfileService.updateProfile(user.id, { username: username.trim().toLowerCase() });
        await refreshProfile();
      } catch (err: any) {
        setError(err?.message || 'Could not save username. It may already be taken.');
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
      finishSetup();
    }
  };

  const goNext = () => {
    setStep((s) => s + 1);
  };

  const handleSkip = () => {
    if (isLast) {
      finishSetup();
    } else {
      goNext();
    }
  };

  const finishSetup = async () => {
    try {
      await completeProfileSetup();
    } catch {
      // Don't block the user if AsyncStorage fails
    }
    onComplete();
  };

  const renderStepContent = () => {
    if (step === 0) {
      return (
        <View style={styles.stepContent}>
          <TouchableOpacity onPress={handlePickPhoto} disabled={isSaving} style={styles.avatarPicker}>
            {isSaving ? (
              <View style={[styles.avatarLoading, { backgroundColor: colors.surfaceLight }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : avatarUrl ? (
              <Avatar uri={avatarUrl} size={120} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
              </View>
            )}
            <Text style={[styles.tapHint, { color: colors.textMuted }]}>
              {avatarUrl ? 'Tap to change' : 'Tap to choose a photo'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 1) {
      return (
        <View style={styles.stepContent}>
          <Input
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Calvin"
            autoFocus
            error={error || undefined}
          />
        </View>
      );
    }

    if (step === 2) {
      return (
        <View style={styles.stepContent}>
          <Input
            label="Username"
            value={username}
            onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, ''))}
            placeholder="e.g. calvinruns"
            autoCapitalize="none"
            autoFocus
            error={error || undefined}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Progress bar */}
          <View style={[styles.progressContainer, { backgroundColor: colors.surfaceLight }]}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Step dots */}
          <View style={styles.stepDots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: colors.surfaceLight },
                  i === step && styles.dotActive,
                  i < step && styles.dotDone,
                ]}
              />
            ))}
          </View>

          {/* Icon */}
          <Animated.View
            style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}
          >
            <Ionicons name={current.icon} size={36} color={colors.white} />
          </Animated.View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{current.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{current.subtitle}</Text>

          {renderStepContent()}

          {step === 0 && error ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          ) : null}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} disabled={isSaving}>
              <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSaveAndNext}
              style={[styles.nextBtn, isSaving && styles.nextBtnDisabled]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Text style={[styles.nextText, { color: colors.white }]}>
                    {isLast ? 'Done' : 'Next'}
                  </Text>
                  {!isLast && (
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={colors.white}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Check if profile setup has been completed */
export async function hasProfileSetupCompleted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(PROFILE_SETUP_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/** Mark profile setup as completed */
export async function completeProfileSetup(): Promise<void> {
  await AsyncStorage.setItem(PROFILE_SETUP_KEY, 'true');
}

/** Reset profile setup (for testing) */
export async function resetProfileSetup(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_SETUP_KEY);
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1001,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  keyboardAvoid: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: SCREEN_W - 48,
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    elevation: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  progressContainer: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  dotDone: {
    backgroundColor: Colors.primaryLight,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  stepContent: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  avatarPicker: {
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLoading: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapHint: {
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  skipBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  skipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.full,
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});
