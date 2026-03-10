import { getTotalDuration, formatTotalTime, DEFAULT_INTERVAL_CONFIG } from '../useIntervalTimer';

describe('getTotalDuration', () => {
  it('calculates default config correctly', () => {
    // 5 intervals of 60s run + 4 rests of 30s = 300 + 120 = 420
    expect(getTotalDuration(DEFAULT_INTERVAL_CONFIG)).toBe(420);
  });

  it('handles 0 intervals', () => {
    expect(getTotalDuration({
      runDuration: 60,
      restDuration: 30,
      intervals: 0,
      warmupDuration: 60,
      cooldownDuration: 60,
    })).toBe(120); // just warmup + cooldown
  });

  it('handles 1 interval (no rest needed)', () => {
    expect(getTotalDuration({
      runDuration: 60,
      restDuration: 30,
      intervals: 1,
      warmupDuration: 0,
      cooldownDuration: 0,
    })).toBe(60); // just 1 run, no rest
  });

  it('includes warmup and cooldown', () => {
    expect(getTotalDuration({
      runDuration: 30,
      restDuration: 15,
      intervals: 3,
      warmupDuration: 60,
      cooldownDuration: 30,
    })).toBe(60 + 90 + 30 + 30); // warmup + 3×30 run + 2×15 rest + cooldown = 210
  });

  it('handles no rest duration', () => {
    expect(getTotalDuration({
      runDuration: 60,
      restDuration: 0,
      intervals: 5,
      warmupDuration: 0,
      cooldownDuration: 0,
    })).toBe(300); // 5 × 60 = 300
  });
});

describe('formatTotalTime', () => {
  it('formats seconds only', () => {
    expect(formatTotalTime(45)).toBe('45s');
  });

  it('formats minutes only', () => {
    expect(formatTotalTime(120)).toBe('2m');
  });

  it('formats minutes and seconds', () => {
    expect(formatTotalTime(90)).toBe('1m 30s');
  });

  it('formats large values', () => {
    expect(formatTotalTime(3661)).toBe('61m 1s');
  });
});
