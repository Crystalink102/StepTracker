import { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { checkAndUpdateStreak, getFreezeStatus } from '@/src/services/streak.service';
import * as AchievementService from '@/src/services/achievement.service';
import { useNotificationCenterContext } from '@/src/context/NotificationCenterContext';

export function useStreak() {
  const { user } = useAuth();
  const { addNotification } = useNotificationCenterContext();
  const [streak, setStreak] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [freezeUsed, setFreezeUsed] = useState(false);
  const [freezeAvailable, setFreezeAvailable] = useState(false);
  const [freezeEnabled, setFreezeEnabled] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Load freeze status
    getFreezeStatus()
      .then(({ available, enabled }) => {
        setFreezeAvailable(available);
        setFreezeEnabled(enabled);
      })
      .catch(() => {});

    checkAndUpdateStreak(user.id)
      .then((result) => {
        setStreak(result.streak);
        setShowPopup(result.showPopup);
        setFreezeUsed(result.freezeUsed);

        // If freeze was used, update freeze availability
        if (result.freezeUsed) {
          setFreezeAvailable(false);
        }

        // Add in-app notification when streak popup shows
        if (result.showPopup && result.streak > 0) {
          addNotification(
            'streak',
            `${result.streak}-Day Streak!`,
            result.freezeUsed
              ? `Streak freeze saved your ${result.streak}-day streak!`
              : `You're on a ${result.streak}-day streak. Keep it going!`
          );
        }

        // Check streak achievements
        if (result.streak > 0) {
          AchievementService.checkAchievements(user.id, {
            currentStreak: result.streak,
          }).catch(() => {});
        }
      })
      .catch((err) => {
        console.warn('[useStreak] Failed to check streak:', err);
      });
  }, [user]);

  const dismissPopup = () => setShowPopup(false);

  return {
    streak,
    showPopup,
    dismissPopup,
    freezeUsed,
    freezeAvailable,
    freezeEnabled,
  };
}
