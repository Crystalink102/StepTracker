import { formatDate, formatRelativeDate } from '../date-helpers';

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
