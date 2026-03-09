import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import * as AchievementService from '@/src/services/achievement.service';
import * as NotificationService from '@/src/services/notification.service';
import { AchievementDefinition, UserAchievement } from '@/src/types/database';

export function useAchievements() {
  const { user } = useAuth();
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPopup, setPendingPopup] = useState<AchievementDefinition | null>(null);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [defs, uas] = await Promise.all([
        AchievementService.getDefinitions(),
        AchievementService.getUserAchievements(user.id),
      ]);
      setDefinitions(defs);
      setUserAchievements(uas);
    } catch (err) {
      console.warn('[useAchievements] Failed to load achievements:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [refresh]);

  const checkAndUnlock = useCallback(
    async (context: Parameters<typeof AchievementService.checkAchievements>[1]) => {
      if (!user) return;

      // Debounce checks to avoid hammering the DB
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

      checkTimeoutRef.current = setTimeout(async () => {
        try {
          const { newlyUnlocked } = await AchievementService.checkAchievements(
            user.id,
            context
          );

          if (newlyUnlocked.length > 0) {
            // Show popup for first unlocked achievement
            setPendingPopup(newlyUnlocked[0]);
            // Send notification for each unlocked achievement
            for (const achievement of newlyUnlocked) {
              NotificationService.sendAchievementNotification(
                achievement.title,
                achievement.xp_reward
              ).catch(() => {});
            }
            // Refresh the list
            await refresh();
          }
        } catch (err) {
          console.warn('[useAchievements] Achievement check failed:', err);
        }
      }, 1000);
    },
    [user, refresh]
  );

  const dismissPopup = useCallback(() => {
    setPendingPopup(null);
  }, []);

  const earnedCount = userAchievements.length;
  const totalCount = definitions.length;

  return {
    definitions,
    userAchievements,
    earnedCount,
    totalCount,
    isLoading,
    pendingPopup,
    checkAndUnlock,
    dismissPopup,
    refresh,
  };
}
