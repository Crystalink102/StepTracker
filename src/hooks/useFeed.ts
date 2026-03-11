import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import * as FeedService from '@/src/services/feed.service';
import type { FeedItem, CommentWithAuthor } from '@/src/services/feed.service';

const PAGE_SIZE = 20;

export function useFeed() {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const loadFeed = useCallback(
    async (reset = false) => {
      if (!user) return;

      const currentOffset = reset ? 0 : offsetRef.current;

      try {
        const items = await FeedService.getFeed(user.id, PAGE_SIZE, currentOffset);
        if (reset) {
          setFeedItems(items);
        } else {
          setFeedItems((prev) => [...prev, ...items]);
        }
        offsetRef.current = currentOffset + items.length;
        setHasMore(items.length >= PAGE_SIZE);
      } catch (err) {
        console.warn('[useFeed] loadFeed failed:', err);
      }
    },
    [user]
  );

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadFeed(true);
      setIsLoading(false);
    };
    init();
  }, [loadFeed]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    offsetRef.current = 0;
    await loadFeed(true);
    setIsRefreshing(false);
  }, [loadFeed]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || isRefreshing) return;
    await loadFeed(false);
  }, [hasMore, isLoading, isRefreshing, loadFeed]);

  /**
   * Optimistic like toggle. Instantly updates UI, reverts on error.
   */
  const toggleLike = useCallback(
    async (activityId: string) => {
      if (!user) return;

      // Read current liked state via ref-safe functional update
      let wasLiked = false;
      setFeedItems((items) => {
        const item = items.find((f) => f.id === activityId);
        if (!item) return items;
        wasLiked = item.has_liked;
        return items.map((f) =>
          f.id === activityId
            ? {
                ...f,
                has_liked: !wasLiked,
                like_count: wasLiked ? f.like_count - 1 : f.like_count + 1,
              }
            : f
        );
      });

      try {
        if (wasLiked) {
          await FeedService.unlikeActivity(user.id, activityId);
        } else {
          await FeedService.likeActivity(user.id, activityId);
        }
      } catch {
        // Revert on error using functional update (always has fresh state)
        setFeedItems((items) =>
          items.map((f) =>
            f.id === activityId
              ? {
                  ...f,
                  has_liked: wasLiked,
                  like_count: wasLiked ? f.like_count + 1 : f.like_count - 1,
                }
              : f
          )
        );
      }
    },
    [user]
  );

  /**
   * Add a comment and update comment count in the feed.
   */
  const addComment = useCallback(
    async (activityId: string, content: string): Promise<CommentWithAuthor | null> => {
      if (!user) return null;

      const comment = await FeedService.addComment(user.id, activityId, content);

      // Update comment count in feed
      setFeedItems((items) =>
        items.map((f) =>
          f.id === activityId
            ? { ...f, comment_count: f.comment_count + 1 }
            : f
        )
      );

      return comment;
    },
    [user]
  );

  /**
   * Delete a comment and update comment count in the feed.
   */
  const deleteComment = useCallback(
    async (commentId: string, activityId: string) => {
      await FeedService.deleteComment(commentId);

      setFeedItems((items) =>
        items.map((f) =>
          f.id === activityId
            ? { ...f, comment_count: Math.max(0, f.comment_count - 1) }
            : f
        )
      );
    },
    []
  );

  /**
   * Get comments for an activity.
   */
  const getComments = useCallback(
    async (activityId: string): Promise<CommentWithAuthor[]> => {
      return FeedService.getComments(activityId);
    },
    []
  );

  return {
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
  };
}
