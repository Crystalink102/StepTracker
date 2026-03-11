import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

const LAST_UPDATED = 'March 10, 2026';

export default function TermsScreen() {
  const { colors } = useTheme();

  const Section = ({ title, body }: { title: string; body: string }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{body}</Text>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.updated, { color: colors.textMuted }]}>Last updated: {LAST_UPDATED}</Text>

      <Section
        title="Acceptance of Terms"
        body="By downloading, installing, or using 5tepTracker, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the app."
      />

      <Section
        title="Description of Service"
        body={`5tepTracker is a fitness tracking application that:

• Tracks your daily steps, walks, and runs.
• Awards experience points (XP) for physical activity.
• Provides a leveling and achievement system.
• Enables social features including friends, leaderboards, and challenges.

The service is provided "as is" and may be updated, modified, or discontinued at any time.`}
      />

      <Section
        title="User Accounts"
        body={`To use 5tepTracker, you must create an account. You agree to:

• Provide accurate and complete registration information.
• Maintain the security of your account credentials.
• Notify us immediately of any unauthorized access.
• Accept responsibility for all activity under your account.

We reserve the right to suspend or terminate accounts that violate these terms.`}
      />

      <Section
        title="Acceptable Use"
        body={`You agree not to:

• Use the app to harass, abuse, or harm other users.
• Attempt to manipulate step counts, XP, or leaderboard rankings.
• Reverse engineer, decompile, or attempt to extract source code.
• Use automated systems or bots to interact with the service.
• Upload offensive, inappropriate, or illegal content as profile images or in communications.`}
      />

      <Section
        title="Health Disclaimer"
        body={`5tepTracker is a fitness tracking tool, not a medical device. It is not intended to diagnose, treat, cure, or prevent any disease.

• Step counts and calorie estimates are approximations and may not be perfectly accurate.
• Heart rate data, if used, is for informational purposes only.
• Always consult a healthcare professional before starting a new exercise program.
• If you experience any health issues while exercising, stop immediately and seek medical attention.`}
      />

      <Section
        title="Intellectual Property"
        body="5tepTracker and all its content, features, and functionality are owned by 5tepTracker and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written permission."
      />

      <Section
        title="Limitation of Liability"
        body={`To the maximum extent permitted by law, 5tepTracker shall not be liable for:

• Any indirect, incidental, special, or consequential damages.
• Loss of data, profits, or business opportunities.
• Inaccuracies in step counts, distance, or calorie calculations.
• Service interruptions or downtime.
• Actions of other users on the platform.`}
      />

      <Section
        title="Changes to Terms"
        body="We reserve the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms. We will notify users of significant changes through the app."
      />

      <Section
        title="Contact"
        body="For questions about these terms, contact us at support@steptracker.app."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
  },
  updated: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  sectionBody: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
});
