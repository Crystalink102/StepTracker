import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

export default function AboutScreen() {
  const { colors } = useTheme();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber = Constants.expoConfig?.android?.versionCode ?? 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.logoSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.appName, { color: colors.textPrimary }]}>5tepTracker</Text>
        <Text style={[styles.version, { color: colors.textMuted }]}>
          Version {version} (Build {buildNumber})
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          5tepTracker is an XP-based fitness app that turns your daily steps, runs, and walks
          into an engaging progression system. Track your activity, compete with friends,
          unlock achievements, and level up your fitness journey.
        </Text>
      </View>

      <View style={styles.linksSection}>
        <TouchableOpacity
          style={[styles.linkItem, { backgroundColor: colors.surface }]}
          onPress={() => Linking.openURL('https://steptracker.app/privacy').catch(() => {})}
          accessibilityRole="link"
          accessibilityLabel="Privacy Policy"
        >
          <Text style={[styles.linkText, { color: colors.textPrimary }]}>Privacy Policy</Text>
          <Text style={[styles.arrow, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkItem, { backgroundColor: colors.surface }]}
          onPress={() => Linking.openURL('https://steptracker.app/terms').catch(() => {})}
          accessibilityRole="link"
          accessibilityLabel="Terms of Service"
        >
          <Text style={[styles.linkText, { color: colors.textPrimary }]}>Terms of Service</Text>
          <Text style={[styles.arrow, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.copyright, { color: colors.textMuted }]}>
        © {new Date().getFullYear()} 5tepTracker. All rights reserved.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xxl,
  },
  logoSection: {
    alignItems: 'center',
    padding: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  version: {
    fontSize: FontSize.sm,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  description: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  linksSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  linkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  linkText: {
    fontSize: FontSize.lg,
  },
  arrow: {
    fontSize: FontSize.xxl,
  },
  copyright: {
    textAlign: 'center',
    fontSize: FontSize.xs,
  },
});
