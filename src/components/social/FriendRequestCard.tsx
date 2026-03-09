import { View, Text, StyleSheet } from 'react-native';
import { Avatar, Button } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type FriendRequestCardProps = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  onAccept: () => void;
  onDecline: () => void;
  isProcessing?: boolean;
};

export default function FriendRequestCard({
  username,
  displayName,
  avatarUrl,
  onAccept,
  onDecline,
  isProcessing = false,
}: FriendRequestCardProps) {
  return (
    <View style={styles.container}>
      <Avatar uri={avatarUrl} name={displayName || username} size={48} />
      <View style={styles.info}>
        <Text style={styles.name}>{displayName || username}</Text>
        <Text style={styles.username}>@{username}</Text>
      </View>
      <View style={styles.actions}>
        <Button title="Accept" onPress={onAccept} variant="primary" style={styles.btn} disabled={isProcessing} isLoading={isProcessing} />
        <Button title="Decline" onPress={onDecline} variant="ghost" style={styles.btn} disabled={isProcessing} />
      </View>
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  btn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
