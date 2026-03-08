import { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { checkAndUpdateStreak } from '@/src/services/streak.service';

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
      })
      .catch(() => {
        // Silently fail - columns might not exist yet
      });
  }, [user]);

  const dismissPopup = () => setShowPopup(false);

  return { streak, showPopup, dismissPopup };
}
