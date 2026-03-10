import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Card } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import {
  IntervalConfig,
  DEFAULT_INTERVAL_CONFIG,
  getTotalDuration,
  formatTotalTime,
} from '@/src/hooks/useIntervalTimer';

type IntervalSetupProps = {
  onStart: (config: IntervalConfig) => void;
  onCancel: () => void;
  isStarting?: boolean;
};

export default function IntervalSetup({ onStart, onCancel, isStarting }: IntervalSetupProps) {
  const [config, setConfig] = useState<IntervalConfig>({ ...DEFAULT_INTERVAL_CONFIG });

  const update = <K extends keyof IntervalConfig>(key: K, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    setConfig((prev) => ({ ...prev, [key]: num }));
  };

  const totalDuration = getTotalDuration(config);
  const isValid = config.runDuration > 0 && config.intervals > 0 && config.intervals <= 50;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>INTERVAL SETUP</Text>
        <TouchableOpacity onPress={onCancel} hitSlop={12}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Run Duration */}
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <View style={[styles.phaseDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.label}>Run Duration</Text>
          </View>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => update('runDuration', String(Math.max(5, config.runDuration - 5)))}
            >
              <Text style={styles.stepText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.numberInput}
              value={String(config.runDuration)}
              onChangeText={(v) => update('runDuration', v)}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => update('runDuration', String(config.runDuration + 5))}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.unitText}>sec</Text>
          </View>
        </View>

        {/* Rest Duration */}
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <View style={[styles.phaseDot, { backgroundColor: '#FACC15' }]} />
            <Text style={styles.label}>Rest Duration</Text>
          </View>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => update('restDuration', String(Math.max(0, config.restDuration - 5)))}
            >
              <Text style={styles.stepText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.numberInput}
              value={String(config.restDuration)}
              onChangeText={(v) => update('restDuration', v)}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => update('restDuration', String(config.restDuration + 5))}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.unitText}>sec</Text>
          </View>
        </View>

        {/* Number of Intervals */}
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <View style={[styles.phaseDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.label}>Intervals</Text>
          </View>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => update('intervals', String(Math.max(1, config.intervals - 1)))}
            >
              <Text style={styles.stepText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.numberInput}
              value={String(config.intervals)}
              onChangeText={(v) => update('intervals', v)}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => update('intervals', String(Math.min(50, config.intervals + 1)))}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.unitText}>x</Text>
          </View>
        </View>

        {/* Warm-up */}
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <View style={[styles.phaseDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.label}>Warm-up</Text>
          </View>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => update('warmupDuration', String(Math.max(0, config.warmupDuration - 15)))}
            >
              <Text style={styles.stepText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.numberInput}
              value={String(config.warmupDuration)}
              onChangeText={(v) => update('warmupDuration', v)}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => update('warmupDuration', String(config.warmupDuration + 15))}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.unitText}>sec</Text>
          </View>
        </View>

        {/* Cool-down */}
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <View style={[styles.phaseDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.label}>Cool-down</Text>
          </View>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => update('cooldownDuration', String(Math.max(0, config.cooldownDuration - 15)))}
            >
              <Text style={styles.stepText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.numberInput}
              value={String(config.cooldownDuration)}
              onChangeText={(v) => update('cooldownDuration', v)}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => update('cooldownDuration', String(config.cooldownDuration + 15))}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.unitText}>sec</Text>
          </View>
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>WORKOUT PREVIEW</Text>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Total Time</Text>
            <Text style={styles.previewValue}>{formatTotalTime(totalDuration)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Structure</Text>
            <Text style={styles.previewValue}>
              {config.warmupDuration > 0 ? `${formatTotalTime(config.warmupDuration)} warmup → ` : ''}
              {config.intervals}x ({formatTotalTime(config.runDuration)} run
              {config.restDuration > 0 ? ` / ${formatTotalTime(config.restDuration)} rest` : ''})
              {config.cooldownDuration > 0 ? ` → ${formatTotalTime(config.cooldownDuration)} cooldown` : ''}
            </Text>
          </View>

          {/* Visual timeline */}
          <View style={styles.timeline}>
            {config.warmupDuration > 0 && (
              <View
                style={[
                  styles.timelineBlock,
                  { flex: config.warmupDuration / totalDuration, backgroundColor: '#3B82F6' },
                ]}
              />
            )}
            {Array.from({ length: config.intervals }).map((_, i) => (
              <View key={i} style={{ flexDirection: 'row', flex: (config.runDuration + (i < config.intervals - 1 ? config.restDuration : 0)) / totalDuration }}>
                <View
                  style={[
                    styles.timelineBlock,
                    {
                      flex: config.runDuration,
                      backgroundColor: '#22C55E',
                    },
                  ]}
                />
                {i < config.intervals - 1 && config.restDuration > 0 && (
                  <View
                    style={[
                      styles.timelineBlock,
                      {
                        flex: config.restDuration,
                        backgroundColor: '#FACC15',
                      },
                    ]}
                  />
                )}
              </View>
            ))}
            {config.cooldownDuration > 0 && (
              <View
                style={[
                  styles.timelineBlock,
                  { flex: config.cooldownDuration / totalDuration, backgroundColor: '#3B82F6' },
                ]}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Start button */}
      <TouchableOpacity
        style={[styles.startButton, (!isValid || isStarting) && styles.buttonDisabled]}
        onPress={() => isValid && onStart(config)}
        disabled={!isValid || isStarting}
      >
        {isStarting ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.startText}>Start Interval Run</Text>
        )}
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  row: {
    marginBottom: Spacing.lg,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  numberInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    width: 30,
  },
  previewCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  previewTitle: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  previewLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  previewValue: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.sm,
  },
  timeline: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    gap: 1,
  },
  timelineBlock: {
    borderRadius: 2,
    minWidth: 3,
  },
  startButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  startText: {
    color: Colors.white,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
