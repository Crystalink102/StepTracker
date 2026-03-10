import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState, useMemo } from 'react';
import Card from '@/src/components/ui/Card';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '@/src/constants/theme';
import { useAuth } from '@/src/context/AuthContext';
import { useProfile } from '@/src/context/ProfileContext';
import { getActivityHistory } from '@/src/services/activity.service';
import { ageFromDOB, calculateMaxHR } from '@/src/utils/hr-zones';
import {
  calculateWeeklyLoad,
  calculateLoadFromActivity,
  getLoadStatus,
  getWeeklyLoadLabel,
  estimateRecovery,
  getFreshness,
  type LoadStatus,
  type RecoveryEstimate,
  type FreshnessResult,
} from '@/src/utils/training-load';
import { Activity } from '@/src/types/database';

const DEFAULT_MAX_HR = 190;
const DEFAULT_RESTING_HR = 65;

export default function TrainingLoadCard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Derive HR values from profile
  const restingHR = profile?.resting_hr ?? DEFAULT_RESTING_HR;
  const maxHR = useMemo(() => {
    const age = ageFromDOB(profile?.date_of_birth);
    return age ? calculateMaxHR(age) : DEFAULT_MAX_HR;
  }, [profile?.date_of_birth]);

  // Fetch last 28 days of completed activities
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function load() {
      try {
        // Grab enough history — getActivityHistory already filters to completed
        const history = await getActivityHistory(user!.id, 200);

        if (!cancelled) {
          // Filter to last 28 days
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 28);
          const recent = history.filter(
            (a) => new Date(a.started_at) >= cutoff
          );
          setActivities(recent);
        }
      } catch (err) {
        console.warn('[TrainingLoadCard] Failed to load activities:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Split activities into time windows
  const { thisWeek, lastWeek, last7, last28 } = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const thisWeekActs: Activity[] = [];
    const lastWeekActs: Activity[] = [];
    const last7Acts: Activity[] = [];
    const last28Acts: Activity[] = [];

    for (const a of activities) {
      const date = new Date(a.started_at);
      last28Acts.push(a);

      if (date >= sevenDaysAgo) {
        thisWeekActs.push(a);
        last7Acts.push(a);
      } else if (date >= fourteenDaysAgo) {
        lastWeekActs.push(a);
      }
    }

    return {
      thisWeek: thisWeekActs,
      lastWeek: lastWeekActs,
      last7: last7Acts,
      last28: last28Acts,
    };
  }, [activities]);

  // Compute all the metrics
  const weeklyLoad = useMemo(
    () => calculateWeeklyLoad(thisWeek, maxHR, restingHR),
    [thisWeek, maxHR, restingHR]
  );

  const prevWeekLoad = useMemo(
    () => calculateWeeklyLoad(lastWeek, maxHR, restingHR),
    [lastWeek, maxHR, restingHR]
  );

  const loadStatus: LoadStatus = useMemo(
    () => getLoadStatus(weeklyLoad, prevWeekLoad),
    [weeklyLoad, prevWeekLoad]
  );

  const loadLabel = useMemo(
    () => getWeeklyLoadLabel(weeklyLoad),
    [weeklyLoad]
  );

  // Recovery from the most recent activity
  const recovery: RecoveryEstimate = useMemo(() => {
    if (thisWeek.length === 0 && lastWeek.length === 0) {
      return { recovered: true, percentRecovered: 100, message: 'Fully recovered' };
    }

    // Find the most recent activity across all data
    const sorted = [...activities].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );

    if (sorted.length === 0) {
      return { recovered: true, percentRecovered: 100, message: 'Fully recovered' };
    }

    const latest = sorted[0];
    const endTime = latest.ended_at
      ? new Date(latest.ended_at)
      : new Date(latest.started_at);
    const hoursSince = (Date.now() - endTime.getTime()) / (1000 * 60 * 60);
    const lastLoad = calculateLoadFromActivity(latest, maxHR, restingHR);

    return estimateRecovery(lastLoad, hoursSince);
  }, [activities, thisWeek, lastWeek, maxHR, restingHR]);

  // Freshness
  const freshness: FreshnessResult = useMemo(
    () => getFreshness(last7, last28, maxHR, restingHR),
    [last7, last28, maxHR, restingHR]
  );

  // Trend arrow
  const trendArrow = useMemo(() => {
    if (prevWeekLoad <= 0) return { symbol: '--', label: 'New' };
    const ratio = weeklyLoad / prevWeekLoad;
    if (ratio > 1.05) return { symbol: '\u2191', label: 'Up' };
    if (ratio < 0.95) return { symbol: '\u2193', label: 'Down' };
    return { symbol: '\u2192', label: 'Flat' };
  }, [weeklyLoad, prevWeekLoad]);

  if (loading) {
    return (
      <Card style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.textMuted} />
          <Text style={styles.loadingText}>Loading training data...</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      {/* Header */}
      <Text style={styles.title}>TRAINING LOAD</Text>

      {/* Weekly load row */}
      <View style={styles.mainRow}>
        <View style={styles.loadValueContainer}>
          <Text style={styles.loadValue}>{weeklyLoad}</Text>
          <View style={[styles.loadBadge, { backgroundColor: loadLabel.color + '22' }]}>
            <View style={[styles.loadDot, { backgroundColor: loadLabel.color }]} />
            <Text style={[styles.loadBadgeText, { color: loadLabel.color }]}>
              {loadLabel.label}
            </Text>
          </View>
        </View>

        {/* Trend */}
        <View style={styles.trendContainer}>
          <Text style={[styles.trendArrow, { color: loadStatus.color }]}>
            {trendArrow.symbol}
          </Text>
          <Text style={styles.trendLabel}>vs last week</Text>
        </View>
      </View>

      {/* Status message */}
      <Text style={[styles.statusMessage, { color: loadStatus.color }]}>
        {loadStatus.message}
      </Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom row: Recovery + Freshness */}
      <View style={styles.bottomRow}>
        {/* Recovery */}
        <View style={styles.bottomItem}>
          <Text style={styles.bottomLabel}>RECOVERY</Text>
          <Text
            style={[
              styles.bottomValue,
              { color: recovery.recovered ? '#22C55E' : '#F59E0B' },
            ]}
          >
            {recovery.message}
          </Text>
        </View>

        {/* Freshness */}
        <View style={[styles.bottomItem, styles.bottomItemRight]}>
          <Text style={styles.bottomLabel}>FRESHNESS</Text>
          <Text
            style={[
              styles.bottomValue,
              {
                color:
                  freshness.score >= 5
                    ? '#22C55E'
                    : freshness.score >= -5
                    ? '#A1A1AA'
                    : '#F97316',
              },
            ]}
          >
            {freshness.score > 0 ? '+' : ''}{freshness.score}
          </Text>
        </View>
      </View>

      {/* Freshness advice */}
      <Text style={styles.adviceText}>{freshness.label}</Text>
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
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  title: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  loadValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadValue: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
  },
  loadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  loadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  loadBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  trendContainer: {
    alignItems: 'center',
  },
  trendArrow: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  trendLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  statusMessage: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  bottomRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  bottomItem: {
    flex: 1,
  },
  bottomItemRight: {
    alignItems: 'flex-end',
  },
  bottomLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  bottomValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  adviceText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
});
