import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { openHealthConnectSettings } from '@/src/services/health.service';

export default function HealthConnectBanner() {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (Platform.OS !== 'android' || dismissed) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: Colors.primary }]}>
      <View style={styles.content}>
        <Ionicons name="fitness" size={20} color={Colors.primary} />
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Enable Step Tracking</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Grant Health Connect permissions for accurate step counting
          </Text>
        </View>
        <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={8}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={openHealthConnectSettings}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Open Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
    lineHeight: 18,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
