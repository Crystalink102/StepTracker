import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

export default function SetupMFAScreen() {
  const router = useRouter();
  const { enrollMFA, verifyMFA } = useAuth();

  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(true);

  useEffect(() => {
    const setup = async () => {
      try {
        const data = await enrollMFA();
        setQrCode(data.qr);
        setSecret(data.secret);
        setFactorId(data.factorId);
      } catch (err: any) {
        Alert.alert('MFA Setup Error', err.message || 'Could not set up 2FA.');
      } finally {
        setIsEnrolling(false);
      }
    };
    setup();
  }, [enrollMFA]);

  const handleVerify = async () => {
    if (code.length < 6) {
      Alert.alert('Invalid Code', 'Enter the 6-digit code from your authenticator app.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyMFA(factorId, code);
      // MFA verified - auth state change will route to main app
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid code. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEnrolling) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Setting up 2FA...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Set Up 2FA</Text>
        <Text style={styles.subtitle}>
          Scan this QR code with your authenticator app (Google Authenticator,
          Authy, etc.)
        </Text>
      </View>

      {qrCode ? (
        <View style={styles.qrContainer}>
          <Image
            source={{ uri: qrCode }}
            style={styles.qrImage}
            resizeMode="contain"
          />
        </View>
      ) : null}

      <View style={styles.secretContainer}>
        <Text style={styles.secretLabel}>Or enter this code manually:</Text>
        <Text style={styles.secretText} selectable>
          {secret}
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Authenticator Code</Text>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={setCode}
            placeholder="000000"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>
      </View>
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
  scrollContent: {
    padding: Spacing.xxl,
    paddingTop: 60,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    marginTop: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    alignSelf: 'center',
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  secretContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  secretLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
  secretText: {
    color: Colors.accent,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  form: {
    gap: Spacing.xl,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    color: Colors.textPrimary,
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    letterSpacing: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.secondary,
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
