import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

const LAST_UPDATED = 'March 10, 2026';

export default function PrivacyPolicyScreen() {
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
        title="Information We Collect"
        body={`5tepTracker collects the following information to provide our fitness tracking service:

• Account information: Email address or phone number, display name, and profile photo.
• Health & fitness data: Step counts, walking/running distance, duration, pace, heart rate (if provided), and GPS route data during tracked activities.
• Device information: Device type, operating system version, and push notification tokens.
• Usage data: App interactions, feature usage patterns, and crash reports to improve the app.`}
      />

      <Section
        title="How We Use Your Information"
        body={`We use your information to:

• Provide and maintain the fitness tracking service.
• Calculate XP, levels, achievements, and streaks.
• Enable social features like friends, leaderboards, and challenges.
• Send push notifications for achievements, streaks, and activity reminders (when enabled).
• Improve app performance and fix bugs.

We do not sell your personal data to third parties.`}
      />

      <Section
        title="Data Storage & Security"
        body={`Your data is stored securely using Supabase, which provides enterprise-grade security with row-level security policies, encrypted connections (TLS), and encrypted data at rest.

Health and fitness data is processed on-device where possible and synced to our servers only when necessary for features like leaderboards and cross-device sync.`}
      />

      <Section
        title="Data Sharing"
        body={`We share your data only in these circumstances:

• With other users: Your profile name, avatar, level, and activity summaries are visible to friends. Leaderboard rankings are visible to all users.
• With service providers: We use Supabase for data storage and Expo for push notifications. These providers process data on our behalf under strict agreements.

We do not share your health data with advertisers.`}
      />

      <Section
        title="Your Rights"
        body={`You have the right to:

• Access your data through the app.
• Update or correct your profile information.
• Delete your account and all associated data through Settings > Account > Delete Account.
• Opt out of push notifications through Settings > Notifications.
• Export your activity data through individual activity detail screens.`}
      />

      <Section
        title="Data Retention"
        body="We retain your data for as long as your account is active. When you delete your account, all personal data, activity history, and health data is permanently removed from our servers within 30 days."
      />

      <Section
        title="Children's Privacy"
        body="5tepTracker is not intended for children under 13. We do not knowingly collect data from children under 13. If you believe a child has provided us with personal information, please contact us."
      />

      <Section
        title="Changes to This Policy"
        body="We may update this privacy policy from time to time. We will notify you of significant changes through the app or via email."
      />

      <Section
        title="Contact Us"
        body="If you have questions about this privacy policy or your data, contact us at privacy@steptracker.app."
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
