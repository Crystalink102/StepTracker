import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { usePreferences } from '@/src/context/PreferencesContext';
import { formatDistance } from '@/src/utils/formatters';
import type { ChallengeWithParticipants } from '@/src/services/challenge.service';

type Props = {
  challenge: ChallengeWithParticipants;
  variant?: 'active' | 'available';
  onJoin?: () => void;
};

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
    case 'duration':
      return `${Math.round(value / 60)} min`;
    case 'activities':
      return `${value} activities`;
    default:
      return `${value}`;
  }
}

export default function ChallengeCard({ challenge, variant = 'active', onJoin }: Props) {
  const router = useRouter();
  const { preferences } = usePreferences();
  const distanceFmt = (m: number) => formatDistance(m, preferences.distanceUnit);
  const daysLeft = getDaysRemaining(challenge.end_date);
  const progress = variant === 'active' && challenge.my_progress != null
    ? Math.min(challenge.my_progress / challenge.target_value, 1)
    : 0;
  const progressPct = Math.round(progress * 100);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/challenges/${challenge.id}` as any)}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.typeTag}>
          <Ionicons
            name={TYPE_ICONS[challenge.type] ?? 'help-circle'}
            size={14}
            color={Colors.primary}
          />
          <Text style={styles.typeLabel}>{TYPE_LABELS[challenge.type] ?? challenge.type}</Text>
        </View>
        <Text style={styles.daysLeft}>
          {daysLeft > 0 ? `${daysLeft}d left` : 'Ended'}
        </Text>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={1}>
        {challenge.title}
      </Text>

      {/* Target */}
      <Text style={styles.target}>
        Goal: {formatTarget(challenge.type, challenge.target_value, distanceFmt)}
      </Text>

      {/* Progress bar (active only) */}
      {variant === 'active' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPct}%`,
                  backgroundColor: challenge.my_completed
                    ? Colors.gold
                    : Colors.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{progressPct}%</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.participantBadge}>
          <Ionicons name="people" size={14} color={Colors.textMuted} />
          <Text style={styles.participantCount}>
            {challenge.participant_count}
          </Text>
        </View>

        {variant === 'available' && onJoin && (
          <TouchableOpacity style={styles.joinBtn} onPress={onJoin}>
            <Text style={styles.joinText}>Join</Text>
          </TouchableOpacity>
        )}

        {variant === 'active' && challenge.my_completed && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  typeLabel: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
  },
  daysLeft: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  target: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    minWidth: 36,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantCount: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  joinBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
  },
  joinText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    color: Colors.gold,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
