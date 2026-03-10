import { supabase } from './supabase';
import { Profile } from '@/src/types/database';

/**
 * Get the current user's profile. Creates one if it doesn't exist.
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No profile row - create one
    try {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId })
        .select()
        .single();

      if (insertError) throw insertError;
      return newProfile;
    } catch (insertErr) {
      console.warn('[Profile] Insert failed, returning defaults:', insertErr);
      // Return a default profile so the app doesn't break
      return {
        id: userId,
        username: null,
        display_name: null,
        avatar_url: null,
        resting_hr: 70,
        date_of_birth: null,
        height_cm: null,
        weight_kg: null,
        bio: null,
        current_streak: 0,
        last_streak_date: null,
        daily_step_goal: 10000,
        push_token: null,
        notify_daily_reminder: true,
        notify_streak_warning: true,
        notify_achievements: true,
        notify_friend_requests: true,
        notify_weekly_summary: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  if (error) throw error;
  return data;
}

/**
 * Update the current user's profile. Uses upsert so it works even if row doesn't exist yet.
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<
    Profile,
    | 'username'
    | 'display_name'
    | 'avatar_url'
    | 'resting_hr'
    | 'date_of_birth'
    | 'height_cm'
    | 'weight_kg'
    | 'bio'
    | 'daily_step_goal'
    | 'push_token'
    | 'notify_daily_reminder'
    | 'notify_streak_warning'
    | 'notify_achievements'
    | 'notify_friend_requests'
    | 'notify_weekly_summary'
  >>
) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates })
    .select()
    .single();

  if (error) throw error;
  return data;
}
