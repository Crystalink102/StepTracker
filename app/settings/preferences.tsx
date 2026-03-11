import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePreferences, type DistanceUnit, type HeightUnit, type WeightUnit, type ThemeMode, type AudioCueFrequency } from '@/src/context/PreferencesContext';
import { resetTutorial } from '@/src/components/tutorial/TutorialOverlay';
import { isFreezeEnabled, setFreezeEnabled } from '@/src/services/streak.service';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

// --- Reusable setting row components ---

function SettingToggle({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]} accessible accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
        {description && <Text style={[styles.rowDescription, { color: colors.textMuted }]}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.surfaceLight, true: Colors.primaryDark }}
        thumbColor={value ? Colors.primary : colors.textMuted}
      />
    </View>
  );
}

function SettingSegment<T extends string>({
  label,
  description,
  options,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]} accessible accessibilityRole="radiogroup" accessibilityLabel={label}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
        {description && <Text style={[styles.rowDescription, { color: colors.textMuted }]}>{description}</Text>}
      </View>
      <View style={[styles.segmentContainer, { backgroundColor: colors.surfaceLight }]}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segment, value === opt.value && styles.segmentActive]}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === opt.value }}
            accessibilityLabel={opt.label}
          >
            <Text
              style={[styles.segmentText, { color: colors.textMuted }, value === opt.value && styles.segmentTextActive]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{title}</Text>;
}

// --- Main screen ---

export default function PreferencesScreen() {
  const { colors } = useTheme();
  const { preferences, updatePreference } = usePreferences();
  const router = useRouter();
  const [streakFreezeOn, setStreakFreezeOn] = useState(false);

  useEffect(() => {
    isFreezeEnabled().then(setStreakFreezeOn).catch(() => {});
  }, []);

  const handleStreakFreezeToggle = (value: boolean) => {
    setStreakFreezeOn(value);
    setFreezeEnabled(value).catch(() => {});
  };

  const handleReplayTutorial = async () => {
    await resetTutorial();
    router.replace('/(tabs)');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <SectionHeader title="APPEARANCE" />

      <SettingSegment<ThemeMode>
        label="Theme"
        description="Choose your preferred color scheme"
        options={[
          { label: 'Dark', value: 'dark' },
          { label: 'Light', value: 'light' },
          { label: 'System', value: 'system' },
        ]}
        value={preferences.theme}
        onChange={(v) => updatePreference('theme', v)}
      />

      <SectionHeader title="UNITS" />

      <SettingSegment<DistanceUnit>
        label="Distance"
        description="Affects pace, speed, and distance displays"
        options={[
          { label: 'Meters', value: 'm' },
          { label: 'Kilometers', value: 'km' },
          { label: 'Miles', value: 'mi' },
        ]}
        value={preferences.distanceUnit}
        onChange={(v) => updatePreference('distanceUnit', v)}
      />

      <SettingSegment<HeightUnit>
        label="Height"
        options={[
          { label: 'cm', value: 'cm' },
          { label: 'ft / in', value: 'ft' },
        ]}
        value={preferences.heightUnit}
        onChange={(v) => updatePreference('heightUnit', v)}
      />

      <SettingSegment<WeightUnit>
        label="Weight"
        options={[
          { label: 'kg', value: 'kg' },
          { label: 'lb', value: 'lb' },
        ]}
        value={preferences.weightUnit}
        onChange={(v) => updatePreference('weightUnit', v)}
      />

      <SectionHeader title="ACTIVITY" />

      <SettingToggle
        label="Auto-Pause"
        description="Pause tracking when you stop moving"
        value={preferences.autoPause}
        onToggle={(v) => updatePreference('autoPause', v)}
      />

      <SettingToggle
        label="Keep Screen On"
        description="Prevent screen from sleeping during activities"
        value={preferences.keepScreenOn}
        onToggle={(v) => updatePreference('keepScreenOn', v)}
      />

      <SettingToggle
        label="Audio Cues"
        description="Announce distance milestones and pace during runs"
        value={preferences.audioCues}
        onToggle={(v) => updatePreference('audioCues', v)}
      />

      {preferences.audioCues && (
        <SettingSegment<AudioCueFrequency>
          label="Cue Frequency"
          description="How often audio cues are announced"
          options={[
            { label: 'Every km', value: 'every_km' },
            { label: 'Every \u00BDkm', value: 'every_half_km' },
            { label: 'Every 5min', value: 'every_5min' },
            { label: 'Every 10min', value: 'every_10min' },
          ]}
          value={preferences.audioCueFrequency}
          onChange={(v) => updatePreference('audioCueFrequency', v)}
        />
      )}

      <SettingToggle
        label="Auto-Lap"
        description="Automatically mark laps at set distances"
        value={preferences.autoLap}
        onToggle={(v) => updatePreference('autoLap', v)}
      />

      {preferences.autoLap && (
        <SettingSegment<'km' | 'mi'>
          label="Lap Distance"
          description="Auto-lap every kilometer or mile"
          options={[
            { label: 'km', value: 'km' },
            { label: 'mi', value: 'mi' },
          ]}
          value={preferences.autoLapDistance}
          onChange={(v) => updatePreference('autoLapDistance', v)}
        />
      )}

      <SectionHeader title="GENERAL" />

      <SettingToggle
        label="Haptic Feedback"
        description="Vibrate on button presses and milestones"
        value={preferences.hapticFeedback}
        onToggle={(v) => updatePreference('hapticFeedback', v)}
      />

      <SettingToggle
        label="Week Starts Monday"
        description="Affects weekly stats charts"
        value={preferences.weekStartsMonday}
        onToggle={(v) => updatePreference('weekStartsMonday', v)}
      />

      <SettingToggle
        label="Streak Freeze"
        description="1 rest day per week that won't break your streak"
        value={streakFreezeOn}
        onToggle={handleStreakFreezeToggle}
      />

      <SectionHeader title="HELP" />

      <TouchableOpacity style={[styles.row, { backgroundColor: colors.surface }]} onPress={handleReplayTutorial}>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Replay Tutorial</Text>
          <Text style={[styles.rowDescription, { color: colors.textMuted }]}>See the app walkthrough again</Text>
        </View>
        <Text style={[styles.replayArrow, { color: colors.textMuted }]}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl * 2,
  },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  row: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: {
    flex: 1,
    marginRight: Spacing.md,
  },
  rowLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
  },
  rowDescription: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  segment: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  segmentTextActive: {
    color: Colors.white,
  },
  replayArrow: {
    fontSize: FontSize.xxl,
  },
});
