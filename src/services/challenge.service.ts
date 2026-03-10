import { supabase } from './supabase';
import type { Challenge, ChallengeParticipant } from '@/src/types/database';

// ─── Helpers ────────────────────────────────────────────────────────
// The challenges / challenge_participants tables may not be in the
// generated Database type yet, so we access them via `any` cast.
const challenges = () => (supabase as any).from('challenges');
const participants = () => (supabase as any).from('challenge_participants');

// ─── Types ──────────────────────────────────────────────────────────
type CreateChallengeInput = {
  title: string;
  description?: string;
  type: Challenge['type'];
  target_value: number;
  start_date: string;
  end_date: string;
};

export type ChallengeWithParticipants = Challenge & {
  participant_count: number;
  my_progress?: number;
  my_completed?: boolean;
};

export type ChallengeDetailParticipant = ChallengeParticipant & {
  profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
};

// ─── Create ─────────────────────────────────────────────────────────
export async function createChallenge(
  userId: string,
  input: CreateChallengeInput
): Promise<Challenge | null> {
  try {
    const { data: challenge, error } = await challenges()
      .insert({
        creator_id: userId,
        title: input.title,
        description: input.description ?? '',
        type: input.type,
        target_value: input.target_value,
        start_date: input.start_date,
        end_date: input.end_date,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.warn('[Challenge] createChallenge failed:', error.message);
      return null;
    }

    // Auto-join creator as first participant
    await participants().insert({
      challenge_id: challenge.id,
      user_id: userId,
      current_progress: 0,
      completed: false,
    });

    return challenge as Challenge;
  } catch (err) {
    console.warn('[Challenge] createChallenge error:', err);
    return null;
  }
}

// ─── Join ───────────────────────────────────────────────────────────
export async function joinChallenge(
  userId: string,
  challengeId: string
): Promise<boolean> {
  try {
    const { error } = await participants().insert({
      challenge_id: challengeId,
      user_id: userId,
      current_progress: 0,
      completed: false,
    });

    if (error) {
      console.warn('[Challenge] joinChallenge failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Challenge] joinChallenge error:', err);
    return false;
  }
}

// ─── Leave ──────────────────────────────────────────────────────────
export async function leaveChallenge(
  userId: string,
  challengeId: string
): Promise<boolean> {
  try {
    const { error } = await participants()
      .delete()
      .eq('challenge_id', challengeId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Challenge] leaveChallenge failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Challenge] leaveChallenge error:', err);
    return false;
  }
}

// ─── Active challenges (ones user is in) ────────────────────────────
export async function getActiveChallenges(
  userId: string
): Promise<ChallengeWithParticipants[]> {
  try {
    // Get challenge IDs user is participating in
    const { data: participations, error: pErr } = await participants()
      .select('challenge_id, current_progress, completed')
      .eq('user_id', userId);

    if (pErr || !participations?.length) return [];

    const challengeIds = (participations as any[]).map((p: any) => p.challenge_id);

    // Get the actual challenges
    const { data: challengeRows, error: cErr } = await challenges()
      .select('*')
      .in('id', challengeIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (cErr || !challengeRows?.length) return [];

    // Get participant counts for each challenge
    const { data: allParticipants } = await participants()
      .select('challenge_id')
      .in('challenge_id', challengeIds);

    const countMap = new Map<string, number>();
    ((allParticipants ?? []) as any[]).forEach((p: any) => {
      countMap.set(p.challenge_id, (countMap.get(p.challenge_id) ?? 0) + 1);
    });

    const progressMap = new Map(
      (participations as any[]).map((p: any) => [p.challenge_id, p])
    );

    return (challengeRows as Challenge[]).map((c) => ({
      ...c,
      participant_count: countMap.get(c.id) ?? 1,
      my_progress: (progressMap.get(c.id) as any)?.current_progress ?? 0,
      my_completed: (progressMap.get(c.id) as any)?.completed ?? false,
    }));
  } catch (err) {
    console.warn('[Challenge] getActiveChallenges error:', err);
    return [];
  }
}

// ─── Available challenges (from friends, not joined) ────────────────
export async function getAvailableChallenges(
  userId: string
): Promise<ChallengeWithParticipants[]> {
  try {
    // Get friend IDs
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (!friendships?.length) return [];

    const friendIds = friendships.map((f) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    );

    // Get active challenges created by friends
    const { data: challengeRows, error: cErr } = await challenges()
      .select('*')
      .in('creator_id', friendIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (cErr || !challengeRows?.length) return [];

    // Get challenges user is already in
    const { data: myParticipations } = await participants()
      .select('challenge_id')
      .eq('user_id', userId);

    const joinedIds = new Set(
      ((myParticipations ?? []) as any[]).map((p: any) => p.challenge_id)
    );

    // Filter out already-joined
    const available = (challengeRows as Challenge[]).filter(
      (c) => !joinedIds.has(c.id)
    );

    if (!available.length) return [];

    // Get participant counts
    const availableIds = available.map((c) => c.id);
    const { data: allParticipants } = await participants()
      .select('challenge_id')
      .in('challenge_id', availableIds);

    const countMap = new Map<string, number>();
    ((allParticipants ?? []) as any[]).forEach((p: any) => {
      countMap.set(p.challenge_id, (countMap.get(p.challenge_id) ?? 0) + 1);
    });

    return available.map((c) => ({
      ...c,
      participant_count: countMap.get(c.id) ?? 1,
    }));
  } catch (err) {
    console.warn('[Challenge] getAvailableChallenges error:', err);
    return [];
  }
}

// ─── Challenge detail ───────────────────────────────────────────────
export async function getChallengeDetails(
  challengeId: string
): Promise<{
  challenge: Challenge;
  participants: ChallengeDetailParticipant[];
} | null> {
  try {
    const { data: challenge, error: cErr } = await challenges()
      .select('*')
      .eq('id', challengeId)
      .single();

    if (cErr || !challenge) return null;

    // Get participants
    const { data: participantRows, error: pErr } = await participants()
      .select('*')
      .eq('challenge_id', challengeId)
      .order('current_progress', { ascending: false });

    if (pErr) return null;

    // Get profiles for participants
    const userIds = ((participantRows ?? []) as any[]).map((p: any) => p.user_id);

    let profileMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p])
      );
    }

    const detailedParticipants: ChallengeDetailParticipant[] = (
      (participantRows ?? []) as any[]
    ).map((p: any) => ({
      ...p,
      profile: {
        username: profileMap.get(p.user_id)?.username ?? null,
        display_name: profileMap.get(p.user_id)?.display_name ?? null,
        avatar_url: profileMap.get(p.user_id)?.avatar_url ?? null,
      },
    }));

    return {
      challenge: challenge as Challenge,
      participants: detailedParticipants,
    };
  } catch (err) {
    console.warn('[Challenge] getChallengeDetails error:', err);
    return null;
  }
}

