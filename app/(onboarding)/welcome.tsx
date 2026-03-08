import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

const FEATURES = [
  { icon: '👟', title: 'Track Steps', desc: 'Auto step counting with XP rewards' },
  { icon: '🏃', title: 'Log Activities', desc: 'GPS-tracked runs and walks' },
  { icon: '🏆', title: 'Earn Achievements', desc: 'Level up and unlock badges' },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.appName}>StepTracker</Text>
          <Text style={styles.tagline}>Your fitness journey, gamified</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottom}>
          <Button
            title="Get Started"
            onPress={() => router.push('/(onboarding)/body-metrics')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: Spacing.xxxl,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
  },
  appName: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
  },
  features: {
    gap: Spacing.xxl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  featureDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  bottom: {
    paddingBottom: Spacing.lg,
  },
});
