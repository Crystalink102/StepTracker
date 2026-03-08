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
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: userId })
      .select()
      .single();

    if (insertError) throw insertError;
    return newProfile;
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
    'username' | 'display_name' | 'avatar_url' | 'resting_hr' | 'date_of_birth' | 'height_cm' | 'weight_kg'
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
