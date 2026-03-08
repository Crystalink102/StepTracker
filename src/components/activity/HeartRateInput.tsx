import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Badge } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { isAutoHRUnlocked, estimateHRFromPace } from '@/src/utils/xp-calculator';

type HeartRateInputProps = {
  level: number;
  currentSpeed: number;
  restingHR: number;
  onHeartRateChange: (hr: number | undefined, source: 'manual' | 'auto') => void;
};

export default function HeartRateInput({
  level,
  currentSpeed,
  restingHR,
  onHeartRateChange,
}: HeartRateInputProps) {
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [manualHR, setManualHR] = useState('');
  const autoUnlocked = isAutoHRUnlocked(level);
  const estimatedHR = autoUnlocked
    ? estimateHRFromPace(currentSpeed, restingHR)
    : 0;

  const handleManualChange = (text: string) => {
    setManualHR(text);
    const hr = parseInt(text, 10);
    const isValid = !isNaN(hr) && hr >= 30 && hr <= 220;
    onHeartRateChange(isValid ? hr : undefined, 'manual');
  };

  const toggleMode = () => {
    if (!autoUnlocked) return;
    const newMode = mode === 'manual' ? 'auto' : 'manual';
    setMode(newMode);
    if (newMode === 'auto') {
      onHeartRateChange(estimatedHR, 'auto');
    } else {
      const hr = parseInt(manualHR, 10);
      onHeartRateChange(isNaN(hr) ? undefined : hr, 'manual');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>HEART RATE</Text>
        {autoUnlocked ? (
          <TouchableOpacity onPress={toggleMode}>
            <Badge
              label={mode === 'auto' ? 'Auto' : 'Manual'}
              variant={mode === 'auto' ? 'secondary' : 'muted'}
            />
          </TouchableOpacity>
        ) : (
          <Badge label={`Unlock at Lvl 3`} variant="muted" />
        )}
      </View>

      {mode === 'manual' ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={manualHR}
            onChangeText={handleManualChange}
            placeholder="Enter BPM"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.unit}>BPM</Text>
        </View>
      ) : (
        <View style={styles.autoDisplay}>
          <Text style={styles.autoHR}>{estimatedHR}</Text>
          <Text style={styles.unit}>BPM (estimated)</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  label: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    flex: 1,
    textAlign: 'center',
  },
  unit: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  autoDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.md,
  },
  autoHR: {
    color: Colors.secondary,
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
  },
});
