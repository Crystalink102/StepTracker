import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type RunControlsProps = {
  isActive: boolean;
  isPaused: boolean;
  onStart: (type: 'run' | 'walk') => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

export default function RunControls({
  isActive,
  isPaused,
  onStart,
  onPause,
  onResume,
  onStop,
}: RunControlsProps) {
  if (!isActive) {
    return (
      <View style={styles.startContainer}>
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: Colors.primary }]}
          onPress={() => onStart('run')}
          accessibilityRole="button"
          accessibilityLabel="Start a run"
        >
          <Text style={styles.startText}>Start Run</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: Colors.secondary }]}
          onPress={() => onStart('walk')}
          accessibilityRole="button"
          accessibilityLabel="Start a walk"
        >
          <Text style={styles.startText}>Start Walk</Text>
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
        style={[styles.controlButton, { backgroundColor: Colors.danger }]}
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
