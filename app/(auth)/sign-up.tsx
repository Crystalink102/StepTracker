import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { ConfirmModal } from '@/src/components/ui';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signUpEmail, signUpPhone } = useAuth();

  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string) =>
    setAlertModal({ visible: true, title, message });

  const handleSignUp = async () => {
    if (method === 'email' && !email.trim()) {
      showAlert('Missing Email', 'Please enter your email address.');
      return;
    }
    if (method === 'phone' && !phone.trim()) {
      showAlert('Missing Phone', 'Please enter your phone number.');
      return;
    }
    if (password.length < 8) {
      showAlert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Password Mismatch', "Passwords don't match.");
      return;
    }

    setIsLoading(true);
    try {
      const usernameParam = username.trim().toLowerCase() || '';
      if (method === 'email') {
        await signUpEmail(email.trim(), password);
        router.replace({
          pathname: '/(auth)/verify-otp',
          params: { type: 'email', identifier: email.trim(), username: usernameParam },
        });
      } else {
        const cleaned = phone.replace(/[\s-()]/g, '');
        await signUpPhone(cleaned, password);
        router.replace({
          pathname: '/(auth)/verify-otp',
          params: { type: 'sms', identifier: cleaned, username: usernameParam },
        });
      }
    } catch (err: any) {
      showAlert('Sign Up Failed', err.message || 'Something went wrong.');
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
          <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Start earning XP for every step</Text>
        </View>

        {/* Method Toggle */}
        <View style={[styles.toggle, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, method === 'email' && styles.toggleBtnActive]}
            onPress={() => setMethod('email')}
          >
            <Text
              style={[
                styles.toggleText,
                { color: colors.textMuted },
                method === 'email' && styles.toggleTextActive,
              ]}
            >
              Email
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, method === 'phone' && styles.toggleBtnActive]}
            onPress={() => setMethod('phone')}
          >
            <Text
              style={[
                styles.toggleText,
                { color: colors.textMuted },
                method === 'phone' && styles.toggleTextActive,
              ]}
            >
              Phone
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {method === 'email' ? (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 234 567 8900"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Username <Text style={[styles.optionalLabel, { color: colors.textMuted }]}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={username}
              onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="e.g. calvinruns"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Log In</Text>
            </TouchableOpacity>
          </Link>
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
    marginBottom: Spacing.xxl,
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
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionalLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    textTransform: 'lowercase',
  },
  input: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: FontSize.lg,
    borderWidth: 1,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxxl,
  },
  footerText: {
    fontSize: FontSize.md,
  },
  linkText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
