import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import TrendsChart, { TrendsDataPoint } from './TrendsChart';
import { Activity, DailySteps } from '@/src/types/database';
import { Colors, Spacing } from '@/src/constants/theme';
import { caloriesFromSteps } from '@/src/utils/fitness';
import type { DistanceUnit } from '@/src/context/PreferencesContext';

type WeeklyTrendsProps = {
  activities: Activity[];
  stepHistory: DailySteps[];
  unit: DistanceUnit;
  weightKg: number | null;
};

const NUM_WEEKS = 8;

/**
 * Get the Monday-based week boundaries for the last N weeks.
 * Returns an array of { start: Date, end: Date, label: string } going from
 * oldest to newest (left-to-right on the chart).
 */
function getWeekBuckets(numWeeks: number): { start: Date; end: Date; label: string }[] {
  const now = new Date();
  // Find the most recent Monday (start of current week)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - diffToMonday);

  const buckets: { start: Date; end: Date; label: string }[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const start = new Date(currentMonday);
    start.setDate(currentMonday.getDate() - i * 7);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    buckets.push({ start, end, label });
  }

  return buckets;
}

/**
 * Convert a date string (YYYY-MM-DD or ISO) to a local Date at midnight.
 */
function parseLocalDate(dateStr: string): Date {
  // Handle YYYY-MM-DD format by parsing components directly to avoid timezone issues
  const parts = dateStr.split('T')[0].split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

/**
 * Check if a date falls within a bucket (inclusive).
 */
function dateInBucket(date: Date, bucket: { start: Date; end: Date }): boolean {
  return date >= bucket.start && date <= bucket.end;
}

export default function WeeklyTrends({
  activities,
  stepHistory,
  unit,
  weightKg,
}: WeeklyTrendsProps) {
  const weekBuckets = useMemo(() => getWeekBuckets(NUM_WEEKS), []);

  const { distanceData, stepsData, caloriesData, activeTimeData } = useMemo(() => {
    // Pre-parse activity dates
    const activityDates = activities.map((a) => ({
      date: parseLocalDate(a.started_at),
      distanceM: a.distance_meters || 0,
      durationSec: a.duration_seconds || 0,
      calories: a.calories_estimate || 0,
    }));

    // Pre-parse step history dates
    const stepDates = stepHistory.map((s) => ({
      date: parseLocalDate(s.date),
      steps: s.step_count,
    }));

    const distance: TrendsDataPoint[] = [];
    const steps: TrendsDataPoint[] = [];
    const calories: TrendsDataPoint[] = [];
    const activeTime: TrendsDataPoint[] = [];

    for (const bucket of weekBuckets) {
      // Aggregate activities for this week
      let weekDistanceM = 0;
      let weekDurationSec = 0;
      let weekActivityCalories = 0;

      for (const a of activityDates) {
        if (dateInBucket(a.date, bucket)) {
          weekDistanceM += a.distanceM;
          weekDurationSec += a.durationSec;
          weekActivityCalories += a.calories;
        }
      }

      // Aggregate steps for this week
      let weekSteps = 0;
      for (const s of stepDates) {
        if (dateInBucket(s.date, bucket)) {
          weekSteps += s.steps;
        }
      }

      // Step-based calories (passive walking calories not from tracked activities)
      const stepCalories = caloriesFromSteps(weekSteps, weightKg);

      // Distance: activity distance (in display unit)
      const distanceVal =
        unit === 'mi'
          ? (weekDistanceM / 1000) * 0.621371
          : unit === 'm'
          ? weekDistanceM
          : weekDistanceM / 1000;

      distance.push({ label: bucket.label, value: Math.round(distanceVal * 100) / 100 });
      steps.push({ label: bucket.label, value: weekSteps });
      // Combine activity calories + step calories, avoid double-counting by taking the larger
      calories.push({
        label: bucket.label,
        value: Math.round(Math.max(weekActivityCalories, stepCalories)),
      });
      activeTime.push({
        label: bucket.label,
        value: Math.round(weekDurationSec / 60),
      });
    }

    return {
      distanceData: distance,
      stepsData: steps,
      caloriesData: calories,
      activeTimeData: activeTime,
    };
  }, [activities, stepHistory, weekBuckets, unit, weightKg]);

  const distanceUnit = unit === 'mi' ? 'miles' : unit === 'm' ? 'meters' : 'km';

  return (
    <View style={styles.container}>
      <TrendsChart
        data={stepsData}
        title="Steps"
        unit="per week"
        color={Colors.primary}
      />

      <TrendsChart
        data={distanceData}
        title="Distance"
        unit={distanceUnit}
        color={Colors.primaryLight}
        formatValue={(v) => {
          if (unit === 'm') {
            if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
            return `${Math.round(v)}`;
          }
          return v.toFixed(1);
        }}
      />

      <TrendsChart
        data={caloriesData}
        title="Calories"
        unit="kcal"
        color="#EF4444"
      />

      <TrendsChart
        data={activeTimeData}
        title="Active Time"
        unit="minutes"
        color="#10B981"
        formatValue={(v) => {
          if (v >= 60) return `${(v / 60).toFixed(1)}h`;
          return `${Math.round(v)}`;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
});
