import { useState, useEffect } from 'react';
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
import { useAuth } from '@/src/context/AuthContext';
import { ConfirmModal } from '@/src/components/ui';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

export default function VerifyMFAScreen() {
  const { colors } = useTheme();
  const { verifyMFA, getMFAFactors } = useAuth();

  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFactor, setIsLoadingFactor] = useState(true);
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string) =>
    setAlertModal({ visible: true, title, message });

  useEffect(() => {
    const loadFactor = async () => {
      try {
        const factors = await getMFAFactors();
        const verified = factors?.totp?.filter((f: any) => f.status === 'verified') ?? [];
        if (verified.length > 0) {
          setFactorId(verified[0].id);
        }
      } catch (err: any) {
        showAlert('Error', 'Could not load 2FA factors.');
      } finally {
        setIsLoadingFactor(false);
      }
    };
    loadFactor();
  }, [getMFAFactors]);

  const handleVerify = async () => {
    if (code.length < 6) {
      showAlert('Invalid Code', 'Enter the 6-digit code from your authenticator app.');
      return;
    }
    if (!factorId) {
      showAlert('Error', 'No 2FA factor found. Please contact support.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyMFA(factorId, code);
      // Auth state change will handle navigation via AuthGate
    } catch (err: any) {
      showAlert('Verification Failed', err.message || 'Invalid code. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingFactor) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading 2FA...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Two-Factor{'\n'}Authentication</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter the 6-digit code from your authenticator app to continue.
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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FontSize.lg,
    marginTop: Spacing.lg,
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
});
