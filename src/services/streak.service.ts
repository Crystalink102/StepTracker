import { supabase } from './supabase';

type StreakResult = {
  streak: number;
  showPopup: boolean;
};

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getDateString(d);
}

export async function checkAndUpdateStreak(userId: string): Promise<StreakResult> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('current_streak, last_streak_date')
    .eq('id', userId)
    .single();

  if (error) throw error;

  const today = getDateString(new Date());
  const currentStreak = profile.current_streak ?? 0;
  const lastDate = profile.last_streak_date;

  // Already checked today - no popup
  if (lastDate === today) {
    return { streak: currentStreak, showPopup: false };
  }

  let newStreak: number;

  if (lastDate === getYesterday()) {
    // Streak continues
    newStreak = currentStreak + 1;
  } else {
    // Streak resets (first time or gap)
    newStreak = 1;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ current_streak: newStreak, last_streak_date: today })
    .eq('id', userId);

  if (updateError) throw updateError;

  return { streak: newStreak, showPopup: true };
}
