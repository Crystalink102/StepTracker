import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFeed } from '@/src/hooks/useFeed';
import { getRoutesForActivities } from '@/src/services/activity.service';
import FeedCard from '@/src/components/feed/FeedCard';
import CommentSheet from '@/src/components/feed/CommentSheet';
import { EmptyState } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import type { FeedItem } from '@/src/services/feed.service';

type Coord = { latitude: number; longitude: number };

export default function FeedScreen() {
  const router = useRouter();
  const {
    feedItems,
    isLoading,
    isRefreshing,
    hasMore,
    refresh,
    loadMore,
    toggleLike,
    addComment,
    deleteComment,
    getComments,
  } = useFeed();

  const [routes, setRoutes] = useState<Record<string, Coord[]>>({});
  const [commentActivityId, setCommentActivityId] = useState<string | null>(null);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);

  // Load routes for current feed items
  useEffect(() => {
    if (feedItems.length === 0) return;
    const ids = feedItems.map((f) => f.id);
    getRoutesForActivities(ids)
      .then(setRoutes)
      .catch(() => {});
  }, [feedItems]);

  const openComments = useCallback((activityId: string) => {
    setCommentActivityId(activityId);
    setCommentSheetVisible(true);
  }, []);

  const closeComments = useCallback(() => {
    setCommentSheetVisible(false);
    setCommentActivityId(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <FeedCard
        item={item}
        route={routes[item.id]}
        onLike={() => toggleLike(item.id)}
        onComment={() => openComments(item.id)}
      />
    ),
    [routes, toggleLike, openComments]
  );

  const renderFooter = useCallback(() => {
    if (!hasMore || feedItems.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }, [hasMore, feedItems.length]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <EmptyState
        icon="people-outline"
        title="Your Feed is Empty"
        subtitle="Add friends to see their activities here"
        action={{
          label: 'Find Friends',
          onPress: () => router.push('/friends' as any),
        }}
      />
    );
  }, [isLoading, router]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Text style={styles.screenTitle}>Feed</Text>
        </View>
        <View style={styles.loadingContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Text style={styles.screenTitle}>Feed</Text>
      </View>

      <FlatList
        data={feedItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={[
          styles.listContent,
          feedItems.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      />

      <CommentSheet
        visible={commentSheetVisible}
        activityId={commentActivityId}
        onClose={closeComments}
        onAddComment={addComment}
        onDeleteComment={deleteComment}
        getComments={getComments}
      />
    </SafeAreaView>
  );
}

/**
 * Loading skeleton placeholder for feed cards.
 */
function SkeletonCard() {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.header}>
        <View style={skeletonStyles.avatar} />
        <View style={skeletonStyles.headerLines}>
          <View style={[skeletonStyles.line, { width: 120 }]} />
          <View style={[skeletonStyles.line, { width: 60, height: 10 }]} />
        </View>
      </View>
      <View style={[skeletonStyles.line, { width: 140, height: 28, marginBottom: 12 }]} />
      <View style={skeletonStyles.statsRow}>
        <View style={[skeletonStyles.line, { width: 70 }]} />
        <View style={[skeletonStyles.line, { width: 80 }]} />
        <View style={[skeletonStyles.line, { width: 60 }]} />
      </View>
      <View style={skeletonStyles.actionBar}>
        <View style={[skeletonStyles.line, { width: 40 }]} />
        <View style={[skeletonStyles.line, { width: 40 }]} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
  },
  headerLines: {
    gap: 6,
  },
  line: {
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.surfaceLight,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  screenTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  loadingContainer: {
    flex: 1,
    paddingTop: Spacing.sm,
  },
  listContent: {
    paddingBottom: Spacing.xxxl,
  },
  listContentEmpty: {
    flex: 1,
  },
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
});
