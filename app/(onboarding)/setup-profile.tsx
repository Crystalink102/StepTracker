import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/hooks/useProfile';
import { Button, Input } from '@/src/components/ui';
import { useTheme } from '@/src/context/ThemeContext';
import * as ProfileService from '@/src/services/profile.service';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

export default function SetupProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { refresh: refreshProfile } = useProfile();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const initials = displayName
    ? displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : username
      ? username.slice(0, 2).toUpperCase()
      : '?';

  const handleContinue = async () => {
    if (!user) return;

    // Validate username if provided
    if (username.trim()) {
      if (username.length < 3) {
        setUsernameError('Username must be at least 3 characters');
        return;
      }
      if (username.length > 24) {
        setUsernameError('Username must be 24 characters or less');
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setUsernameError('Only letters, numbers, and underscores');
        return;
      }
    }

    setIsSaving(true);
    setSaveError('');
    try {
      const updates: Record<string, string | null> = {};
      if (username.trim()) {
        updates.username = username.trim().toLowerCase();
      }
      if (displayName.trim()) {
        updates.display_name = displayName.trim();
      }

      if (Object.keys(updates).length > 0) {
        await ProfileService.updateProfile(user.id, updates);
        await refreshProfile();
      }
      router.push('/(onboarding)/body-metrics');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('username')) {
        setUsernameError('That username is already taken');
      } else {
        console.warn('[Onboarding] Failed to save profile:', err);
        setSaveError(msg || 'Could not save your info. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    router.push('/(onboarding)/body-metrics');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.top}>
          <Text style={styles.step}>Step 1 of 3</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Set Up Your Profile</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Pick a username so friends can find you. You can always change this later.
          </Text>

          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          </View>

          <View style={styles.form}>
            <Input
              label="DISPLAY NAME"
              placeholder="Your name"
              value={displayName}
              onChangeText={(t) => setDisplayName(t)}
              autoCapitalize="words"
            />
            <Input
              label="USERNAME"
              placeholder="cool_walker_42"
              value={username}
              onChangeText={(t) => {
                setUsername(t.replace(/[^a-zA-Z0-9_]/g, ''));
                setUsernameError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              error={usernameError}
            />
          </View>
        </View>

        <View style={styles.bottom}>
          {saveError ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{saveError}</Text>
          ) : null}
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
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    lineHeight: 20,
    marginBottom: Spacing.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: Colors.primary,
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
  },
  form: {
    gap: Spacing.xxl,
  },
  bottom: {
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  errorText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
