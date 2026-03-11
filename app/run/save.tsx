import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import * as ActivityService from '@/src/services/activity.service';
import { Activity, Gear } from '@/src/types/database';
import { generateActivityName, ACTIVITY_SUBTYPES, PRIVACY_OPTIONS, getSubtypeLabel } from '@/src/utils/activity-name';
import { formatDistance, formatDuration, formatPace, paceUnitLabel } from '@/src/utils/formatters';
import { usePreferences } from '@/src/context/PreferencesContext';
import { recommendShoe } from '@/src/utils/gear-rotation';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

export default function SaveActivityScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const unit = preferences.distanceUnit;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [effort, setEffort] = useState<number | null>(null);
  const [privacy, setPrivacy] = useState('public');
  const [subtype, setSubtype] = useState<string | null>(null);
  const [gearId, setGearId] = useState<string | null>(null);
  const [gearList, setGearList] = useState<Gear[]>([]);

  // Load activity + gear
  useEffect(() => {
    if (!id || !user) return;

    const load = async () => {
      try {
        const [actResult, gears, defaultGear] = await Promise.all([
          ActivityService.getActivityWithWaypoints(id),
          ActivityService.getGearList(user.id).catch(() => [] as Gear[]),
          ActivityService.getDefaultGear(user.id).catch(() => null),
        ]);
        const act = actResult.activity;
        setActivity(act);
        setName(act.name || generateActivityName(act.type, act.started_at));
        setDescription(act.description || '');
        setEffort(act.perceived_effort);
        setPrivacy(act.privacy || 'public');
        setSubtype(act.activity_subtype);
        setGearList(gears.filter((g: Gear) => !g.is_retired));

        // Auto-assign default gear if none set
        if (!act.gear_id && defaultGear) {
          setGearId(defaultGear.id);
        } else {
          setGearId(act.gear_id);
        }
      } catch (err) {
        console.warn('[SaveActivity] Load failed:', err);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, user]);

  const handleSave = useCallback(async () => {
    if (!id || isSaving) return;
    setIsSaving(true);

    try {
      const updated = await ActivityService.editActivity(id, {
        name: name.trim() || null,
        description: description.trim() || null,
        perceived_effort: effort,
        privacy,
        activity_subtype: subtype,
        gear_id: gearId,
      });

      // Add distance to gear if assigned
      if (gearId && updated.distance_meters > 0) {
        ActivityService.addDistanceToGear(gearId, updated.distance_meters).catch(() => {});
      }

      router.replace(`/run/${id}` as any);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save activity details');
    } finally {
      setIsSaving(false);
    }
  }, [id, name, description, effort, privacy, subtype, gearId, isSaving, router]);

  const handleDiscard = useCallback(() => {
    // Skip save and go straight to detail
    router.replace(`/run/${id}` as any);
  }, [id, router]);

  if (loadError) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
            Could not load activity details.
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (isLoading || !activity) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  const subtypeOptions = ACTIVITY_SUBTYPES[activity.type as keyof typeof ACTIVITY_SUBTYPES] || ACTIVITY_SUBTYPES.run;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleDiscard} hitSlop={8}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Save Activity</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} hitSlop={8}>
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick stats summary */}
        <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, { color: colors.textPrimary }]}>
              {formatDistance(activity.distance_meters, unit)}
            </Text>
            <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>Distance</Text>
          </View>
          <View style={[styles.quickStatDivider, { backgroundColor: colors.surfaceLight }]} />
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, { color: colors.textPrimary }]}>
              {formatDuration(activity.duration_seconds)}
            </Text>
            <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>Duration</Text>
          </View>
          <View style={[styles.quickStatDivider, { backgroundColor: colors.surfaceLight }]} />
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, { color: colors.textPrimary }]}>
              {activity.avg_pace_seconds_per_km
                ? `${formatPace(activity.avg_pace_seconds_per_km, unit)}`
                : '--'}
            </Text>
            <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>
              {paceUnitLabel(unit)}
            </Text>
          </View>
        </View>

        {/* Activity Name */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>TITLE</Text>
          <TextInput
            style={[styles.nameInput, { color: colors.textPrimary, borderBottomColor: colors.surfaceLight }]}
            value={name}
            onChangeText={setName}
            placeholder="Name your activity"
            placeholderTextColor={colors.textMuted}
            maxLength={100}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DESCRIPTION</Text>
          <TextInput
            style={[styles.descInput, { color: colors.textPrimary, backgroundColor: colors.surface }]}
            value={description}
            onChangeText={setDescription}
            placeholder="How did it go? Add notes about your activity..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
        </View>

        {/* Activity Subtype */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ACTIVITY TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {subtypeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface },
                  subtype === opt.value && styles.chipActive,
                ]}
                onPress={() => setSubtype(subtype === opt.value ? null : opt.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.textSecondary },
                    subtype === opt.value && styles.chipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Perceived Effort */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            PERCEIVED EFFORT {effort ? `(${effort}/10)` : ''}
          </Text>
          <View style={styles.effortRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <TouchableOpacity
                key={n}
                style={[
                  styles.effortDot,
                  { backgroundColor: colors.surface },
                  effort != null && n <= effort && {
                    backgroundColor: n <= 3 ? '#22C55E' : n <= 6 ? '#F59E0B' : n <= 8 ? '#F97316' : '#EF4444',
                  },
                ]}
                onPress={() => setEffort(effort === n ? null : n)}
              >
                <Text
                  style={[
                    styles.effortDotText,
                    { color: colors.textMuted },
                    effort != null && n <= effort && { color: '#FFF' },
                  ]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.effortLabels}>
            <Text style={[styles.effortLabel, { color: colors.textMuted }]}>Easy</Text>
            <Text style={[styles.effortLabel, { color: colors.textMuted }]}>Max Effort</Text>
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>WHO CAN SEE</Text>
          <View style={styles.privacyRow}>
            {PRIVACY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.privacyOption,
                  { backgroundColor: colors.surface },
                  privacy === opt.value && styles.privacyOptionActive,
                ]}
                onPress={() => setPrivacy(opt.value)}
              >
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={privacy === opt.value ? '#FFF' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.privacyOptionText,
                    { color: colors.textSecondary },
                    privacy === opt.value && styles.privacyOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Gear Selection */}
        {gearList.length > 0 && (() => {
          const shoeRec = recommendShoe(gearList);
          return (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>GEAR</Text>
              {gearList.map((g) => {
                const isRecommended = shoeRec && shoeRec.recommended.id === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[
                      styles.gearItem,
                      { backgroundColor: colors.surface },
                      gearId === g.id && { borderColor: Colors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => setGearId(gearId === g.id ? null : g.id)}
                  >
                    <Ionicons
                      name={g.type === 'shoes' ? 'footsteps-outline' : g.type === 'watch' ? 'watch-outline' : 'fitness-outline'}
                      size={20}
                      color={gearId === g.id ? Colors.primary : colors.textMuted}
                    />
                    <View style={styles.gearInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                        <Text style={[styles.gearName, { color: colors.textPrimary }]}>{g.name}</Text>
                        {isRecommended && (
                          <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedBadgeText}>Recommended</Text>
                          </View>
                        )}
                      </View>
                      {g.brand && <Text style={[styles.gearBrand, { color: colors.textMuted }]}>{g.brand}</Text>}
                    </View>
                    <Text style={[styles.gearDist, { color: colors.textMuted }]}>
                      {(g.distance_meters / 1000).toFixed(0)} km
                    </Text>
                    {gearId === g.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })()}

        {/* Bottom padding */}
        <View style={{ height: 60 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  skipText: {
    fontSize: FontSize.lg,
  },
  saveText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  quickStatLabel: {
    fontSize: FontSize.xs,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  quickStatDivider: {
    width: 1,
    marginVertical: 4,
  },
  field: {
    marginBottom: Spacing.xxl,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  nameInput: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    borderBottomWidth: 1,
    paddingBottom: Spacing.sm,
  },
  descInput: {
    fontSize: FontSize.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 80,
  },
  chipRow: {
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  chipTextActive: {
    color: '#FFF',
  },
  effortRow: {
    flexDirection: 'row',
    gap: 6,
  },
  effortDot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 36,
  },
  effortDotText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  effortLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  effortLabel: {
    fontSize: FontSize.xs,
  },
  privacyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  privacyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  privacyOptionActive: {
    backgroundColor: Colors.primary,
  },
  privacyOptionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  privacyOptionTextActive: {
    color: '#FFF',
  },
  gearItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  gearInfo: {
    flex: 1,
  },
  gearName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  gearBrand: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  gearDist: {
    fontSize: FontSize.sm,
  },
  recommendedBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  recommendedBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
});
