/**
 * App timezone — Central Time (Texas).
 * All day boundaries (step resets, streaks, goals) use this timezone
 * so behavior is consistent regardless of device timezone settings.
 */
export const APP_TIMEZONE = 'America/Chicago';

/**
 * Get the current date parts in Central Time.
 */
function getCTDateParts(): { year: number; month: number; day: number } {
  const now = new Date();
  // Intl.DateTimeFormat gives us the date in the target timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === 'year')!.value);
  const month = Number(parts.find((p) => p.type === 'month')!.value);
  const day = Number(parts.find((p) => p.type === 'day')!.value);
  return { year, month, day };
}

/**
 * Get today's date as YYYY-MM-DD string in Central Time (America/Chicago).
 * Using a fixed timezone ensures step records, streaks, and goals
 * reset at midnight CT regardless of the device's timezone.
 */
export function getTodayString(): string {
  const { year, month, day } = getCTDateParts();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Get midnight (start of today) in Central Time as a Date object.
 * Used by health APIs to query "today's" steps.
 */
export function getMidnightCT(): Date {
  const { year, month, day } = getCTDateParts();
  // Build an ISO string for midnight CT, then parse it
  // We need the UTC offset for CT at this moment
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: 'numeric',
    hour12: false,
    timeZoneName: 'shortOffset',
  });
  const tzParts = formatter.formatToParts(new Date());
  const tzName = tzParts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-6';
  // tzName is like "GMT-5" or "GMT-6" — parse the offset
  const offsetMatch = tzName.match(/GMT([+-]?\d+)/);
  const offsetHours = offsetMatch ? Number(offsetMatch[1]) : -6;
  // Midnight CT in UTC = midnight local + offset
  const utcMidnight = new Date(Date.UTC(year, month - 1, day, -offsetHours, 0, 0, 0));
  return utcMidnight;
}

/**
 * Format a date string or Date object into a readable format
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date into a relative string: "Today", "Yesterday", or "Mon, Jan 1"
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time: "3:42 PM"
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
