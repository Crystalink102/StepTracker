import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type StreakResult = {
  streak: number;
  showPopup: boolean;
  freezeUsed: boolean;
};

const FREEZE_AVAILABLE_KEY = 'streak_freeze_available';
const FREEZE_WEEK_KEY = 'streak_freeze_week';
const FREEZE_ENABLED_KEY = 'streak_freeze_enabled';

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

/** Returns the ISO week string (YYYY-Www) for a given date */
function getISOWeek(date: Date): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  // Set to nearest Thursday (ISO week starts Monday)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 6) / 7
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Check if the freeze should be reset (new ISO week = every Monday) */
async function checkAndResetFreeze(): Promise<boolean> {
  const currentWeek = getISOWeek(new Date());
  const storedWeek = await AsyncStorage.getItem(FREEZE_WEEK_KEY);

  if (storedWeek !== currentWeek) {
    // New week — reset freeze to available
    await AsyncStorage.setItem(FREEZE_WEEK_KEY, currentWeek);
    await AsyncStorage.setItem(FREEZE_AVAILABLE_KEY, 'true');
    return true;
  }

  const available = await AsyncStorage.getItem(FREEZE_AVAILABLE_KEY);
  return available === 'true';
}

export async function isFreezeEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(FREEZE_ENABLED_KEY);
  return val === 'true';
}

export async function setFreezeEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(FREEZE_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function getFreezeStatus(): Promise<{ available: boolean; enabled: boolean }> {
  const enabled = await isFreezeEnabled();
  if (!enabled) return { available: false, enabled: false };
  const available = await checkAndResetFreeze();
  return { available, enabled };
}

async function consumeFreeze(): Promise<void> {
  await AsyncStorage.setItem(FREEZE_AVAILABLE_KEY, 'false');
}

export async function checkAndUpdateStreak(userId: string): Promise<StreakResult> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('current_streak, last_streak_date, daily_step_goal')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('[Streak] Profile fetch failed:', error.message);
    return { streak: 0, showPopup: false, freezeUsed: false };
  }

  const today = getDateString(new Date());
  const yesterday = getYesterday();
  const currentStreak = profile.current_streak ?? 0;
  const lastDate = profile.last_streak_date;
  const goal = profile.daily_step_goal ?? 10000;

  // Already checked today - no popup
  if (lastDate === today) {
    return { streak: currentStreak, showPopup: false, freezeUsed: false };
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
  let freezeUsed = false;

  if (lastDate === yesterday && yesterdayGoalMet) {
    // Streak continues — yesterday's goal was met
    newStreak = currentStreak + 1;
  } else if (lastDate === yesterday) {
    // Opened yesterday but didn't meet goal — check for freeze
    const freezeEnabled = await isFreezeEnabled();
    if (freezeEnabled) {
      const freezeAvailable = await checkAndResetFreeze();
      if (freezeAvailable && currentStreak > 0) {
        // Use the freeze to preserve the streak
        await consumeFreeze();
        newStreak = currentStreak;
        freezeUsed = true;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
  } else {
    // Gap of 2+ days — check for freeze (only if the gap is exactly 2 days = missed one day)
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    const twoDaysAgo = getDateString(dayBeforeYesterday);

    if (lastDate === twoDaysAgo && currentStreak > 0) {
      const freezeEnabled = await isFreezeEnabled();
      if (freezeEnabled) {
        const freezeAvailable = await checkAndResetFreeze();
        if (freezeAvailable) {
          await consumeFreeze();
          newStreak = currentStreak;
          freezeUsed = true;
        } else {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
    } else {
      // Gap of 3+ days — streak resets regardless
      newStreak = 1;
    }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ current_streak: newStreak, last_streak_date: today })
    .eq('id', userId);

  if (updateError) throw updateError;

  return { streak: newStreak, showPopup: true, freezeUsed };
}
