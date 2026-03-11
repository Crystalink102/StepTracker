import { View, Text, StyleSheet } from 'react-native';
import { Avatar, Badge } from '@/src/components/ui';
import { formatNumber } from '@/src/utils/formatters';
import { useTheme } from '@/src/context/ThemeContext';
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
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Avatar uri={avatarUrl} name={displayName || username} size={48} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]}>{displayName || username}</Text>
        <View style={styles.statsRow}>
          <Text style={[styles.stat, { color: colors.textMuted }]}>{formatNumber(todaySteps)} steps</Text>
          {streak > 0 && <Text style={[styles.stat, { color: colors.textMuted }]}>{streak}d streak</Text>}
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
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 2,
  },
  stat: {
    fontSize: FontSize.sm,
  },
});