// ─── Update progress ────────────────────────────────────────────────
export async function updateProgress(
  userId: string,
  challengeId: string,
  progress: number
): Promise<boolean> {
  try {
    const { error } = await participants()
      .update({
        current_progress: progress,
        completed: false,
      })
      .eq('challenge_id', challengeId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Challenge] updateProgress failed:', error.message);
      return false;
    }

    // Check if this participant hit the target
    const { data: challenge } = await challenges()
      .select('target_value')
      .eq('id', challengeId)
      .single();

    if (challenge && progress >= (challenge as any).target_value) {
      await participants()
        .update({ completed: true })
        .eq('challenge_id', challengeId)
        .eq('user_id', userId);
    }

    return true;
  } catch (err) {
    console.warn('[Challenge] updateProgress error:', err);
    return false;
  }
}

// ─── Check completion (past end date) ───────────────────────────────
export async function checkChallengeCompletion(
  challengeId: string
): Promise<boolean> {
  try {
    const { data: challenge } = await challenges()
      .select('end_date, status')
      .eq('id', challengeId)
      .single();

    if (!challenge || (challenge as any).status !== 'active') return false;

    const now = new Date();
    const endDate = new Date((challenge as any).end_date);

    if (now > endDate) {
      await challenges()
        .update({ status: 'completed' })
        .eq('id', challengeId);
      return true;
    }

    return false;
  } catch (err) {
    console.warn('[Challenge] checkChallengeCompletion error:', err);
    return false;
  }
}
