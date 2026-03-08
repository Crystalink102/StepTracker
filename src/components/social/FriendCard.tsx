import { View, Text, StyleSheet } from 'react-native';
import { Avatar, Badge } from '@/src/components/ui';
import { formatNumber } from '@/src/utils/formatters';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type FriendCardProps = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  todaySteps: number;
  streak: number;
};

export default function FriendCard({
  username,
  displayName,
  avatarUrl,
  level,
  todaySteps,
  streak,
}: FriendCardProps) {
  return (
    <View style={styles.container}>
      <Avatar uri={avatarUrl} name={displayName || username} size={48} />
      <View style={styles.info}>
        <Text style={styles.name}>{displayName || username}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>{formatNumber(todaySteps)} steps</Text>
          {streak > 0 && <Text style={styles.stat}>{streak}d streak</Text>}
        </View>
      </View>
      <Badge label={`Lv ${level}`} variant="primary" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 2,
  },
  stat: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
});
