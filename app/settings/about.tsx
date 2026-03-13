import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

const LAST_UPDATED = 'March 10, 2026';

const PRIVACY_SECTIONS = [
  {
    title: 'Information We Collect',
    body: `5tepTracker collects the following information to provide our fitness tracking service:\n\n\u2022 Account information: Email address or phone number, display name, and profile photo.\n\u2022 Health & fitness data: Step counts, walking/running distance, duration, pace, heart rate (if provided), and GPS route data during tracked activities.\n\u2022 Device information: Device type, operating system version, and push notification tokens.\n\u2022 Usage data: App interactions, feature usage patterns, and crash reports to improve the app.`,
  },
  {
    title: 'How We Use Your Information',
    body: `We use your information to:\n\n\u2022 Provide and maintain the fitness tracking service.\n\u2022 Calculate XP, levels, achievements, and streaks.\n\u2022 Enable social features like friends, leaderboards, and challenges.\n\u2022 Send push notifications for achievements, streaks, and activity reminders (when enabled).\n\u2022 Improve app performance and fix bugs.\n\nWe do not sell your personal data to third parties.`,
  },
  {
    title: 'Data Storage & Security',
    body: 'Your data is stored securely using Supabase, which provides enterprise-grade security with row-level security policies, encrypted connections (TLS), and encrypted data at rest. Health and fitness data is processed on-device where possible and synced to our servers only when necessary.',
  },
  {
    title: 'Data Sharing',
    body: `We share your data only in these circumstances:\n\n\u2022 With other users: Your profile name, avatar, level, and activity summaries are visible to friends. Leaderboard rankings are visible to all users.\n\u2022 With service providers: We use Supabase for data storage and Expo for push notifications.\n\nWe do not share your health data with advertisers.`,
  },
  {
    title: 'Your Rights',
    body: `You have the right to:\n\n\u2022 Access your data through the app.\n\u2022 Update or correct your profile information.\n\u2022 Delete your account and all associated data through Settings > Account > Delete Account.\n\u2022 Opt out of push notifications through Settings > Notifications.\n\u2022 Export your activity data through individual activity detail screens.`,
  },
  {
    title: 'Data Retention & Children',
    body: 'We retain your data for as long as your account is active. When you delete your account, all personal data is permanently removed within 30 days. 5tepTracker is not intended for children under 13.',
  },
];

const TERMS_SECTIONS = [
  {
    title: 'Acceptance & Service',
    body: `By using 5tepTracker, you agree to these terms. 5tepTracker is a fitness tracking app that:\n\n\u2022 Tracks your daily steps, walks, and runs.\n\u2022 Awards experience points (XP) for physical activity.\n\u2022 Provides a leveling and achievement system.\n\u2022 Enables social features including friends, leaderboards, and challenges.\n\nThe service is provided "as is" and may be updated or modified at any time.`,
  },
  {
    title: 'User Accounts & Acceptable Use',
    body: `You agree to provide accurate registration information, maintain account security, and accept responsibility for all activity under your account.\n\nYou agree not to:\n\u2022 Use the app to harass or harm other users.\n\u2022 Attempt to manipulate step counts, XP, or leaderboard rankings.\n\u2022 Use automated systems or bots to interact with the service.`,
  },
  {
    title: 'Health Disclaimer',
    body: `5tepTracker is a fitness tracking tool, not a medical device. Step counts and calorie estimates are approximations. Always consult a healthcare professional before starting a new exercise program. If you experience health issues while exercising, stop immediately and seek medical attention.`,
  },
  {
    title: 'Liability & IP',
    body: '5tepTracker and all its content are protected by copyright and intellectual property laws. To the maximum extent permitted by law, 5tepTracker shall not be liable for any indirect, incidental, or consequential damages, loss of data, or inaccuracies in fitness calculations.',
  },
];

function CollapsibleSection({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: any;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setExpanded(!expanded)}
      style={[styles.collapsible, { backgroundColor: colors.surface }]}
    >
      <View style={styles.collapsibleHeader}>
        <Text style={[styles.collapsibleTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </View>
      {expanded && <View style={styles.collapsibleBody}>{children}</View>}
    </TouchableOpacity>
  );
}

export default function AboutScreen() {
  const { colors } = useTheme();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber = Constants.expoConfig?.android?.versionCode ?? 1;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
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

      {/* Privacy Policy */}
      <CollapsibleSection title="Privacy Policy" colors={colors}>
        <Text style={[styles.updated, { color: colors.textMuted }]}>Last updated: {LAST_UPDATED}</Text>
        {PRIVACY_SECTIONS.map((s) => (
          <View key={s.title} style={styles.legalSection}>
            <Text style={[styles.legalTitle, { color: colors.textPrimary }]}>{s.title}</Text>
            <Text style={[styles.legalBody, { color: colors.textSecondary }]}>{s.body}</Text>
          </View>
        ))}
        <Text style={[styles.legalBody, { color: colors.textMuted }]}>
          Contact: support@5teptracker.com
        </Text>
      </CollapsibleSection>

      {/* Terms of Service */}
      <CollapsibleSection title="Terms of Service" colors={colors}>
        <Text style={[styles.updated, { color: colors.textMuted }]}>Last updated: {LAST_UPDATED}</Text>
        {TERMS_SECTIONS.map((s) => (
          <View key={s.title} style={styles.legalSection}>
            <Text style={[styles.legalTitle, { color: colors.textPrimary }]}>{s.title}</Text>
            <Text style={[styles.legalBody, { color: colors.textSecondary }]}>{s.body}</Text>
          </View>
        ))}
        <Text style={[styles.legalBody, { color: colors.textMuted }]}>
          Contact: support@5teptracker.com
        </Text>
      </CollapsibleSection>

      <Text style={[styles.copyright, { color: colors.textMuted }]}>
        {'\u00A9'} {new Date().getFullYear()} 5tepTracker. All rights reserved.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.xxl,
    paddingBottom: Spacing.xxxl * 2,
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
  collapsible: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collapsibleTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  collapsibleBody: {
    marginTop: Spacing.lg,
  },
  updated: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  legalSection: {
    marginBottom: Spacing.lg,
  },
  legalTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  legalBody: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  copyright: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    marginTop: Spacing.md,
  },
});
