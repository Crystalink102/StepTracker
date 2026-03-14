import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { ConfirmModal } from '@/src/components/ui';
import { useTheme } from '@/src/context/ThemeContext';
import * as ProfileService from '@/src/services/profile.service';
import { supabase } from '@/src/services/supabase';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { verifyOTP, resendConfirmation, user } = useAuth();
  const params = useLocalSearchParams<{ type: 'sms' | 'email'; identifier: string; username?: string }>();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string) =>
    setAlertModal({ visible: true, title, message });

  const handleVerify = async () => {
    if (code.length < 6) {
      showAlert('Invalid Code', 'Please enter the 6-digit code.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP(code, params.type, params.identifier);
      // Save username if provided during signup
      if (params.username) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await ProfileService.updateProfile(session.user.id, { username: params.username });
          }
        } catch {
          // Non-critical — user can set username later in profile setup
        }
      }
      // OTP verified — AuthGate handles routing to onboarding or main app
    } catch (err: any) {
      showAlert('Verification Failed', err.message || 'Invalid code. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Verify Your{'\n'}{params.type === 'sms' ? 'Phone' : 'Email'}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.identifier}>{params.identifier}</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.codeInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={code}
            onChangeText={setCode}
            placeholder="000000"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
            autoFocus
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={async () => {
              setIsResending(true);
              try {
                await resendConfirmation(params.type, params.identifier);
                showAlert('Code Sent', `A new code has been sent to ${params.identifier}.`);
              } catch (err: any) {
                showAlert('Resend Failed', err.message || 'Could not resend code. Try again later.');
              } finally {
                setIsResending(false);
              }
            }}
            disabled={isResending}
          >
            {isResending ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.resendText}>Didn't get a code? Resend</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ConfirmModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        onConfirm={() => setAlertModal({ visible: false, title: '', message: '' })}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.xxxl,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.lg,
    marginTop: Spacing.md,
    lineHeight: 24,
  },
  identifier: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  form: {
    gap: Spacing.xl,
  },
  codeInput: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    letterSpacing: 12,
    borderWidth: 1,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  resendText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
