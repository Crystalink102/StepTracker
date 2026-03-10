import { useState, useCallback } from 'react';

export function useCelebration() {
  const [showConfetti, setShowConfetti] = useState(false);

  const celebrate = useCallback(() => {
    setShowConfetti(true);
  }, []);

  const onConfettiComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

  return { showConfetti, celebrate, onConfettiComplete };
}
