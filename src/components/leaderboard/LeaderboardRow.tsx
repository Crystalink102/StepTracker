import { View, Text, StyleSheet } from 'react-native';
import { Avatar, Badge } from '@/src/components/ui';
import { formatNumber } from '@/src/utils/formatters';
import { LeaderboardEntry } from '@/src/types/database';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type LeaderboardRowProps = {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
};

export default function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        isCurrentUser && [styles.highlighted, { backgroundColor: Colors.primaryDark + '30', borderColor: Colors.primary }],
      ]}
    >
      <Text style={[styles.rank, { color: colors.textMuted }]}>{entry.rank}</Text>
      <Avatar
        uri={entry.avatar_url}
        name={entry.display_name || entry.username}
        size={40}
      />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {entry.display_name || entry.username}
          {isCurrentUser ? ' (You)' : ''}
        </Text>
      </View>
      <Text style={styles.value}>{formatNumber(entry.value)}</Text>
      <Badge label={`Lv ${entry.current_level}`} variant="muted" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  highlighted: {
    borderWidth: 1,
  },
  rank: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    width: 28,
    textAlign: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  value: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
