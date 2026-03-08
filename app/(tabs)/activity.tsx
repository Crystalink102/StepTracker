import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useActivity } from '@/src/context/ActivityContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import { useXP } from '@/src/hooks/useXP';
import { useAuth } from '@/src/context/AuthContext';
import ActiveRunCard from '@/src/components/activity/ActiveRunCard';
import LiveRouteMap from '@/src/components/activity/LiveRouteMap';
import RunControls from '@/src/components/activity/RunControls';
import HeartRateInput from '@/src/components/activity/HeartRateInput';
import { ConfirmModal } from '@/src/components/ui';
import * as ProfileService from '@/src/services/profile.service';
import { Colors, Spacing } from '@/src/constants/theme';

export default function ActivityScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { level } = useXP();
  const { preferences } = usePreferences();
  const {
    currentActivity,
    isActive,
    isPaused,
    elapsedSeconds,
    distanceMeters,
    currentPaceSecPerKm,
    currentSpeed,
    waypoints,
    startActivity,
    pauseActivity,
    resumeActivity,
    stopActivity,
  } = useActivity();

  // Keep screen on during active runs (native only — expo-keep-awake crashes on web)
  useEffect(() => {
    if (!isActive || !preferences.keepScreenOn || Platform.OS === 'web') return;
    let cleanup = () => {};
    import('expo-keep-awake')
      .then(({ activateKeepAwakeAsync, deactivateKeepAwake }) => {
        activateKeepAwakeAsync('activity').catch(() => {});
        cleanup = () => deactivateKeepAwake('activity');
      })
      .catch(() => {});
    return () => cleanup();
  }, [isActive, preferences.keepScreenOn]);

  const [heartRate, setHeartRate] = useState<number | undefined>(undefined);
  const [hrSource, setHrSource] = useState<'manual' | 'auto'>('manual');
  const [restingHR, setRestingHR] = useState(70);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
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
        // Navigate to run detail to show the route map
        router.push(`/run/${result.id}` as any);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      setShowErrorModal(true);
    }
  }, [stopActivity, heartRate, hrSource, router]);

  const handleHeartRateChange = useCallback(
    (hr: number | undefined, source: 'manual' | 'auto') => {
      setHeartRate(hr);
      setHrSource(source);
    },
    []
  );

  // Map coordinates for the live view
  const mapCoords = waypoints.map((wp) => ({
    latitude: wp.latitude,
    longitude: wp.longitude,
  }));

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

        {/* Live route map during active run */}
        {isActive && mapCoords.length > 0 && (
          <LiveRouteMap waypoints={mapCoords} isActive={isActive} />
        )}

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
});
