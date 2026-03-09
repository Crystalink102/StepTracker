import { supabase } from './supabase';
import { Friendship, UserSearchResult } from '@/src/types/database';
import { getTodayString } from '@/src/utils/date-helpers';

/**
 * Fetch existing friend/pending user IDs so we can filter them out client-side.
 */
async function getExcludedUserIds(currentUserId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
    .in('status', ['pending', 'accepted']);

  const ids = new Set<string>();
  ids.add(currentUserId);
  for (const f of data ?? []) {
    ids.add(f.requester_id);
    ids.add(f.addressee_id);
  }
  return ids;
}

/**
 * Client-side fallback: fetch profiles directly, filter out friends.
 * Does NOT require username — shows all users with a username OR display_name.
 */
async function fetchProfilesFallback(
  currentUserId: string | undefined,
  query?: string
): Promise<UserSearchResult[]> {
  let qb = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url');

  if (query && query.length > 0) {
    const sanitized = query.replace(/[,.()"'\\%]/g, '');
    if (sanitized.length > 0) {
      // Search username and display_name — either can be set
      qb = qb.or(`username.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`);
    }
  }

  const { data: profiles, error: profileError } = await qb
    .order('created_at', { ascending: false })
    .limit(100);

  if (profileError) {
    console.warn('[Social] Profile query failed:', profileError.message);
    return [];
  }

  const excluded = currentUserId ? await getExcludedUserIds(currentUserId) : new Set<string>();
  return (profiles ?? [])
    .filter((p) => !excluded.has(p.id))
    .map((p) => ({
      id: p.id,
      username: p.username ?? p.display_name ?? 'user',
      display_name: p.display_name,
      avatar_url: p.avatar_url,
    })) as UserSearchResult[];
}

export async function searchUsers(query: string, currentUserId?: string): Promise<UserSearchResult[]> {
  // Try the RPC function first
  try {
    const { data, error } = await supabase.rpc('search_users', {
      search_query: query,
    });
    // Only use RPC result if it succeeded AND returned actual results
    if (!error && data && data.length > 0) return data;
    // If RPC returned empty, fall through to client-side (RPC might be too restrictive)
  } catch (err) {
    console.warn('[Social] search_users RPC error:', err);
  }

  // Client-side fallback — always works
  return fetchProfilesFallback(currentUserId, query);
}

export async function getAllUsers(currentUserId?: string): Promise<UserSearchResult[]> {
  // Try RPC with empty query first
  try {
    const { data, error } = await supabase.rpc('search_users', {
      search_query: '',
    });
    if (!error && data && data.length > 0) return data;
  } catch (err) {
    console.warn('[Social] getAllUsers RPC error:', err);
  }

  // Client-side fallback — fetch all profiles
  return fetchProfilesFallback(currentUserId);
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
