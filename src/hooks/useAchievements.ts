import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import * as AchievementService from '@/src/services/achievement.service';
import * as NotificationService from '@/src/services/notification.service';
import { useNotificationCenterContext } from '@/src/context/NotificationCenterContext';
import { AchievementDefinition, UserAchievement } from '@/src/types/database';

export function useAchievements() {
  const { user } = useAuth();
  const { addNotification } = useNotificationCenterContext();
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
            // Send a single batched push notification for all unlocked achievements
            if (newlyUnlocked.length === 1) {
              NotificationService.sendAchievementNotification(
                newlyUnlocked[0].title,
                newlyUnlocked[0].xp_reward
              ).catch(() => {});
            } else {
              const totalXP = newlyUnlocked.reduce((sum, a) => sum + a.xp_reward, 0);
              NotificationService.sendAchievementNotification(
                `${newlyUnlocked.length} achievements unlocked!`,
                totalXP
              ).catch(() => {});
            }
            // Add each to in-app notification center (these are silent, not push)
            for (const achievement of newlyUnlocked) {
              addNotification(
                'achievement',
                'Achievement Unlocked!',
                `${achievement.title}${achievement.xp_reward > 0 ? ` \u2022 +${achievement.xp_reward} XP` : ''}`,
                { achievementId: achievement.id }
              );
            }
            // Refresh the list
            await refresh();
          }
        } catch (err) {
          console.warn('[useAchievements] Achievement check failed:', err);
        }
      }, 1000);
    },
    [user, refresh, addNotification]
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
