import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import * as PersonalBestService from '@/src/services/personal-best.service';
import * as ActivityService from '@/src/services/activity.service';
import {
  predictAllRaceTimes,
  estimateThresholdPace,
} from '@/src/utils/running-metrics';
import { formatDuration, formatPace, paceUnitLabel } from '@/src/utils/formatters';
import { PersonalBest } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type PredictionSource = {
  label: string;
  distanceM: number;
  timeS: number;
};

export default function RacePredictorScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const unit = preferences.distanceUnit;

  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<PredictionSource | null>(null);

  // Manual input state
  const [manualDistKm, setManualDistKm] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualSeconds, setManualSeconds] = useState('');
  const [useManual, setUseManual] = useState(false);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        // Try personal bests first
        const pbs: PersonalBest[] = await PersonalBestService.getPersonalBests(user.id);

        if (pbs.length > 0) {
          // Pick the best PB (prefer longer distances for better prediction accuracy)
          // Sort by distance descending and take the longest
          const sorted = [...pbs].sort((a, b) => b.distance_meters - a.distance_meters);
          const best = sorted[0];
          setSource({
            label: best.distance_label,
            distanceM: best.distance_meters,
            timeS: best.best_time_seconds,
          });
        } else {
          // Fallback: estimate from recent runs
          const activities = await ActivityService.getActivityHistory(user.id, 100);
          const runs = activities.filter(
            (a) =>
              a.type === 'run' &&
              a.status === 'completed' &&
              a.distance_meters > 1000 &&
              a.duration_seconds > 300
          );

          if (runs.length > 0) {
            // Use the run with the best pace as the reference
            const bestRun = runs.reduce((best, curr) => {
              const bestPace = best.avg_pace_seconds_per_km ?? Infinity;
              const currPace = curr.avg_pace_seconds_per_km ?? Infinity;
              return currPace < bestPace ? curr : best;
            });

            setSource({
              label: `${(bestRun.distance_meters / 1000).toFixed(1)}K run`,
              distanceM: bestRun.distance_meters,
              timeS: bestRun.duration_seconds,
            });
          }
        }
      } catch (err) {
        console.warn('[RacePredictor] Failed to load:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user]);

  // Build manual source
  const manualSource = useMemo<PredictionSource | null>(() => {
    const dist = parseFloat(manualDistKm);
    const h = parseInt(manualHours) || 0;
    const m = parseInt(manualMinutes) || 0;
    const s = parseInt(manualSeconds) || 0;
    const totalS = h * 3600 + m * 60 + s;

    if (!dist || dist <= 0 || totalS <= 0) return null;

    return {
      label: `${dist} km`,
      distanceM: dist * 1000,
      timeS: totalS,
    };
  }, [manualDistKm, manualHours, manualMinutes, manualSeconds]);

  const activeSource = useManual ? manualSource : source;

  const predictions = useMemo(() => {
    if (!activeSource) return [];
    return predictAllRaceTimes(activeSource.distanceM, activeSource.timeS);
  }, [activeSource]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Predicted race times based on the Riegel formula. The closer your input distance is to the target, the more accurate the prediction.
      </Text>

      {/* Source Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            { backgroundColor: !useManual ? Colors.primary : colors.surface },
          ]}
          onPress={() => setUseManual(false)}
        >
          <Text
            style={[
              styles.toggleText,
              { color: !useManual ? Colors.white : colors.textSecondary },
            ]}
          >
            Auto
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            { backgroundColor: useManual ? Colors.primary : colors.surface },
          ]}
          onPress={() => setUseManual(true)}
        >
          <Text
            style={[
              styles.toggleText,
              { color: useManual ? Colors.white : colors.textSecondary },
            ]}
          >
            Manual
          </Text>
        </TouchableOpacity>
      </View>

      {/* Source Info */}
      {!useManual && activeSource && (
        <View style={[styles.sourceCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sourceLabel, { color: colors.textMuted }]}>BASED ON YOUR</Text>
          <Text style={[styles.sourceValue, { color: Colors.primary }]}>
            {activeSource.label}
          </Text>
          <Text style={[styles.sourceTime, { color: colors.textPrimary }]}>
            {formatDuration(activeSource.timeS)}
          </Text>
        </View>
      )}

      {!useManual && !activeSource && (
        <View style={[styles.sourceCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No data available</Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            Complete some runs or switch to Manual mode to enter a race result
          </Text>
        </View>
      )}

      {/* Manual Input */}
      {useManual && (
        <View style={[styles.manualCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.manualTitle, { color: colors.textPrimary }]}>Enter a Race Result</Text>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Distance (km)</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.border },
            ]}
            value={manualDistKm}
            onChangeText={setManualDistKm}
            keyboardType="decimal-pad"
            placeholder="e.g. 5"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Time</Text>
          <View style={styles.timeInputRow}>
            <View style={styles.timeInputGroup}>
              <TextInput
                style={[
                  styles.timeInput,
                  { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.border },
                ]}
                value={manualHours}
                onChangeText={setManualHours}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                maxLength={2}
              />
              <Text style={[styles.timeLabel, { color: colors.textMuted }]}>h</Text>
            </View>
            <View style={styles.timeInputGroup}>
              <TextInput
                style={[
                  styles.timeInput,
                  { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.border },
                ]}
                value={manualMinutes}
                onChangeText={setManualMinutes}
                keyboardType="number-pad"
                placeholder="00"
                placeholderTextColor={colors.textMuted}
                maxLength={2}
              />
              <Text style={[styles.timeLabel, { color: colors.textMuted }]}>m</Text>
            </View>
            <View style={styles.timeInputGroup}>
              <TextInput
                style={[
                  styles.timeInput,
                  { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.border },
                ]}
                value={manualSeconds}
                onChangeText={setManualSeconds}
                keyboardType="number-pad"
                placeholder="00"
                placeholderTextColor={colors.textMuted}
                maxLength={2}
              />
              <Text style={[styles.timeLabel, { color: colors.textMuted }]}>s</Text>
            </View>
          </View>

          {manualSource && (
            <Text style={[styles.manualPreview, { color: Colors.primary }]}>
              {manualSource.label} in {formatDuration(manualSource.timeS)}
            </Text>
          )}
        </View>
      )}

      {/* Predictions Table */}
      {predictions.length > 0 && (
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.tableHeader, { borderBottomColor: colors.surfaceLight }]}>
            <Text style={[styles.tableHeaderText, styles.colDistance, { color: colors.textMuted }]}>
              Distance
            </Text>
            <Text style={[styles.tableHeaderText, styles.colTime, { color: colors.textMuted }]}>
              Time
            </Text>
            <Text style={[styles.tableHeaderText, styles.colPace, { color: colors.textMuted }]}>
              Pace
            </Text>
          </View>

          {predictions.map((pred, i) => (
            <View
              key={pred.label}
              style={[
                styles.tableRow,
                i < predictions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceLight },
              ]}
            >
              <View style={styles.colDistance}>
                <Text style={[styles.distLabel, { color: colors.textPrimary }]}>{pred.label}</Text>
              </View>
              <View style={styles.colTime}>
                <Text style={[styles.timeValue, { color: Colors.primary }]}>
                  {formatDuration(pred.predictedTimeS)}
                </Text>
              </View>
              <View style={styles.colPace}>
                <Text style={[styles.paceValue, { color: colors.textSecondary }]}>
                  {formatPace(pred.predictedPaceSecPerKm, unit)} {paceUnitLabel(unit)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Formula Note */}
      <View style={styles.formulaNote}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.formulaText, { color: colors.textMuted }]}>
          Predictions use the Riegel formula: T2 = T1 x (D2/D1)^1.06. Results are estimates and may vary based on terrain, weather, and fitness.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
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
    padding: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  // Source card
  sourceCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  sourceLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  sourceValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  sourceTime: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Manual input
  manualCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  manualTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
  },
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.lg,
    marginBottom: Spacing.lg,
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  timeInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeInput: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.lg,
    textAlign: 'center',
  },
  timeLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  manualPreview: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },

  // Table
  tableContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  colDistance: {
    flex: 2,
  },
  colTime: {
    flex: 2,
    alignItems: 'center',
  },
  colPace: {
    flex: 2,
    alignItems: 'flex-end',
  },
  distLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  timeValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  paceValue: {
    fontSize: FontSize.sm,
  },

  // Formula note
  formulaNote: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.sm,
  },
  formulaText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
});
