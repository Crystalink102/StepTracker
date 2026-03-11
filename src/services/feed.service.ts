import { supabase } from './supabase';
import { Activity, ActivityComment } from '@/src/types/database';

export type FeedItem = Activity & {
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  like_count: number;
  comment_count: number;
  has_liked: boolean;
};

export type CommentWithAuthor = ActivityComment & {
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

/**
 * Get friend IDs for a user (accepted friendships only).
 */
async function getFriendIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) {
    console.warn('[Feed] getFriendIds failed:', error.message);
    return [];
  }

  return (data ?? []).map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );
}

/**
 * Fetch friends' completed activities with profile info, like counts, and comment counts.
 */
export async function getFeed(
  userId: string,
  limit = 20,
  offset = 0
): Promise<FeedItem[]> {
  try {
    const friendIds = await getFriendIds(userId);
    if (friendIds.length === 0) return [];

    // Get completed activities from friends
    const { data: activities, error: actError } = await supabase
      .from('activities')
      .select('*')
      .in('user_id', friendIds)
      .eq('status', 'completed')
      .neq('privacy', 'private')
      .order('ended_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (actError) {
      console.warn('[Feed] getFeed activities failed:', actError.message);
      return [];
    }
    if (!activities || activities.length === 0) return [];

    const activityIds = activities.map((a) => a.id);
    const authorIds = [...new Set(activities.map((a) => a.user_id))];

    // Fetch profiles, like counts, user likes, and comment counts in parallel
    const [profilesResult, likeCounts, userLikes, commentCounts] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', authorIds),
      getLikeCounts(activityIds),
      getUserLikes(userId, activityIds),
      getCommentCounts(activityIds),
    ]);

    const profileMap = new Map(
      (profilesResult.data ?? []).map((p) => [p.id, p])
    );

    return activities.map((activity) => {
      const profile = profileMap.get(activity.user_id);
      return {
        ...activity,
        author: {
          id: activity.user_id,
          username: profile?.username ?? 'user',
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
        },
        like_count: likeCounts.get(activity.id) ?? 0,
        comment_count: commentCounts.get(activity.id) ?? 0,
        has_liked: userLikes.has(activity.id),
      };
    });
  } catch (err) {
    console.warn('[Feed] getFeed failed:', err);
    return [];
  }
}

/**
 * Get like counts for a set of activity IDs.
 * Returns a Map of activity_id → count.
 */
async function getLikeCounts(activityIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const { data, error } = await supabase
      .from('activity_likes')
      .select('activity_id')
      .in('activity_id', activityIds);

    if (error) throw error;

    for (const row of data ?? []) {
      map.set(row.activity_id, (map.get(row.activity_id) ?? 0) + 1);
    }
  } catch {
    // Table may not exist yet — return empty counts
  }
  return map;
}

/**
 * Get which activities the current user has liked.
 */
async function getUserLikes(userId: string, activityIds: string[]): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    const { data, error } = await supabase
      .from('activity_likes')
      .select('activity_id')
      .eq('user_id', userId)
      .in('activity_id', activityIds);

    if (error) throw error;

    for (const row of data ?? []) {
      set.add(row.activity_id);
    }
  } catch {
    // Table may not exist yet
  }
  return set;
}

/**
 * Get comment counts for a set of activity IDs.
 */
async function getCommentCounts(activityIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const { data, error } = await supabase
      .from('activity_comments')
      .select('activity_id')
      .in('activity_id', activityIds);

    if (error) throw error;

    for (const row of data ?? []) {
      map.set(row.activity_id, (map.get(row.activity_id) ?? 0) + 1);
    }
  } catch {
    // Table may not exist yet
  }
  return map;
}

/**
 * Like an activity.
 */
export async function likeActivity(userId: string, activityId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('activity_likes')
      .insert({ user_id: userId, activity_id: activityId });

    if (error) throw error;
  } catch (err) {
    console.warn('[Feed] likeActivity failed:', err);
    throw err;
  }
}

/**
 * Unlike an activity.
 */
export async function unlikeActivity(userId: string, activityId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('activity_likes')
      .delete()
      .eq('user_id', userId)
      .eq('activity_id', activityId);

    if (error) throw error;
  } catch (err) {
    console.warn('[Feed] unlikeActivity failed:', err);
    throw err;
  }
}

/**
 * Get comments for an activity with author profiles.
 */
export async function getComments(
  activityId: string,
  limit = 50
): Promise<CommentWithAuthor[]> {
  try {
    const { data: comments, error } = await supabase
      .from('activity_comments')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    if (!comments || comments.length === 0) return [];

    const authorIds = [...new Set(comments.map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', authorIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p])
    );

    return comments.map((comment) => {
      const profile = profileMap.get(comment.user_id);
      return {
        ...comment,
        author: {
          id: comment.user_id,
          username: profile?.username ?? 'user',
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
        },
      };
    });
  } catch (err) {
    console.warn('[Feed] getComments failed:', err);
    return [];
  }
}

/**
 * Add a comment to an activity.
 */
export async function addComment(
  userId: string,
  activityId: string,
  content: string
): Promise<CommentWithAuthor | null> {
  try {
    const { data, error } = await supabase
      .from('activity_comments')
      .insert({ user_id: userId, activity_id: activityId, content })
      .select()
      .single();

    if (error) throw error;

    // Fetch the author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', userId)
      .single();

    return {
      ...data,
      author: {
        id: userId,
        username: profile?.username ?? 'user',
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      },
    };
  } catch (err) {
    console.warn('[Feed] addComment failed:', err);
    throw err;
  }
}

/**
 * Delete a comment (own comments only).
 */
export async function deleteComment(commentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('activity_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  } catch (err) {
    console.warn('[Feed] deleteComment failed:', err);
    throw err;
  }
}
