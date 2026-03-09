import { supabase } from './supabase';

type StreakResult = {
  streak: number;
  showPopup: boolean;
};

function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getDateString(d);
}

export async function checkAndUpdateStreak(userId: string): Promise<StreakResult> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('current_streak, last_streak_date, daily_step_goal')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('[Streak] Profile fetch failed:', error.message);
    return { streak: 0, showPopup: false };
  }

  const today = getDateString(new Date());
  const yesterday = getYesterday();
  const currentStreak = profile.current_streak ?? 0;
  const lastDate = profile.last_streak_date;
  const goal = profile.daily_step_goal ?? 10000;

  // Already checked today - no popup
  if (lastDate === today) {
    return { streak: currentStreak, showPopup: false };
  }

  // Check if yesterday's step goal was met (for streak continuation)
  let yesterdayGoalMet = false;
  if (lastDate === yesterday) {
    const { data: yesterdaySteps } = await supabase
      .from('daily_steps')
      .select('step_count')
      .eq('user_id', userId)
      .eq('date', yesterday)
      .single();

    yesterdayGoalMet = (yesterdaySteps?.step_count ?? 0) >= goal;
  }

  let newStreak: number;

  if (lastDate === yesterday && yesterdayGoalMet) {
    // Streak continues — yesterday's goal was met
    newStreak = currentStreak + 1;
  } else if (lastDate === yesterday) {
    // Opened yesterday but didn't meet goal — streak resets
    newStreak = 1;
  } else {
    // Gap of 2+ days — streak resets
    newStreak = 1;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ current_streak: newStreak, last_streak_date: today })
    .eq('id', userId);

  if (updateError) throw updateError;

  return { streak: newStreak, showPopup: true };
}
