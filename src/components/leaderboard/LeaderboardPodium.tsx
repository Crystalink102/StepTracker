import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from '@/src/components/ui';
import { formatNumber } from '@/src/utils/formatters';
import { LeaderboardEntry } from '@/src/types/database';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type LeaderboardPodiumProps = {
  entries: LeaderboardEntry[];
};

const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
const PODIUM_HEIGHTS = [120, 90, 80];

function PodiumSpot({
  entry,
  rank,
}: {
  entry: LeaderboardEntry | undefined;
  rank: number;
}) {
  const { colors } = useTheme();

  if (!entry) return <View style={styles.spotEmpty} />;

  const color = PODIUM_COLORS[rank - 1] ?? colors.textMuted;
  const height = PODIUM_HEIGHTS[rank - 1] ?? 80;

  return (
    <View style={styles.spot}>
      <Avatar
        uri={entry.avatar_url}
        name={entry.display_name || entry.username}
        size={rank === 1 ? 56 : 44}
      />
      <Text style={[styles.spotName, { color: colors.textPrimary }]} numberOfLines={1}>
        {entry.display_name || entry.username}
      </Text>
      <Text style={[styles.spotValue, { color }]}>
        {formatNumber(entry.value)}
      </Text>
      <View
        style={[
          styles.pedestal,
          { height, backgroundColor: color + '20', borderColor: color },
        ]}
      >
        <Text style={[styles.rankText, { color }]}>{rank}</Text>
      </View>
    </View>
  );
}

export default function LeaderboardPodium({ entries }: LeaderboardPodiumProps) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  return (
    <View style={styles.container}>
      <PodiumSpot entry={second} rank={2} />
      <PodiumSpot entry={first} rank={1} />
      <PodiumSpot entry={third} rank={3} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  spot: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 120,
  },
  spotEmpty: {
    flex: 1,
    maxWidth: 120,
  },
  spotName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  spotValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  pedestal: {
    width: '100%',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  rankText: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
  },
});
