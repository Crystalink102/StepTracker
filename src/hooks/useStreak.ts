import { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { checkAndUpdateStreak } from '@/src/services/streak.service';
import * as AchievementService from '@/src/services/achievement.service';

export function useStreak() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!user) return;

    checkAndUpdateStreak(user.id)
      .then((result) => {
        setStreak(result.streak);
        setShowPopup(result.showPopup);

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

  return { streak, showPopup, dismissPopup };
}
