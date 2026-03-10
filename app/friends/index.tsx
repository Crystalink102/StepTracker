import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useFriends } from '@/src/hooks/useFriends';
import FriendCard from '@/src/components/social/FriendCard';
import { Badge, EmptyState } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

export default function FriendsScreen() {
  const router = useRouter();
  const { friends, pendingCount, isLoading, refresh } = useFriends();

  return (
    <View style={styles.container}>
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/friends/search' as any)}
        >
          <Text style={styles.actionText}>Search</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/friends/requests' as any)}
        >
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>Requests</Text>
            {pendingCount > 0 && <Badge label={`${pendingCount}`} variant="primary" />}
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={friends}
        keyExtractor={(item) => item.friendshipId}
        renderItem={({ item }) => (
          <FriendCard
            username={item.username}
            displayName={item.display_name}
            avatarUrl={item.avatar_url}
            level={item.current_level}
            todaySteps={item.today_steps}
            streak={item.current_streak}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="person-add-outline"
            title="No Friends Yet"
            subtitle="Search for people to connect with"
            action={{
              label: 'Search Users',
              onPress: () => router.push('/friends/search' as any),
            }}
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
    backgroundColor: Colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
});
