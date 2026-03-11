import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import * as ChallengeService from '@/src/services/challenge.service';
import type { ChallengeDetailParticipant } from '@/src/services/challenge.service';
import type { Challenge } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import { formatDistance } from '@/src/utils/formatters';

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  steps: 'footsteps',
  distance: 'navigate',
  duration: 'timer',
  activities: 'fitness',
};

const TYPE_LABELS: Record<string, string> = {
  steps: 'Steps',
  distance: 'Distance',
  duration: 'Duration',
  activities: 'Activities',
};

function getDaysRemaining(endDate: string): number {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatTarget(type: string, value: number, distanceFmt: (m: number) => string): string {
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

function formatProgress(type: string, value: number, distanceFmt: (m: number) => string): string {
  switch (type) {
    case 'steps':
      return value.toLocaleString();
    case 'distance':
      return distanceFmt(value);
    case 'duration': {
      const hrs = Math.floor(value / 3600);
      const mins = Math.round((value % 3600) / 60);
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    }
    case 'activities':
      return `${value}`;
    default:
      return `${value}`;
  }
}

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const { preferences } = usePreferences();
  const distanceFmt = (m: number) => formatDistance(m, preferences.distanceUnit);

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<ChallengeDetailParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  const loadDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const result = await ChallengeService.getChallengeDetails(id);
      if (result) {
        setChallenge(result.challenge);
        setParticipants(result.participants);
      }
    } catch (err) {
      console.warn('[ChallengeDetail] load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleLeave = () => {
    if (!user || !challenge) return;
    Alert.alert('Leave Challenge', 'Are you sure you want to leave this challenge?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setIsLeaving(true);
          const ok = await ChallengeService.leaveChallenge(user.id, challenge.id);
          setIsLeaving(false);
          if (ok) router.back();
        },
      },
    ]);
  };

  if (isLoading) {
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

  const daysLeft = getDaysRemaining(challenge.end_date);
  const isCreator = user?.id === challenge.creator_id;
  const myParticipation = participants.find((p) => p.user_id === user?.id);
  const myProgress = myParticipation?.current_progress ?? 0;
  const myPct = Math.min(Math.round((myProgress / challenge.target_value) * 100), 100);

  // Sort participants by progress descending for leaderboard
  const sortedParticipants = [...participants].sort(
    (a, b) => b.current_progress - a.current_progress
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={loadDetails}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Challenge info header */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        <View style={styles.infoHeader}>
          <View style={[styles.typeTag, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons
              name={TYPE_ICONS[challenge.type] ?? 'help-circle'}
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.typeLabel}>
              {TYPE_LABELS[challenge.type] ?? challenge.type}
            </Text>
          </View>
          <View style={styles.statusTag}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: daysLeft > 0 ? '#22C55E' : colors.textMuted },
              ]}
            />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}
            </Text>
          </View>
        </View>

        <Text style={[styles.challengeTitle, { color: colors.textPrimary }]}>{challenge.title}</Text>
        {challenge.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]}>{challenge.description}</Text>
        ) : null}

        <View style={styles.targetRow}>
          <Ionicons name="flag" size={16} color={Colors.primary} />
          <Text style={[styles.targetText, { color: colors.textSecondary }]}>
            Target: {formatTarget(challenge.type, challenge.target_value, distanceFmt)}
          </Text>
        </View>
      </View>

      {/* Your Progress */}
      {myParticipation && (
        <View style={[styles.myProgressCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your Progress</Text>
          <View style={styles.myProgressRow}>
            <Text style={[styles.myProgressValue, { color: colors.textPrimary }]}>
              {formatProgress(challenge.type, myProgress, distanceFmt)}
            </Text>
            <Text style={[styles.myProgressOf, { color: colors.textMuted }]}>
              / {formatTarget(challenge.type, challenge.target_value, distanceFmt)}
            </Text>
          </View>
          <View style={[styles.bigProgressBar, { backgroundColor: colors.surfaceLight }]}>
            <View
              style={[
                styles.bigProgressFill,
                {
                  width: `${myPct}%`,
                  backgroundColor: myParticipation.completed
                    ? Colors.gold
                    : Colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.myProgressPct, { color: colors.textSecondary }]}>{myPct}% complete</Text>
          {myParticipation.completed && (
            <View style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
              <Text style={styles.completedLabel}>Challenge completed!</Text>
            </View>
          )}
        </View>
      )}

      {/* Leaderboard */}
      <View style={[styles.leaderboardSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Leaderboard</Text>
        {sortedParticipants.map((p, idx) => {
          const pct = Math.min(
            Math.round((p.current_progress / challenge.target_value) * 100),
            100
          );
          const displayName =
            p.profile.display_name ?? p.profile.username ?? 'User';
          const isMe = p.user_id === user?.id;

          return (
            <View
              key={p.id}
              style={[styles.leaderRow, { borderBottomColor: colors.surfaceLight }, isMe && { backgroundColor: colors.surfaceLight }]}
            >
              <Text style={[styles.rank, { color: colors.textMuted }]}>#{idx + 1}</Text>
              <View style={styles.leaderInfo}>
                <View style={styles.leaderNameRow}>
                  <Text
                    style={[
                      styles.leaderName,
                      { color: colors.textPrimary },
                      isMe && styles.leaderNameMe,
                    ]}
                    numberOfLines={1}
                  >
                    {displayName}
                    {isMe ? ' (You)' : ''}
                  </Text>
                  {p.completed && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={Colors.gold}
                    />
                  )}
                </View>
                <View style={[styles.leaderProgressBar, { backgroundColor: colors.background }]}>
                  <View
                    style={[
                      styles.leaderProgressFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: p.completed
                          ? Colors.gold
                          : Colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.leaderValue, { color: colors.textSecondary }]}>
                {formatProgress(challenge.type, p.current_progress, distanceFmt)}
              </Text>
            </View>
          );
        })}

        {sortedParticipants.length === 0 && (
          <Text style={[styles.emptyLeaderboard, { color: colors.textMuted }]}>No participants yet</Text>
        )}
      </View>

      {/* Leave button (if not creator) */}
      {myParticipation && !isCreator && (
        <TouchableOpacity
          style={[styles.leaveBtn, { borderColor: colors.danger }]}
          onPress={handleLeave}
          disabled={isLeaving}
          activeOpacity={0.7}
        >
          {isLeaving ? (
            <ActivityIndicator color={colors.danger} size="small" />
          ) : (
            <Text style={[styles.leaveBtnText, { color: colors.danger }]}>Leave Challenge</Text>
          )}
        </TouchableOpacity>
      )}
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
  // ─── Info Card ──────
  infoCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  typeLabel: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  challengeTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: FontSize.md,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  // ─── My Progress ──────
  myProgressCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  myProgressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  myProgressValue: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
  },
  myProgressOf: {
    fontSize: FontSize.md,
    marginLeft: Spacing.xs,
  },
  bigProgressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  bigProgressFill: {
    height: '100%',
    borderRadius: 6,
  },
  myProgressPct: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  completedLabel: {
    color: Colors.gold,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  // ─── Leaderboard ──────
  leaderboardSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  leaderRowMe: {
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  rank: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    width: 30,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  leaderName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  leaderNameMe: {
    color: Colors.primary,
  },
  leaderProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  leaderProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  leaderValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    minWidth: 50,
    textAlign: 'right',
  },
  emptyLeaderboard: {
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  // ─── Leave ──────
  leaveBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  leaveBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
