export { ErrorBoundary } from '@/src/components/ui/TabErrorBoundary';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useActivity } from '@/src/context/ActivityContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import { useXP } from '@/src/hooks/useXP';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/hooks/useToast';
import { playButtonPress } from '@/src/utils/sounds';
import { useIntervalTimer, IntervalConfig, DEFAULT_INTERVAL_CONFIG } from '@/src/hooks/useIntervalTimer';
import ActiveRunCard from '@/src/components/activity/ActiveRunCard';
import LiveRouteMap from '@/src/components/activity/LiveRouteMap';
import RunControls from '@/src/components/activity/RunControls';
import HeartRateInput from '@/src/components/activity/HeartRateInput';
import IntervalSetup from '@/src/components/activity/IntervalSetup';
import IntervalDisplay from '@/src/components/activity/IntervalDisplay';
import { ConfirmModal } from '@/src/components/ui';
import * as ProfileService from '@/src/services/profile.service';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type RunMode = 'free' | 'interval';

export default function ActivityScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { level } = useXP();
  const { preferences } = usePreferences();
  const { showToast } = useToast();
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
  const [isStarting, setIsStarting] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Interval mode state
  const [runMode, setRunMode] = useState<RunMode>('free');
  const [showIntervalSetup, setShowIntervalSetup] = useState(false);
  const [intervalConfig, setIntervalConfig] = useState<IntervalConfig>({ ...DEFAULT_INTERVAL_CONFIG });
  const [intervalActive, setIntervalActive] = useState(false);

  // Interval timer hook
  const intervalTimer = useIntervalTimer(
    intervalConfig,
    intervalActive && isActive,
    isPaused,
    preferences.hapticFeedback,
  );

  // Load resting HR from profile
  useEffect(() => {
    if (!user) return;
    ProfileService.getProfile(user.id)
      .then((p) => { if (p.resting_hr != null) setRestingHR(p.resting_hr); })
      .catch(() => {});
  }, [user]);

  // Reset interval state when activity stops
  useEffect(() => {
    if (!isActive) {
      setIntervalActive(false);
    }
  }, [isActive]);

  const handleStart = useCallback(
    async (type: 'run' | 'walk') => {
      if (isStarting) return;
      playButtonPress(preferences.hapticFeedback);
      setIsStarting(true);
      try {
        await startActivity(type);
        showToast('Activity started', 'success');
      } catch (err: any) {
        showToast(err.message || 'Could not start activity', 'error');
        setErrorMessage(err.message || 'Could not start activity. Check location permissions.');
        setShowErrorModal(true);
      } finally {
        setIsStarting(false);
      }
    },
    [startActivity, isStarting, preferences.hapticFeedback, showToast]
  );

  const handleIntervalStart = useCallback(
    async (config: IntervalConfig) => {
      if (isStarting) return;
      playButtonPress(preferences.hapticFeedback);
      setIntervalConfig(config);
      setShowIntervalSetup(false);
      setIsStarting(true);
      try {
        await startActivity('run');
        setIntervalActive(true);
        showToast('Interval started', 'success');
      } catch (err: any) {
        showToast(err.message || 'Could not start activity', 'error');
        setErrorMessage(err.message || 'Could not start activity. Check location permissions.');
        setShowErrorModal(true);
      } finally {
        setIsStarting(false);
      }
    },
    [startActivity, isStarting, preferences.hapticFeedback, showToast]
  );

  const handleStop = useCallback(() => {
    playButtonPress(preferences.hapticFeedback);
    setShowStopConfirm(true);
  }, [preferences.hapticFeedback]);

  const confirmStop = useCallback(async () => {
    setShowStopConfirm(false);
    try {
      const result = await stopActivity(heartRate, hrSource);
      setIntervalActive(false);
      showToast('Activity saved', 'success');
      if (result) {
        // Navigate to post-run save screen (Strava-style) to name & configure
        router.push(`/run/save?id=${result.id}` as any);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save activity', 'error');
      setErrorMessage(err.message);
      setShowErrorModal(true);
    }
  }, [stopActivity, heartRate, hrSource, router, showToast]);

  const handlePause = useCallback(async () => {
    playButtonPress(preferences.hapticFeedback);
    await pauseActivity();
  }, [pauseActivity, preferences.hapticFeedback]);

  const handleResume = useCallback(async () => {
    playButtonPress(preferences.hapticFeedback);
    await resumeActivity();
  }, [resumeActivity, preferences.hapticFeedback]);

  const handleHeartRateChange = useCallback(
    (hr: number | undefined, source: 'manual' | 'auto') => {
      setHeartRate(hr);
      setHrSource(source);
    },
    []
  );

  // Map coordinates for the live view
  const mapCoords = useMemo(
    () => waypoints.map((wp) => ({ latitude: wp.latitude, longitude: wp.longitude })),
    [waypoints]
  );

  // Mode toggle handler -- only when not active
  const handleModeToggle = useCallback((mode: RunMode) => {
    setRunMode(mode);
    setShowIntervalSetup(mode === 'interval');
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode toggle -- only visible before starting */}
        {!isActive && (
          <View style={styles.modeToggleContainer}>
            <View style={[styles.modeToggle, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  runMode === 'free' && styles.modeButtonActive,
                ]}
                onPress={() => handleModeToggle('free')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    { color: colors.textMuted },
                    runMode === 'free' && styles.modeButtonTextActive,
                  ]}
                >
                  Free Run
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  runMode === 'interval' && styles.modeButtonActive,
                ]}
                onPress={() => handleModeToggle('interval')}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    { color: colors.textMuted },
                    runMode === 'interval' && styles.modeButtonTextActive,
                  ]}
                >
                  Interval
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Interval setup card -- shown before starting in interval mode */}
        {!isActive && showIntervalSetup && (
          <IntervalSetup
            onStart={handleIntervalStart}
            onCancel={() => handleModeToggle('free')}
            isStarting={isStarting}
          />
        )}

        {/* Active run card -- always visible */}
        <ActiveRunCard
          type={currentActivity?.type ?? 'run'}
          elapsedSeconds={elapsedSeconds}
          distanceMeters={distanceMeters}
          currentPaceSecPerKm={currentPaceSecPerKm}
          currentSpeed={currentSpeed}
          isPaused={isPaused}
        />

        {/* Interval display -- during active interval run */}
        {isActive && intervalActive && (
          <IntervalDisplay
            currentPhase={intervalTimer.currentPhase}
            phaseTimeRemaining={intervalTimer.phaseTimeRemaining}
            currentInterval={intervalTimer.currentInterval}
            totalIntervals={intervalTimer.totalIntervals}
            totalElapsed={intervalTimer.totalElapsed}
            totalDuration={intervalTimer.totalDuration}
            isComplete={intervalTimer.isComplete}
            isRunning={intervalTimer.isRunning}
          />
        )}

        {/* Live route map during active run */}
        {isActive && mapCoords.length > 0 && (
          <LiveRouteMap
            waypoints={mapCoords}
            isActive={isActive}
            distanceMeters={distanceMeters}
            currentPaceSecPerKm={currentPaceSecPerKm}
          />
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

      {/* Show normal RunControls for free mode or during active runs */}
      {(runMode === 'free' || isActive) && (
        <RunControls
          isActive={isActive}
          isPaused={isPaused}
          isStarting={isStarting}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
        />
      )}

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
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxxl,
  },
  modeToggleContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
  },
  modeButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  modeButtonTextActive: {
    color: Colors.white,
  },
});
