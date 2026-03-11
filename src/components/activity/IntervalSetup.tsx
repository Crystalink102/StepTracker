import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import {
  IntervalConfig,
  DEFAULT_INTERVAL_CONFIG,
  getTotalDuration,
  formatTotalTime,
} from '@/src/hooks/useIntervalTimer';
import {
  getTemplates,
  saveTemplate,
  deleteTemplate,
  templateTotalDuration,
  formatTemplateDuration,
  type WorkoutTemplate,
} from '@/src/utils/workout-templates';

type IntervalSetupProps = {
  onStart: (config: IntervalConfig) => void;
  onCancel: () => void;
  isStarting?: boolean;
};

export default function IntervalSetup({ onStart, onCancel, isStarting }: IntervalSetupProps) {
  const { colors } = useTheme();
  const [config, setConfig] = useState<IntervalConfig>({ ...DEFAULT_INTERVAL_CONFIG });
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(true);

  useEffect(() => {
    getTemplates().then(setTemplates).catch(() => {});
  }, []);

  const handleLoadTemplate = useCallback((t: WorkoutTemplate) => {
    setConfig({
      runDuration: t.runDuration,
      restDuration: t.restDuration,
      intervals: t.intervals,
      warmupDuration: t.warmupDuration,
      cooldownDuration: t.cooldownDuration,
    });
    setShowTemplates(false);
  }, []);

  const handleSaveAsTemplate = useCallback(async () => {
    const doSave = async (name: string) => {
      if (!name?.trim()) return;
      const saved = await saveTemplate({
        name: name.trim(),
        ...config,
      });
      setTemplates((prev) => [...prev, saved]);
    };

    if (typeof Alert.prompt === 'function') {
      // iOS has Alert.prompt
      Alert.prompt('Save Workout', 'Give this workout a name:', (name) => {
        doSave(name ?? '').catch(() => {});
      });
    } else {
      // Android fallback: auto-name
      await doSave(`Custom ${config.intervals}x${Math.round(config.runDuration / 60)}min`);
    }
  }, [config]);

  const handleDeleteTemplate = useCallback(async (id: string) => {
    await deleteTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Workout Templates */}
        {showTemplates && templates.length > 0 && (
          <View style={styles.templatesSection}>
            <Text style={[styles.templatesTitle, { color: colors.textMuted }]}>WORKOUT TEMPLATES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatesList}>
              {templates.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.templateCard, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                  onPress={() => handleLoadTemplate(t)}
                  onLongPress={() => !t.isPreset && handleDeleteTemplate(t.id)}
                >
                  <Text style={[styles.templateName, { color: colors.textPrimary }]} numberOfLines={1}>{t.name}</Text>
                  <Text style={[styles.templateDetails, { color: colors.textSecondary }]}>
                    {t.intervals}x {formatTemplateDuration(t.runDuration)}
                  </Text>
                  <Text style={[styles.templateTotal, { color: colors.textMuted }]}>
                    {formatTemplateDuration(templateTotalDuration(t))} total
                  </Text>
                  {t.isPreset && (
                    <View style={styles.presetBadge}>
                      <Text style={styles.presetBadgeText}>Preset</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowTemplates(false)} style={styles.customizeBtn}>
              <Text style={styles.customizeBtnText}>Or customize your own</Text>
            </TouchableOpacity>
          </View>
        )}

        {!showTemplates && (
          <View style={styles.templateActions}>
            <TouchableOpacity onPress={() => setShowTemplates(true)} style={styles.viewTemplatesBtn}>
              <Ionicons name="list-outline" size={16} color={Colors.primary} />
              <Text style={styles.viewTemplatesBtnText}>View Templates</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveAsTemplate} style={styles.saveTemplateBtn}>
              <Ionicons name="bookmark-outline" size={16} color={Colors.primary} />
              <Text style={styles.viewTemplatesBtnText}>Save as Template</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Run Duration */}
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <View style={[styles.phaseDot, { backgroundColor: '#22C55E' }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Run Duration</Text>
          </View>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={[styles.stepButton, { backgroundColor: colors.surfaceLight }]}
              onPress={() => update('runDuration', String(Math.max(5, config.runDuration - 5)))}
            >
              <Text style={[styles.stepText, { color: colors.textPrimary }]}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.numberInput, { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.border }]}
              value={String(config.runDuration)}
              onChangeText={(v) => update('runDuration', v)}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={[styles.stepButton, { backgroundColor: colors.surfaceLight }]}
              onPress={() => update('runDuration', String(config.runDuration + 5))}
            >
              <Text style={[styles.stepText, { color: colors.textPrimary }]}>+</Text>
            </TouchableOpacity>
            <Text style={[styles.unitText, { color: colors.textMuted }]}>sec</Text>
          </View>
        </View>

        {/* Rest Duration */}
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <View style={[styles.phaseDot, { backgroundColor: '#FACC15' }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Rest Duration</Text>
          </View>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={[styles.stepButton, { backgroundColor: colors.surfaceLight }]}
              onPress={() => update('restDuration', String(Math.max(0, config.restDuration - 5)))}
            >
              <Text style={[styles.stepText, { color: colors.textPrimary }]}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.numberInput, { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.border }]}
              value={String(config.restDuration)}
              onChangeText={(v) => update('restDuration', v)}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={[styles.stepButton, { backgroundColor: colors.surfaceLight }]}
              onPress={() => update('restDuration', String(config.restDuration + 5))}
            >
              <Text style={[styles.stepText, { color: colors.textPrimary }]}>+</Text>
            </TouchableOpacity>
            <Text style={[styles.unitText, { color: colors.textMuted }]}>sec</Text>
          </View>
        </View>

        {/* Number of Intervals */}
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <View style={[styles.phaseDot, { backgroundColor: Colors.primary }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Intervals</Text>
          </View>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={[styles.stepButton, { backgroundColor: colors.surfaceLight }]}
              onPress={() => update('intervals', String(Math.max(1, config.intervals - 1)))}
            >
              <Text style={[styles.stepText, { color: colors.textPrimary }]}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.numberInput, { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.border }]}
              value={String(config.intervals)}
              onChangeText={(v) => update('intervals', v)}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={[styles.stepButton, { backgroundColor: colors.surfaceLight }]}
              onPress={() => update('intervals', String(Math.min(50, config.intervals + 1)))}
            >
              <Text style={[styles.stepText, { color: colors.textPrimary }]}>+</Text>
            </TouchableOpacity>
            <Text style={[styles.unitText, { color: colors.textMuted }]}>x</Text>
          </View>
        </View>

        {/* Warm-up */}
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <View style={[styles.phaseDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Warm-up</Text>
          </View>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={[styles.stepButton, { backgroundColor: colors.surfaceLight }]}
              onPress={() => update('warmupDuration', String(Math.max(0, config.warmupDuration - 15)))}
            >
              <Text style={[styles.stepText, { color: colors.textPrimary }]}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.numberInput, { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.border }]}
              value={String(config.warmupDuration)}
              onChangeText={(v) => update('warmupDuration', v)}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={[styles.stepButton, { backgroundColor: colors.surfaceLight }]}
              onPress={() => update('warmupDuration', String(config.warmupDuration + 15))}
            >
              <Text style={[styles.stepText, { color: colors.textPrimary }]}>+</Text>
            </TouchableOpacity>
            <Text style={[styles.unitText, { color: colors.textMuted }]}>sec</Text>
          </View>
        </View>

        {/* Cool-down */}
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <View style={[styles.phaseDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Cool-down</Text>
          </View>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={[styles.stepButton, { backgroundColor: colors.surfaceLight }]}
              onPress={() => update('cooldownDuration', String(Math.max(0, config.cooldownDuration - 15)))}
            >
              <Text style={[styles.stepText, { color: colors.textPrimary }]}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.numberInput, { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.border }]}
              value={String(config.cooldownDuration)}
              onChangeText={(v) => update('cooldownDuration', v)}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={[styles.stepButton, { backgroundColor: colors.surfaceLight }]}
              onPress={() => update('cooldownDuration', String(config.cooldownDuration + 15))}
            >
              <Text style={[styles.stepText, { color: colors.textPrimary }]}>+</Text>
            </TouchableOpacity>
            <Text style={[styles.unitText, { color: colors.textMuted }]}>sec</Text>
          </View>
        </View>

        {/* Preview */}
        <View style={[styles.previewCard, { backgroundColor: colors.surfaceLight }]}>
          <Text style={[styles.previewTitle, { color: colors.textMuted }]}>WORKOUT PREVIEW</Text>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Total Time</Text>
            <Text style={[styles.previewValue, { color: colors.textPrimary }]}>{formatTotalTime(totalDuration)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Structure</Text>
            <Text style={[styles.previewValue, { color: colors.textPrimary }]}>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  numberInput: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
    borderWidth: 1,
  },
  unitText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    width: 30,
  },
  previewCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  previewTitle: {
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
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  previewValue: {
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
  templatesSection: {
    marginBottom: Spacing.lg,
  },
  templatesTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  templatesList: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  templateCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minWidth: 140,
    borderWidth: 1,
  },
  templateName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: 4,
  },
  templateDetails: {
    fontSize: FontSize.sm,
  },
  templateTotal: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  presetBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.primary + '33',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  presetBadgeText: {
    color: Colors.primary,
    fontSize: 8,
    fontWeight: FontWeight.bold,
  },
  customizeBtn: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  customizeBtnText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  templateActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  viewTemplatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewTemplatesBtnText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
