import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'custom_goals';

export type CustomGoal = {
  id: string;
  name: string;
  type: 'steps' | 'distance' | 'activities' | 'streak';
  target: number;
  deadline?: string; // YYYY-MM-DD
  progress: number;
  completed: boolean;
  created_at: string;
};

function generateId(): string {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function getGoals(): Promise<CustomGoal[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomGoal[];
  } catch {
    return [];
  }
}

export async function saveGoal(
  goal: Omit<CustomGoal, 'id' | 'progress' | 'completed' | 'created_at'>
): Promise<CustomGoal> {
  const goals = await getGoals();
  const newGoal: CustomGoal = {
    id: generateId(),
    name: goal.name,
    type: goal.type,
    target: goal.target,
    deadline: goal.deadline || undefined,
    progress: 0,
    completed: false,
    created_at: new Date().toISOString(),
  };
  goals.push(newGoal);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  return newGoal;
}

export async function deleteGoal(id: string): Promise<void> {
  const goals = await getGoals();
  const filtered = goals.filter((g) => g.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function updateGoalProgress(
  id: string,
  progress: number
): Promise<CustomGoal | null> {
  const goals = await getGoals();
  const goal = goals.find((g) => g.id === id);
  if (!goal) return null;

  goal.progress = progress;
  goal.completed = progress >= goal.target;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  return goal;
}

export async function updateAllGoalProgress(context: {
  todaySteps?: number;
  totalDistance?: number;
  activityCount?: number;
  currentStreak?: number;
}): Promise<CustomGoal[]> {
  const goals = await getGoals();
  let changed = false;

  for (const goal of goals) {
    if (goal.completed) continue;

    // Skip expired goals
    if (goal.deadline) {
      const deadlineDate = new Date(goal.deadline + 'T23:59:59');
      if (deadlineDate < new Date()) continue;
    }

    let newProgress = goal.progress;
    switch (goal.type) {
      case 'steps':
        newProgress = context.todaySteps ?? goal.progress;
        break;
      case 'distance':
        newProgress = context.totalDistance ?? goal.progress;
        break;
      case 'activities':
        newProgress = context.activityCount ?? goal.progress;
        break;
      case 'streak':
        newProgress = context.currentStreak ?? goal.progress;
        break;
    }

    if (newProgress !== goal.progress) {
      goal.progress = newProgress;
      goal.completed = newProgress >= goal.target;
      changed = true;
    }
  }

  if (changed) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }

  return goals;
}
