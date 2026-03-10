export { ErrorBoundary } from '@/src/components/ui/TabErrorBoundary';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import XPCard from '@/src/components/home/XPCard';
import StepGoalRing from '@/src/components/home/StepGoalRing';
import StepCounter from '@/src/components/home/StepCounter';
import StreakCard from '@/src/components/home/StreakCard';
import TrainingLoadCard from '@/src/components/home/TrainingLoadCard';
import WeeklySummaryCard from '@/src/components/home/WeeklySummaryCard';
import ChallengesHomeCard from '@/src/components/challenges/ChallengesHomeCard';
import StreakPopup from '@/src/components/home/StreakPopup';
import AchievementPopup from '@/src/components/achievements/AchievementPopup';
import NotificationBell from '@/src/components/home/NotificationBell';
import Confetti from '@/src/components/ui/Confetti';
import { OfflineBanner } from '@/src/components/ui';
import OfflineQueueCard from '@/src/components/home/OfflineQueueCard';
import { useStreak } from '@/src/hooks/useStreak';
import { useAchievements } from '@/src/hooks/useAchievements';
import { useXP } from '@/src/hooks/useXP';
import { useCelebration } from '@/src/hooks/useCelebration';
import { useNetwork } from '@/src/context/NetworkContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import { playLevelUp } from '@/src/utils/sounds';
import { Colors, Spacing } from '@/src/constants/theme';

export default function HomeScreen() {
  const { streak, showPopup, dismissPopup, freezeUsed, freezeAvailable, freezeEnabled } = useStreak();
  const { pendingPopup, dismissPopup: dismissAchievement } = useAchievements();
  const { isOnline } = useNetwork();
  const { level } = useXP();
  const { preferences } = usePreferences();
  const { showConfetti, celebrate, onConfettiComplete } = useCelebration();
  const prevLevelRef = useRef(level);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Home screen data comes from contexts which auto-update;
    // brief delay gives visual feedback that a refresh happened
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Celebrate level-ups
  useEffect(() => {
    if (level > prevLevelRef.current && prevLevelRef.current > 0) {
      celebrate();
      playLevelUp(preferences.hapticFeedback);
    }
    prevLevelRef.current = level;
  }, [level, celebrate, preferences.hapticFeedback]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Confetti visible={showConfetti} onComplete={onConfettiComplete} />
      {!isOnline && <OfflineBanner />}
      <OfflineQueueCard />
      <View style={styles.bellContainer}>
        <NotificationBell />
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <XPCard />
        <StepGoalRing />
        <StepCounter />
        <TrainingLoadCard />
        <WeeklySummaryCard />
        <ChallengesHomeCard />
        <StreakCard
          streak={streak}
          freezeAvailable={freezeAvailable}
          freezeEnabled={freezeEnabled}
          freezeUsed={freezeUsed}
        />
      </ScrollView>
      <StreakPopup visible={showPopup} streak={streak} onDismiss={dismissPopup} />
      <AchievementPopup achievement={pendingPopup} onDismiss={dismissAchievement} />
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
  bellContainer: {
    position: 'absolute',
    top: 0,
    right: Spacing.md,
    zIndex: 10,
  },
});
