import { supabase } from './supabase';
import * as XPService from './xp.service';
import { AchievementDefinition, UserAchievement } from '@/src/types/database';

export async function getDefinitions(): Promise<AchievementDefinition[]> {
  const { data, error } = await supabase
    .from('achievement_definitions')
    .select('*')
    .order('sort_order');

  if (error) {
    console.warn('[Achievements] getDefinitions failed:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.warn('[Achievements] getUserAchievements failed:', error.message);
    return [];
  }
  return data ?? [];
}

export async function unlockAchievement(
  userId: string,
  achievementId: string
): Promise<UserAchievement> {
  const { data, error } = await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_id: achievementId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markNotified(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_achievements')
    .update({ notified: true })
    .eq('id', id);

  if (error) throw error;
}

type AchievementContext = {
  todaySteps?: number;
  totalSteps?: number;
  currentStreak?: number;
  activityCount?: number;
  currentLevel?: number;
};

export async function checkAchievements(
  userId: string,
  context: AchievementContext
): Promise<{ newlyUnlocked: AchievementDefinition[] }> {
  const [definitions, userAchievements] = await Promise.all([
    getDefinitions(),
    getUserAchievements(userId),
  ]);

  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievement_id));
  const newlyUnlocked: AchievementDefinition[] = [];

  for (const def of definitions) {
    if (unlockedIds.has(def.id)) continue;

    let value = 0;
    switch (def.category) {
      case 'steps':
        // Check both daily and total steps thresholds
        if (def.id.includes('total')) {
          value = context.totalSteps ?? 0;
        } else {
          value = context.todaySteps ?? 0;
        }
        break;
      case 'streak':
        value = context.currentStreak ?? 0;
        break;
      case 'activity':
        value = context.activityCount ?? 0;
        break;
      case 'xp':
        value = context.currentLevel ?? 0;
        break;
    }

    if (value >= def.threshold) {
      try {
        await unlockAchievement(userId, def.id);
        newlyUnlocked.push(def);
        // Award XP reward for the achievement
        if (def.xp_reward && def.xp_reward > 0) {
          await XPService.addXP(
            userId,
            def.xp_reward,
            'bonus',
            def.id,
            `Achievement: ${def.title}`
          ).catch((xpErr) => {
            console.warn('[Achievements] XP award failed for', def.id, ':', xpErr);
          });
        }
      } catch (err) {
        // Expected: unique constraint violation = already unlocked (race condition)
        console.warn('[Achievements] Could not unlock', def.id, ':', err);
      }
    }
  }

  return { newlyUnlocked };
}
