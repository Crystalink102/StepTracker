import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import * as SocialService from '@/src/services/social.service';

type FriendData = Awaited<ReturnType<typeof SocialService.getFriends>>[number];
type PendingRequest = Awaited<ReturnType<typeof SocialService.getPendingRequests>>[number];

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [friendsList, pending, count] = await Promise.all([
        SocialService.getFriends(user.id),
        SocialService.getPendingRequests(user.id),
        SocialService.getPendingCount(user.id),
      ]);
      setFriends(friendsList);
      setPendingRequests(pending);
      setPendingCount(count);
    } catch (err) {
      console.warn('[useFriends] Failed to load friends:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendRequest = useCallback(
    async (addresseeId: string) => {
      if (!user) return;
      await SocialService.sendFriendRequest(user.id, addresseeId);
    },
    [user]
  );

  const acceptRequest = useCallback(
    async (friendshipId: string) => {
      await SocialService.acceptRequest(friendshipId);
      await refresh();
    },
    [refresh]
  );

  const declineRequest = useCallback(
    async (friendshipId: string) => {
      await SocialService.declineRequest(friendshipId);
      await refresh();
    },
    [refresh]
  );

  const removeFriend = useCallback(
    async (friendshipId: string) => {
      await SocialService.removeFriend(friendshipId);
      await refresh();
    },
    [refresh]
  );

  return {
    friends,
    pendingRequests,
    pendingCount,
    isLoading,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    refresh,
  };
}
