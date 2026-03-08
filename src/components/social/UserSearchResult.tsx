import { View, Text, StyleSheet } from 'react-native';
import { Avatar, Button } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type UserSearchResultProps = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  onAdd: () => void;
  added?: boolean;
};

export default function UserSearchResult({
  username,
  displayName,
  avatarUrl,
  onAdd,
  added = false,
}: UserSearchResultProps) {
  return (
    <View style={styles.container}>
      <Avatar uri={avatarUrl} name={displayName || username} size={44} />
      <View style={styles.info}>
        <Text style={styles.name}>{displayName || username}</Text>
        <Text style={styles.username}>@{username}</Text>
      </View>
      <Button
        title={added ? 'Sent' : 'Add'}
        onPress={onAdd}
        variant={added ? 'ghost' : 'primary'}
        disabled={added}
        style={styles.addBtn}
      />
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  username: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  addBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
