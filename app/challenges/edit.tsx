import { useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChallenges } from '@/src/hooks/useChallenges';
import * as ChallengeService from '@/src/services/challenge.service';
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

const END_DATE_OPTIONS: { label: string; days: number }[] = [
  { label: '+3 Days', days: 3 },
  { label: '+1 Week', days: 7 },
  { label: '+2 Weeks', days: 14 },
  { label: '+1 Month', days: 30 },
];

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

function formatDateNice(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function EditChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { update } = useChallenges();
  const { colors } = useTheme();
  const { preferences } = usePreferences();
  const distanceFmt = (m: number) => formatDistance(m, preferences.distanceUnit);

  const [isLoadingChallenge, setIsLoadingChallenge] = useState(true);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Challenge['type']>('steps');
  const [targetStr, setTargetStr] = useState('');
  const [targetMeters, setTargetMeters] = useState(0);
  const [endDate, setEndDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);

  // Load existing challenge
  useEffect(() => {
    if (!id) return;
    (async () => {
      setIsLoadingChallenge(true);
      try {
        const result = await ChallengeService.getChallengeDetails(id);
        if (result) {
          const c = result.challenge;
          setChallenge(c);
          setTitle(c.title);
          setDescription(c.description || '');
          setType(c.type);
          setEndDate(new Date(c.end_date));

          if (c.type === 'distance') {
            setTargetMeters(c.target_value);
          } else {
            setTargetStr(c.target_value.toString());
          }
        }
      } catch (err) {
        console.warn('[EditChallenge] load error:', err);
      } finally {
        setIsLoadingChallenge(false);
      }
    })();
  }, [id]);

  const targetValue = type === 'distance' ? targetMeters : (parseInt(targetStr, 10) || 0);

  const handleSave = async () => {
    if (!challenge) return;

    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your challenge a name.');
      return;
    }
    if (targetValue <= 0) {
      Alert.alert('Invalid target', 'Set a target value greater than zero.');
      return;
    }

    setIsSaving(true);

    const ok = await update(challenge.id, {
      title: title.trim(),
      description: description.trim(),
      target_value: targetValue,
      end_date: endDate.toISOString(),
    });

    setIsSaving(false);

    if (ok) {
      router.back();
    } else {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  };

  const handleExtendEndDate = (days: number) => {
    const newDate = new Date(endDate);
    newDate.setDate(newDate.getDate() + days);
    setEndDate(newDate);
  };

  // ─── Loading state ─────────────────────────────────────────────────
  if (isLoadingChallenge) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Challenge not found</Text>
      </View>
    );
  }

  const daysLeft = Math.max(
    0,
    Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

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
        placeholder="Challenge title"
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

      {/* Type (read-only) */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Type (cannot be changed)</Text>
      <View style={styles.row}>
        {CHALLENGE_TYPES.map((t) => (
          <View
            key={t.value}
            style={[
              styles.chip,
              { backgroundColor: colors.surface, borderColor: colors.border },
              type === t.value && styles.chipActive,
              type !== t.value && styles.chipDisabled,
            ]}
          >
            <Ionicons
              name={t.icon as any}
              size={16}
              color={type === t.value ? Colors.white : colors.textMuted}
            />
            <Text
              style={[
                styles.chipText,
                { color: colors.textMuted },
                type === t.value && styles.chipTextActive,
              ]}
            >
              {t.label}
            </Text>
          </View>
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
          placeholder={
            type === 'steps'
              ? 'e.g. 50000'
              : type === 'duration'
              ? 'Seconds (e.g. 3600 = 1hr)'
              : 'e.g. 5'
          }
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
      )}

      {/* End Date */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>End Date</Text>
      <View style={[styles.dateDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.dateText, { color: colors.textPrimary }]}>
          {formatDateNice(endDate)}
        </Text>
        <Text style={[styles.daysLeftText, { color: colors.textMuted }]}>
          ({daysLeft} days left)
        </Text>
      </View>
      <Text style={[styles.extendLabel, { color: colors.textMuted }]}>Extend by:</Text>
      <View style={styles.row}>
        {END_DATE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.days}
            style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleExtendEndDate(opt.days)}
          >
            <Text style={[styles.chipText, { color: colors.textSecondary }]}>{opt.label}</Text>
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
          <Text style={[styles.previewDays, { color: colors.textMuted }]}>{daysLeft}d</Text>
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

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={isSaving}
        activeOpacity={0.8}
      >
        {isSaving ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.saveBtnText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  errorText: {
    fontSize: FontSize.lg,
    marginTop: Spacing.md,
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
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  chipTextActive: {
    color: Colors.white,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  dateText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  daysLeftText: {
    fontSize: FontSize.sm,
  },
  extendLabel: {
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
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
  saveBtn: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});
