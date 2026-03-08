import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePreferences, type DistanceUnit, type HeightUnit, type WeightUnit } from '@/src/context/PreferencesContext';
import { resetTutorial } from '@/src/components/tutorial/TutorialOverlay';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

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
  return (
    <View style={styles.row} accessible accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description && <Text style={styles.rowDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.surfaceLight, true: Colors.primaryDark }}
        thumbColor={value ? Colors.primary : Colors.textMuted}
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
  return (
    <View style={styles.row} accessible accessibilityRole="radiogroup" accessibilityLabel={label}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description && <Text style={styles.rowDescription}>{description}</Text>}
      </View>
      <View style={styles.segmentContainer}>
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
              style={[styles.segmentText, value === opt.value && styles.segmentTextActive]}
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
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// --- Main screen ---

export default function PreferencesScreen() {
  const { preferences, updatePreference } = usePreferences();
  const router = useRouter();

  const handleReplayTutorial = async () => {
    await resetTutorial();
    router.replace('/(tabs)');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="UNITS" />

      <SettingSegment<DistanceUnit>
        label="Distance"
        description="Affects pace, speed, and distance displays"
        options={[
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

      <SectionHeader title="HELP" />

      <TouchableOpacity style={styles.row} onPress={handleReplayTutorial}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Replay Tutorial</Text>
          <Text style={styles.rowDescription}>See the app walkthrough again</Text>
        </View>
        <Text style={styles.replayArrow}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl * 2,
  },
  sectionHeader: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  row: {
    backgroundColor: Colors.surface,
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
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
  },
  rowDescription: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
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
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  segmentTextActive: {
    color: Colors.white,
  },
  replayArrow: {
    color: Colors.textMuted,
    fontSize: FontSize.xxl,
  },
});
