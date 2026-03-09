import { supabase } from './supabase';
import { Friendship, UserSearchResult } from '@/src/types/database';
import { getTodayString } from '@/src/utils/date-helpers';

/**
 * Get all users visible to the current user. Simple, direct query.
 * Skips the RPC entirely — it's too restrictive (requires username not null).
 */
export async function getAllUsers(currentUserId?: string): Promise<UserSearchResult[]> {
  console.log('[Social] getAllUsers called, currentUserId:', currentUserId);

  // Step 1: Get ALL profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .order('created_at', { ascending: false })
    .limit(100);

  console.log('[Social] Profiles query result:', { count: profiles?.length, error: error?.message });

  if (error || !profiles) {
    console.warn('[Social] getAllUsers profiles query failed:', error?.message);
    return [];
  }

  // Step 2: Get friendship IDs to exclude (already friends/pending)
  let excludedIds = new Set<string>();
  if (currentUserId) {
    excludedIds.add(currentUserId);
    try {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id, status')
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

      for (const f of friendships ?? []) {
        if (f.status === 'pending' || f.status === 'accepted') {
          excludedIds.add(f.requester_id);
          excludedIds.add(f.addressee_id);
        }
      }
    } catch (err) {
      console.warn('[Social] Friendships query failed:', err);
      // Continue — just don't filter by friendship status
    }
  }

  console.log('[Social] Excluded IDs:', excludedIds.size, 'profiles total:', profiles.length);

  // Step 3: Filter and map
  const results = profiles
    .filter((p) => !excludedIds.has(p.id))
    .filter((p) => p.username || p.display_name) // Must have SOME name to display
    .map((p) => ({
      id: p.id,
      username: p.username ?? p.display_name ?? 'user',
      display_name: p.display_name,
      avatar_url: p.avatar_url,
    }));

  console.log('[Social] getAllUsers returning', results.length, 'users');
  return results as UserSearchResult[];
}

/**
 * Search users by username or display name.
 */
export async function searchUsers(query: string, currentUserId?: string): Promise<UserSearchResult[]> {
  if (!query.trim()) return getAllUsers(currentUserId);

  const sanitized = query.trim().replace(/[,.()"'\\%]/g, '');
  if (!sanitized) return getAllUsers(currentUserId);

  console.log('[Social] searchUsers called:', sanitized);

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`)
    .limit(50);

  console.log('[Social] Search result:', { count: profiles?.length, error: error?.message });

  if (error || !profiles) {
    console.warn('[Social] searchUsers query failed:', error?.message);
    return [];
  }

  // Filter out current user
  const results = profiles
    .filter((p) => p.id !== currentUserId)
    .map((p) => ({
      id: p.id,
      username: p.username ?? p.display_name ?? 'user',
      display_name: p.display_name,
      avatar_url: p.avatar_url,
    }));

  return results as UserSearchResult[];
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function acceptRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);

  if (error) throw error;
}

export async function declineRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);

  if (error) throw error;
}

export async function removeFriend(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  if (error) throw error;
}

export async function getPendingRequests(userId: string): Promise<
  (Friendship & { requester: { username: string; display_name: string | null; avatar_url: string | null } })[]
> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*, requester:profiles!friendships_requester_id_fkey(username, display_name, avatar_url)')
    .eq('addressee_id', userId)
    .eq('status', 'pending');

  if (error) throw error;
  // Supabase join types don't infer correctly for foreign key relationships -
  // the runtime data shape is correct but TS can't verify it from the schema.
  return (data ?? []) as unknown as (Friendship & { requester: { username: string; display_name: string | null; avatar_url: string | null } })[];
}

export async function getPendingCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('addressee_id', userId)
    .eq('status', 'pending');

  if (error) throw error;
  return count ?? 0;
}

export async function getFriends(userId: string): Promise<
  {
    friendshipId: string;
    friendId: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    current_level: number;
    today_steps: number;
    current_streak: number;
  }[]
> {
  // Get accepted friendships where user is either requester or addressee
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) throw error;
  if (!friendships || friendships.length === 0) return [];

  // Get friend IDs
  const friendIds = friendships.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );

  // Get friend profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, current_streak')
    .in('id', friendIds);

  if (profileError) throw profileError;

  // Get friend XP levels
  const { data: xpData } = await supabase
    .from('user_xp')
    .select('user_id, current_level')
    .in('user_id', friendIds);

  // Get today's steps
  const today = getTodayString();
  const { data: stepsData } = await supabase
    .from('daily_steps')
    .select('user_id, step_count')
    .in('user_id', friendIds)
    .eq('date', today);

  const xpMap = new Map((xpData ?? []).map((x) => [x.user_id, x.current_level]));
  const stepsMap = new Map((stepsData ?? []).map((s) => [s.user_id, s.step_count]));

  return (profiles ?? []).map((p) => {
    const friendship = friendships.find(
      (f) =>
        (f.requester_id === p.id && f.addressee_id === userId) ||
        (f.addressee_id === p.id && f.requester_id === userId)
    );
    return {
      friendshipId: friendship?.id ?? '',
      friendId: p.id,
      username: p.username ?? '',
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      current_level: xpMap.get(p.id) ?? 1,
      today_steps: stepsMap.get(p.id) ?? 0,
      current_streak: p.current_streak ?? 0,
    };
  });
}
