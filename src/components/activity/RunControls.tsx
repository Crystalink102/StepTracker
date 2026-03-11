import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type RunControlsProps = {
  isActive: boolean;
  isPaused: boolean;
  isStarting?: boolean;
  onStart: (type: 'run' | 'walk') => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

export default function RunControls({
  isActive,
  isPaused,
  isStarting,
  onStart,
  onPause,
  onResume,
  onStop,
}: RunControlsProps) {
  const { colors } = useTheme();

  if (!isActive) {
    return (
      <View style={styles.startContainer}>
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: Colors.primary }, isStarting && styles.buttonDisabled]}
          onPress={() => onStart('run')}
          disabled={isStarting}
          accessibilityRole="button"
          accessibilityLabel="Start a run"
        >
          {isStarting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.startText}>Start Run</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: Colors.secondary }, isStarting && styles.buttonDisabled]}
          onPress={() => onStart('walk')}
          disabled={isStarting}
          accessibilityRole="button"
          accessibilityLabel="Start a walk"
        >
          {isStarting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.startText}>Start Walk</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.activeContainer}>
      {isPaused ? (
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: Colors.secondary }]}
          onPress={onResume}
          accessibilityRole="button"
          accessibilityLabel="Resume activity"
        >
          <Text style={styles.controlText}>Resume</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: Colors.accent }]}
          onPress={onPause}
          accessibilityRole="button"
          accessibilityLabel="Pause activity"
        >
          <Text style={styles.controlText}>Pause</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.controlButton, { backgroundColor: colors.danger }]}
        onPress={onStop}
        accessibilityRole="button"
        accessibilityLabel="Stop activity"
      >
        <Text style={styles.controlText}>Stop</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  startContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  startButton: {
    flex: 1,
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  startText: {
    color: Colors.white,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  activeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  controlButton: {
    flex: 1,
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  controlText: {
    color: Colors.white,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
});
