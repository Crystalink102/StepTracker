export { ErrorBoundary } from '@/src/components/ui/TabErrorBoundary';

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
import { useTheme } from '@/src/context/ThemeContext';
import type { FeedItem } from '@/src/services/feed.service';

type Coord = { latitude: number; longitude: number };

export default function FeedScreen() {
  const { colors } = useTheme();
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
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Feed</Text>
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerBar}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Feed</Text>
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
  const { colors } = useTheme();
  return (
    <View style={[skeletonStyles.card, { backgroundColor: colors.surface }]}>
      <View style={skeletonStyles.header}>
        <View style={[skeletonStyles.avatar, { backgroundColor: colors.surfaceLight }]} />
        <View style={skeletonStyles.headerLines}>
          <View style={[skeletonStyles.line, { width: 120, backgroundColor: colors.surfaceLight }]} />
          <View style={[skeletonStyles.line, { width: 60, height: 10, backgroundColor: colors.surfaceLight }]} />
        </View>
      </View>
      <View style={[skeletonStyles.line, { width: 140, height: 28, marginBottom: 12, backgroundColor: colors.surfaceLight }]} />
      <View style={skeletonStyles.statsRow}>
        <View style={[skeletonStyles.line, { width: 70, backgroundColor: colors.surfaceLight }]} />
        <View style={[skeletonStyles.line, { width: 80, backgroundColor: colors.surfaceLight }]} />
        <View style={[skeletonStyles.line, { width: 60, backgroundColor: colors.surfaceLight }]} />
      </View>
      <View style={[skeletonStyles.actionBar, { borderTopColor: colors.border }]}>
        <View style={[skeletonStyles.line, { width: 40, backgroundColor: colors.surfaceLight }]} />
        <View style={[skeletonStyles.line, { width: 40, backgroundColor: colors.surfaceLight }]} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
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
  },
  headerLines: {
    gap: 6,
  },
  line: {
    height: 14,
    borderRadius: 7,
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
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  screenTitle: {
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
