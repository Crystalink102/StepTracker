import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

const FEATURES = [
  {
    icon: 'footsteps' as const,
    color: '#A855F7',
    bg: 'rgba(168, 85, 247, 0.15)',
    title: 'Steps & Distance',
    desc: 'Auto step counting with distance tracking all day long',
  },
  {
    icon: 'star' as const,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.15)',
    title: 'XP & Leveling',
    desc: 'Earn XP for every step and level up your fitness rank',
  },
  {
    icon: 'people' as const,
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.15)',
    title: 'Challenges & Friends',
    desc: 'Compete with friends and crush challenges together',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.iconContainer}>
            <Ionicons name="footsteps" size={80} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>5tepTracker</Text>
          <Text style={styles.tagline}>
            Track your steps. Crush your goals.{'\n'}Level up.
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={[styles.iconBg, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon} size={24} color={f.color} />
              </View>
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
            onPress={() => router.push('/(onboarding)/setup-profile')}
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
    paddingTop: Spacing.xxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  appName: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  tagline: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    gap: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
