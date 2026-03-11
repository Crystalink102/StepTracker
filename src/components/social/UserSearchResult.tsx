import { View, Text, StyleSheet } from 'react-native';
import { Avatar, Button } from '@/src/components/ui';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type UserSearchResultProps = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  onAdd: () => void;
  added?: boolean;
  isAdding?: boolean;
};

export default function UserSearchResult({
  username,
  displayName,
  avatarUrl,
  onAdd,
  added = false,
  isAdding = false,
}: UserSearchResultProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Avatar uri={avatarUrl} name={displayName || username} size={44} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]}>{displayName || username}</Text>
        <Text style={[styles.username, { color: colors.textMuted }]}>@{username}</Text>
      </View>
      <Button
        title={added ? 'Sent' : 'Add'}
        onPress={onAdd}
        variant={added ? 'ghost' : 'primary'}
        disabled={added || isAdding}
        isLoading={isAdding}
        style={styles.addBtn}
      />
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  username: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  addBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
