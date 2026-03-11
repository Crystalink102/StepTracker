import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFriends } from '@/src/hooks/useFriends';
import { useToast } from '@/src/hooks/useToast';
import FriendRequestCard from '@/src/components/social/FriendRequestCard';
import { EmptyState } from '@/src/components/ui';
import { Colors, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

export default function FriendRequestsScreen() {
  const { colors } = useTheme();
  const { pendingRequests, isLoading, acceptRequest, declineRequest, refresh } =
    useFriends();
  const { showToast } = useToast();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleAccept = useCallback(async (id: string) => {
    if (processingIds.has(id)) return;
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await acceptRequest(id);
      showToast('Friend request accepted!', 'success');
    } catch (err) {
      console.warn('[Requests] Accept failed:', err);
    } finally {
      setProcessingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, [acceptRequest, processingIds, showToast]);

  const handleDecline = useCallback(async (id: string) => {
    if (processingIds.has(id)) return;
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await declineRequest(id);
      showToast('Request declined', 'info');
    } catch (err) {
      console.warn('[Requests] Decline failed:', err);
    } finally {
      setProcessingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, [declineRequest, processingIds, showToast]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={pendingRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FriendRequestCard
            username={item.requester?.username ?? ''}
            displayName={item.requester?.display_name ?? null}
            avatarUrl={item.requester?.avatar_url ?? null}
            onAccept={() => handleAccept(item.id)}
            onDecline={() => handleDecline(item.id)}
            isProcessing={processingIds.has(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="mail-outline"
            title="No Pending Requests"
            subtitle="Friend requests will appear here"
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
});
