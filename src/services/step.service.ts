import { supabase } from './supabase';
import { getTodayString } from '@/src/utils/date-helpers';

/**
 * Get or create today's step record.
 */
export async function getTodaySteps(userId: string) {
  const today = getTodayString();

  const { data, error } = await supabase
    .from('daily_steps')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error && error.code === 'PGRST116') {
    // No record for today, create one
    const { data: newRecord, error: insertError } = await supabase
      .from('daily_steps')
      .insert({ user_id: userId, date: today, step_count: 0, xp_earned: 0 })
      .select()
      .single();

    if (insertError) throw insertError;
    return newRecord;
  }

  if (error) throw error;
  return data;
}

/**
 * Update today's step count.
 */
export async function updateStepCount(
  userId: string,
  stepCount: number,
  xpEarned: number
) {
  const today = getTodayString();

  const { error } = await supabase
    .from('daily_steps')
    .upsert(
      {
        user_id: userId,
        date: today,
        step_count: stepCount,
        xp_earned: xpEarned,
      },
      { onConflict: 'user_id,date' }
    );

  if (error) throw error;
}

/**
 * Get step history for a date range.
 */
export async function getStepHistory(
  userId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from('daily_steps')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}
