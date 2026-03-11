import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChallenges } from '@/src/hooks/useChallenges';
import DistanceInput from '@/src/components/ui/DistanceInput';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import { formatDistance } from '@/src/utils/formatters';
import type { Challenge } from '@/src/types/database';

// ─── Options ────────────────────────────────────────────────────────
const CHALLENGE_TYPES: { value: Challenge['type']; label: string; icon: string }[] = [
  { value: 'steps', label: 'Steps', icon: 'footsteps' },
  { value: 'distance', label: 'Distance', icon: 'navigate' },
  { value: 'duration', label: 'Duration', icon: 'timer' },
  { value: 'activities', label: 'Activities', icon: 'fitness' },
];

const DURATIONS: { label: string; days: number }[] = [
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '1 Month', days: 30 },
];

const DEFAULT_TARGETS: Record<string, number> = {
  steps: 50000,
  distance: 25000, // meters
  duration: 3600,  // seconds
  activities: 5,
};

function formatTargetPreview(type: string, value: number, distanceFmt: (m: number) => string): string {
  switch (type) {
    case 'steps':
      return `${value.toLocaleString()} steps`;
    case 'distance':
      return distanceFmt(value);
    case 'duration': {
      const hrs = Math.floor(value / 3600);
      const mins = Math.round((value % 3600) / 60);
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
    }
    case 'activities':
      return `${value} activities`;
    default:
      return `${value}`;
  }
}

function getTargetPlaceholder(type: string): string {
  switch (type) {
    case 'steps': return 'e.g. 50000';
    case 'distance': return 'Meters (e.g. 25000 = 25km)';
    case 'duration': return 'Seconds (e.g. 3600 = 1hr)';
    case 'activities': return 'e.g. 5';
    default: return 'Target value';
  }
}

export default function CreateChallengeScreen() {
  const router = useRouter();
  const { create } = useChallenges();
  const { colors } = useTheme();
  const { preferences } = usePreferences();
  const distanceFmt = (m: number) => formatDistance(m, preferences.distanceUnit);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Challenge['type']>('steps');
  const [targetStr, setTargetStr] = useState(DEFAULT_TARGETS.steps.toString());
  const [targetMeters, setTargetMeters] = useState(DEFAULT_TARGETS.distance);
  const [durationDays, setDurationDays] = useState(7);
  const [isSaving, setIsSaving] = useState(false);

  const targetValue = type === 'distance' ? targetMeters : (parseInt(targetStr, 10) || 0);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your challenge a name.');
      return;
    }
    if (targetValue <= 0) {
      Alert.alert('Invalid target', 'Set a target value greater than zero.');
      return;
    }

    setIsSaving(true);
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + durationDays);

    const challenge = await create({
      title: title.trim(),
      description: description.trim(),
      type,
      target_value: targetValue,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
    });

    setIsSaving(false);

    if (challenge) {
      router.back();
    } else {
      Alert.alert('Error', 'Failed to create challenge. Please try again.');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Walk 50k steps this week"
        placeholderTextColor={colors.textMuted}
        maxLength={60}
      />

      {/* Description */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.multilineInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Any extra details about the challenge..."
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={200}
      />

      {/* Type picker */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
      <View style={styles.row}>
        {CHALLENGE_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }, type === t.value && styles.chipActive]}
            onPress={() => {
              setType(t.value);
              if (t.value === 'distance') {
                setTargetMeters(DEFAULT_TARGETS.distance);
              } else {
                setTargetStr(DEFAULT_TARGETS[t.value].toString());
              }
            }}
          >
            <Ionicons
              name={t.icon as any}
              size={16}
              color={type === t.value ? Colors.white : colors.textSecondary}
            />
            <Text
              style={[
                styles.chipText,
                { color: colors.textSecondary },
                type === t.value && styles.chipTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Target */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Target</Text>
      {type === 'distance' ? (
        <DistanceInput
          value={targetMeters}
          onChange={setTargetMeters}
        />
      ) : (
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
          value={targetStr}
          onChangeText={setTargetStr}
          placeholder={getTargetPlaceholder(type)}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
      )}

      {/* Duration */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Duration</Text>
      <View style={styles.row}>
        {DURATIONS.map((d) => (
          <TouchableOpacity
            key={d.days}
            style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }, durationDays === d.days && styles.chipActive]}
            onPress={() => setDurationDays(d.days)}
          >
            <Text
              style={[
                styles.chipText,
                { color: colors.textSecondary },
                durationDays === d.days && styles.chipTextActive,
              ]}
            >
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Preview card */}
      <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.xl }]}>Preview</Text>
      <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.previewHeader}>
          <View style={[styles.previewTypeTag, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons
              name={CHALLENGE_TYPES.find((t) => t.value === type)?.icon as any ?? 'help-circle'}
              size={14}
              color={Colors.primary}
            />
            <Text style={styles.previewTypeLabel}>
              {CHALLENGE_TYPES.find((t) => t.value === type)?.label}
            </Text>
          </View>
          <Text style={[styles.previewDays, { color: colors.textMuted }]}>{durationDays}d</Text>
        </View>
        <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>{title || 'Your Challenge Title'}</Text>
        <Text style={[styles.previewTarget, { color: colors.textSecondary }]}>
          Goal: {formatTargetPreview(type, targetValue, distanceFmt)}
        </Text>
        {description ? (
          <Text style={[styles.previewDesc, { color: colors.textMuted }]} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>

      {/* Create button */}
      <TouchableOpacity
        style={[styles.createBtn, isSaving && styles.createBtnDisabled]}
        onPress={handleCreate}
        disabled={isSaving}
        activeOpacity={0.8}
      >
        {isSaving ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.createBtnText}>Create Challenge</Text>
        )}
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
    paddingBottom: 60,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  input: {
    fontSize: FontSize.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  chipTextActive: {
    color: Colors.white,
  },
  previewCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  previewTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  previewTypeLabel: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
  },
  previewDays: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  previewTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  previewTarget: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  previewDesc: {
    fontSize: FontSize.sm,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});
