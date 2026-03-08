import { supabase } from './supabase';
import { levelFromTotalXP } from '@/src/utils/xp-calculator';

/**
 * Get current user XP state.
 */
export async function getUserXP(userId: string) {
  const { data, error } = await supabase
    .from('user_xp')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No XP row - create one
    const { data: newXP, error: insertError } = await supabase
      .from('user_xp')
      .insert({ user_id: userId, total_xp: 0, current_level: 1 })
      .select()
      .single();

    if (insertError) throw insertError;
    return newXP;
  }

  if (error) throw error;
  return data;
}

/**
 * Add XP and update level.
 */
export async function addXP(
  userId: string,
  amount: number,
  source: 'steps' | 'activity' | 'bonus',
  sourceId?: string,
  description?: string
) {
  // Insert ledger entry
  const { error: ledgerError } = await supabase.from('xp_ledger').insert({
    user_id: userId,
    source,
    source_id: sourceId ?? null,
    amount,
    description: description ?? null,
  });
  if (ledgerError) throw ledgerError;

  // Get current XP
  const current = await getUserXP(userId);
  const newTotal = current.total_xp + amount;
  const newLevel = levelFromTotalXP(newTotal);

  // Update aggregate
  const { error: updateError } = await supabase
    .from('user_xp')
    .update({
      total_xp: newTotal,
      current_level: newLevel,
    })
    .eq('user_id', userId);

  if (updateError) throw updateError;

  return {
    totalXP: newTotal,
    level: newLevel,
    leveledUp: newLevel > current.current_level,
  };
}

/**
 * Get XP ledger history.
 */
export async function getXPHistory(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('xp_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
