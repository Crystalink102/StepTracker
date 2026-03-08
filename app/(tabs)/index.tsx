import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import XPCard from '@/src/components/home/XPCard';
import StepGoalRing from '@/src/components/home/StepGoalRing';
import StepCounter from '@/src/components/home/StepCounter';
import StreakCard from '@/src/components/home/StreakCard';
import StreakPopup from '@/src/components/home/StreakPopup';
import { OfflineBanner } from '@/src/components/ui';
import { useStreak } from '@/src/hooks/useStreak';
import { useNetwork } from '@/src/context/NetworkContext';
import { Colors, Spacing } from '@/src/constants/theme';

export default function HomeScreen() {
  const { streak, showPopup, dismissPopup } = useStreak();
  const { isOnline } = useNetwork();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {!isOnline && <OfflineBanner />}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <XPCard />
        <StepGoalRing />
        <StepCounter />
        <StreakCard streak={streak} />
      </ScrollView>
      <StreakPopup visible={showPopup} streak={streak} onDismiss={dismissPopup} />
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
  },
  content: {
    paddingBottom: Spacing.xxxl,
  },
});
