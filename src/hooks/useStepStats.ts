import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { usePreferences } from '@/src/context/PreferencesContext';
import * as StepService from '@/src/services/step.service';
import { DailySteps } from '@/src/types/database';

export type StepStatPeriod = 'week' | 'month';

export type StepDay = {
  date: string;
  label: string;
  steps: number;
};

function getWeekRange(weekStartsMonday: boolean) {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ...
  let diff: number;
  if (weekStartsMonday) {
    diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  } else {
    diff = now.getDate() - day; // Sunday start
  }
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_LABELS[d.getDay()];
}

function getShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function useStepStats() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const [period, setPeriod] = useState<StepStatPeriod>('week');
  const [data, setData] = useState<StepDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const range = period === 'week' ? getWeekRange(preferences.weekStartsMonday) : getMonthRange();
      const startStr = toDateString(range.start);
      const endStr = toDateString(range.end);

      const records = await StepService.getStepHistory(user.id, startStr, endStr);
      const stepMap = new Map<string, number>();
      records.forEach((r: DailySteps) => stepMap.set(r.date, r.step_count));

      // Build array for every day in range
      const days: StepDay[] = [];
      const cursor = new Date(range.start);
      while (cursor <= range.end) {
        const dateStr = toDateString(cursor);
        days.push({
          date: dateStr,
          label: period === 'week' ? getDayLabel(dateStr) : getShortDate(dateStr),
          steps: stepMap.get(dateStr) ?? 0,
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      setData(days);
    } catch {
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, period, preferences.weekStartsMonday]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { total, average, bestDay } = useMemo(() => {
    const t = data.reduce((sum, d) => sum + d.steps, 0);
    return {
      total: t,
      average: data.length > 0 ? Math.round(t / data.length) : 0,
      bestDay: data.reduce(
        (best, d) => (d.steps > best.steps ? d : best),
        { date: '', label: '', steps: 0 }
      ),
    };
  }, [data]);

  return { period, setPeriod, data, total, average, bestDay, isLoading, refresh: loadData };
}
