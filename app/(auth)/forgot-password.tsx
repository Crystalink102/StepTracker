import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { resetPasswordForEmail } from '@/src/services/auth.service';
import { Input, Button, ConfirmModal } from '@/src/components/ui';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string) =>
    setAlertModal({ visible: true, title, message });

  const handleSendReset = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      showAlert('Missing Email', 'Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordForEmail(trimmed);
      showAlert(
        'Check Your Email',
        'If an account exists with that email, a password reset link has been sent. Check your inbox and spam folder.'
      );
    } catch (err: any) {
      showAlert('Reset Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.appName}>5tepTracker</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your email and we'll send you a link to reset your password
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Button
            title="Send Reset Link"
            onPress={handleSendReset}
            isLoading={isLoading}
            disabled={isLoading}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.xxxl,
  },
  appName: {
    color: Colors.primary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.lg,
    marginTop: Spacing.sm,
    lineHeight: 24,
  },
  form: {
    gap: Spacing.lg,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xxxl,
  },
  linkText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
