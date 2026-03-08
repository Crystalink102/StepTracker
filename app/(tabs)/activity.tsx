import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActivity } from '@/src/context/ActivityContext';
import { useXP } from '@/src/hooks/useXP';
import { useAuth } from '@/src/context/AuthContext';
import ActiveRunCard from '@/src/components/activity/ActiveRunCard';
import RunControls from '@/src/components/activity/RunControls';
import HeartRateInput from '@/src/components/activity/HeartRateInput';
import { ConfirmModal } from '@/src/components/ui';
import * as ProfileService from '@/src/services/profile.service';
import { Colors, Spacing } from '@/src/constants/theme';

export default function ActivityScreen() {
  const { user } = useAuth();
  const { level } = useXP();
  const {
    currentActivity,
    isActive,
    isPaused,
    elapsedSeconds,
    distanceMeters,
    currentPaceSecPerKm,
    currentSpeed,
    startActivity,
    pauseActivity,
    resumeActivity,
    stopActivity,
  } = useActivity();

  const [heartRate, setHeartRate] = useState<number | undefined>(undefined);
  const [hrSource, setHrSource] = useState<'manual' | 'auto'>('manual');
  const [restingHR, setRestingHR] = useState(70);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load resting HR from profile
  useEffect(() => {
    if (!user) return;
    ProfileService.getProfile(user.id)
      .then((p) => setRestingHR(p.resting_hr))
      .catch(() => {});
  }, [user]);

  const handleStart = useCallback(
    async (type: 'run' | 'walk') => {
      try {
        await startActivity(type);
      } catch (err: any) {
        setErrorMessage(err.message || 'Could not start activity.');
        setShowErrorModal(true);
      }
    },
    [startActivity]
  );

  const handleStop = useCallback(() => {
    setShowStopConfirm(true);
  }, []);

  const confirmStop = useCallback(async () => {
    setShowStopConfirm(false);
    try {
      const result = await stopActivity(heartRate, hrSource);
      if (result) {
        setResultMessage(
          `${(distanceMeters / 1000).toFixed(2)} km in ${Math.floor(elapsedSeconds / 60)}min • +${result.xp_earned} XP`
        );
        setShowResultModal(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      setShowErrorModal(true);
    }
  }, [stopActivity, heartRate, hrSource, distanceMeters, elapsedSeconds]);

  const handleHeartRateChange = useCallback(
    (hr: number | undefined, source: 'manual' | 'auto') => {
      setHeartRate(hr);
      setHrSource(source);
    },
    []
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ActiveRunCard
          type={currentActivity?.type ?? 'run'}
          elapsedSeconds={elapsedSeconds}
          distanceMeters={distanceMeters}
          currentPaceSecPerKm={currentPaceSecPerKm}
          currentSpeed={currentSpeed}
          isPaused={isPaused}
        />

        {isActive && currentActivity && (
          <HeartRateInput
            level={level}
            currentSpeed={currentSpeed}
            restingHR={restingHR}
            onHeartRateChange={handleHeartRateChange}
          />
        )}
      </ScrollView>

      <RunControls
        isActive={isActive}
        isPaused={isPaused}
        onStart={handleStart}
        onPause={pauseActivity}
        onResume={resumeActivity}
        onStop={handleStop}
      />

      <ConfirmModal
        visible={showStopConfirm}
        title="End Activity"
        message="Are you sure you want to stop?"
        confirmLabel="Stop"
        destructive
        onConfirm={confirmStop}
        onCancel={() => setShowStopConfirm(false)}
      />

      <ConfirmModal
        visible={showResultModal}
        title="Activity Complete!"
        message={resultMessage}
        confirmLabel="Nice!"
        onConfirm={() => setShowResultModal(false)}
        onCancel={() => setShowResultModal(false)}
      />

      <ConfirmModal
        visible={showErrorModal}
        title="Error"
        message={errorMessage}
        confirmLabel="OK"
        onConfirm={() => setShowErrorModal(false)}
        onCancel={() => setShowErrorModal(false)}
      />
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
  placeholder: {
    flex: 1,
  },
});
