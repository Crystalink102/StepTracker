import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Card from '@/src/components/ui/Card';
import { useAuth } from '@/src/context/AuthContext';
import { getStepHistory } from '@/src/services/step.service';
import { getActivityHistory } from '@/src/services/activity.service';
import { formatNumber, formatDistanceShort } from '@/src/utils/formatters';
import { usePreferences } from '@/src/context/PreferencesContext';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import type { Activity, DailySteps } from '@/src/types/database';

type WeekData = {
  steps: number;
  distance: number; // meters
  activities: number;
  calories: number;
};

function getWeekRange(weeksAgo: number): { start: string; end: string } {
  const now = new Date();
  // Get Monday of the current week
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return { start: fmt(monday), end: fmt(sunday) };
}

function calcPercentChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

export default function WeeklySummaryCard() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const { colors } = useTheme();
  const [thisWeek, setThisWeek] = useState<WeekData | null>(null);
  const [lastWeek, setLastWeek] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function load() {
      try {
        const thisRange = getWeekRange(0);
        const lastRange = getWeekRange(1);

        const [thisSteps, lastSteps, allActivities] = await Promise.all([
          getStepHistory(user!.id, thisRange.start, thisRange.end),
          getStepHistory(user!.id, lastRange.start, lastRange.end),
          getActivityHistory(user!.id, 200),
        ]);

        if (cancelled) return;

        // Filter activities by week
        const thisWeekStart = new Date(thisRange.start);
        const thisWeekEnd = new Date(thisRange.end);
        thisWeekEnd.setHours(23, 59, 59, 999);

        const lastWeekStart = new Date(lastRange.start);
        const lastWeekEnd = new Date(lastRange.end);
        lastWeekEnd.setHours(23, 59, 59, 999);

        const thisWeekActivities = allActivities.filter((a) => {
          const d = new Date(a.started_at);
          return d >= thisWeekStart && d <= thisWeekEnd;
        });

        const lastWeekActivities = allActivities.filter((a) => {
          const d = new Date(a.started_at);
          return d >= lastWeekStart && d <= lastWeekEnd;
        });

        const sumSteps = (data: DailySteps[]) =>
          data.reduce((s, r) => s + (r.step_count ?? 0), 0);

        const sumDistance = (data: Activity[]) =>
          data.reduce((s, a) => s + (a.distance_meters ?? 0), 0);

        const sumCalories = (data: Activity[]) =>
          data.reduce((s, a) => s + (a.calories_estimate ?? 0), 0);

        setThisWeek({
          steps: sumSteps(thisSteps),
          distance: sumDistance(thisWeekActivities),
          activities: thisWeekActivities.length,
          calories: sumCalories(thisWeekActivities),
        });

        setLastWeek({
          steps: sumSteps(lastSteps),
          distance: sumDistance(lastWeekActivities),
          activities: lastWeekActivities.length,
          calories: sumCalories(lastWeekActivities),
        });
      } catch (err) {
        console.warn('[WeeklySummary] Failed to load:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <Card style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading weekly summary...</Text>
        </View>
      </Card>
    );
  }

  if (!thisWeek || !lastWeek) return null;

  const rows: { label: string; current: string; pct: number | null }[] = [
    {
      label: 'Steps',
      current: formatNumber(thisWeek.steps),
      pct: calcPercentChange(thisWeek.steps, lastWeek.steps),
    },
    {
      label: 'Distance',
      current: formatDistanceShort(thisWeek.distance, preferences.distanceUnit),
      pct: calcPercentChange(thisWeek.distance, lastWeek.distance),
    },
    {
      label: 'Activities',
      current: `${thisWeek.activities}`,
      pct: calcPercentChange(thisWeek.activities, lastWeek.activities),
    },
    {
      label: 'Calories',
      current: formatNumber(Math.round(thisWeek.calories)),
      pct: calcPercentChange(thisWeek.calories, lastWeek.calories),
    },
  ];

  return (
    <Card style={styles.card}>
      <Text style={[styles.title, { color: colors.textMuted }]}>WEEKLY SUMMARY</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>This week vs last week</Text>

      {rows.map((row) => (
        <View key={row.label} style={[styles.row, { borderBottomColor: colors.border }]}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{row.label}</Text>
          <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{row.current}</Text>
          {row.pct !== null ? (
            <View
              style={[
                styles.pctBadge,
                {
                  backgroundColor:
                    row.pct >= 0 ? '#22C55E22' : '#EF444422',
                },
              ]}
            >
              <Text
                style={[
                  styles.pctText,
                  { color: row.pct >= 0 ? '#22C55E' : '#EF4444' },
                ]}
              >
                {row.pct > 0 ? '+' : ''}
                {row.pct}%
              </Text>
            </View>
          ) : (
            <View style={[styles.pctBadge, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.pctText, { color: colors.textMuted }]}>--</Text>
            </View>
          )}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },
  title: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  rowLabel: {
    flex: 1,
    fontSize: FontSize.md,
  },
  rowValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginRight: Spacing.md,
  },
  pctBadge: {
    minWidth: 60,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  pctText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
