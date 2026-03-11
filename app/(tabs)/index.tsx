export { ErrorBoundary } from '@/src/components/ui/TabErrorBoundary';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
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
import { useProfile } from '@/src/hooks/useProfile';
import { playLevelUp } from '@/src/utils/sounds';
import { Colors, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { streak, showPopup, dismissPopup, freezeUsed, freezeAvailable, freezeEnabled } = useStreak();
  const { pendingPopup, dismissPopup: dismissAchievement, refresh: refreshAchievements } = useAchievements();
  const { isOnline } = useNetwork();
  const { level, isLoading: xpLoading, refresh: refreshXP } = useXP();
  const { preferences } = usePreferences();
  const { profile, refresh: refreshProfile } = useProfile();
  const { showConfetti, celebrate, onConfettiComplete } = useCelebration();
  const prevLevelRef = useRef(level);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshXP(),
        refreshProfile(),
        refreshAchievements(),
      ]);
    } catch {
      // Swallow errors — individual hooks handle their own
    } finally {
      setRefreshing(false);
    }
  }, [refreshXP, refreshProfile, refreshAchievements]);

  // Celebrate level-ups
  useEffect(() => {
    if (level > prevLevelRef.current && prevLevelRef.current > 0) {
      celebrate();
      playLevelUp(preferences.hapticFeedback);
    }
    prevLevelRef.current = level;
  }, [level, celebrate, preferences.hapticFeedback]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
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
