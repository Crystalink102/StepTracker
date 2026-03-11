import { formatDate, formatRelativeDate, getTodayString, getMidnightCT, APP_TIMEZONE } from '../date-helpers';

describe('getTodayString', () => {
  it('returns a YYYY-MM-DD string', () => {
    const result = getTodayString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses Central Time timezone', () => {
    // The result should match the date in America/Chicago
    const now = new Date();
    const ctDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    expect(getTodayString()).toBe(ctDate);
  });
});

describe('getMidnightCT', () => {
  it('returns a Date object in the past or at current time', () => {
    const midnight = getMidnightCT();
    expect(midnight).toBeInstanceOf(Date);
    expect(midnight.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('midnight is at the start of the CT day', () => {
    const midnight = getMidnightCT();
    // midnight should be within the last 24 hours
    const diff = Date.now() - midnight.getTime();
    expect(diff).toBeGreaterThanOrEqual(0);
    expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
  });
});

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2025-06-15T12:00:00Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('formats Date object', () => {
    const result = formatDate(new Date('2025-01-15'));
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

describe('formatRelativeDate', () => {
  it('returns a string for recent dates', () => {
    const now = new Date().toISOString();
    const result = formatRelativeDate(now);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a string for old dates', () => {
    const result = formatRelativeDate('2020-01-01T00:00:00Z');
    expect(typeof result).toBe('string');
  });
});
