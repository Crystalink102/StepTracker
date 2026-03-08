import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFriends } from '@/src/hooks/useFriends';
import FriendRequestCard from '@/src/components/social/FriendRequestCard';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

export default function FriendRequestsScreen() {
  const { pendingRequests, isLoading, acceptRequest, declineRequest, refresh } =
    useFriends();

  return (
    <View style={styles.container}>
      <FlatList
        data={pendingRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FriendRequestCard
            username={item.requester?.username ?? ''}
            displayName={item.requester?.display_name ?? null}
            avatarUrl={item.requester?.avatar_url ?? null}
            onAccept={() => acceptRequest(item.id)}
            onDecline={() => declineRequest(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
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
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 2,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
});
