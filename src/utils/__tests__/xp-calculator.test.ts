import {
  xpForLevel,
  levelFromTotalXP,
  levelProgress,
  xpToNextLevel,
  xpFromSteps,
  xpFromActivity,
  hrXPBonus,
  isAutoHRUnlocked,
} from '../xp-calculator';

describe('xpForLevel', () => {
  it('returns XP needed for level 1', () => {
    // 100 * 1^1.68 = 100
    expect(xpForLevel(1)).toBe(100);
  });

  it('scales with level power curve', () => {
    const lvl5 = xpForLevel(5);
    const lvl10 = xpForLevel(10);
    expect(lvl10).toBeGreaterThan(lvl5);
    // Level 5: 100 * 5^1.68 ≈ 1404
    expect(lvl5).toBeGreaterThan(1000);
  });
});

describe('levelFromTotalXP', () => {
  it('returns level 1 for 0 XP', () => {
    expect(levelFromTotalXP(0)).toBe(1);
  });

  it('returns level 1 for 99 XP (not enough for level 2)', () => {
    expect(levelFromTotalXP(99)).toBe(1);
  });

  it('returns level 2 after accumulating enough XP', () => {
    const lvl1XP = xpForLevel(1); // 100
    expect(levelFromTotalXP(lvl1XP)).toBe(2);
  });

  it('handles large XP values', () => {
    const level = levelFromTotalXP(100000);
    expect(level).toBeGreaterThan(10);
  });
});

describe('levelProgress', () => {
  it('returns 0 at start of level', () => {
    // Exactly at level 2 boundary
    const lvl1XP = xpForLevel(1);
    expect(levelProgress(lvl1XP)).toBeCloseTo(0, 1);
  });

  it('returns value between 0 and 1', () => {
    const progress = levelProgress(50);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(1);
  });
});

describe('xpToNextLevel', () => {
  it('returns full level XP at start of level', () => {
    expect(xpToNextLevel(0)).toBe(xpForLevel(1));
  });

  it('decreases as XP is gained', () => {
    const atZero = xpToNextLevel(0);
    const at50 = xpToNextLevel(50);
    expect(at50).toBe(atZero - 50);
  });
});

describe('xpFromSteps', () => {
  it('gives 1 XP per 10 steps baseline', () => {
    expect(xpFromSteps(100)).toBe(10);
    expect(xpFromSteps(10)).toBe(1);
    expect(xpFromSteps(9)).toBe(0);
  });

  it('adds HR bonus when heart rate provided', () => {
    const noHR = xpFromSteps(1000);
    const withHR = xpFromSteps(1000, 120); // 120 > 85 baseline
    expect(withHR).toBeGreaterThan(noHR);
  });

  it('no HR bonus at or below baseline', () => {
    const noHR = xpFromSteps(1000);
    const atBaseline = xpFromSteps(1000, 85);
    expect(atBaseline).toBe(noHR);
  });
});

describe('xpFromActivity', () => {
  it('gives base XP from distance', () => {
    // 1000m = 100 base XP
    const xp = xpFromActivity(1000, 600);
    expect(xp).toBeGreaterThanOrEqual(100); // base + duration
  });

  it('includes duration bonus', () => {
    const short = xpFromActivity(1000, 60);  // 1 min
    const long = xpFromActivity(1000, 600);   // 10 min
    expect(long).toBeGreaterThan(short);
  });

  it('includes HR bonus', () => {
    const noHR = xpFromActivity(1000, 600);
    const withHR = xpFromActivity(1000, 600, 150);
    expect(withHR).toBeGreaterThan(noHR);
  });
});

describe('hrXPBonus', () => {
  it('returns 0 at or below baseline', () => {
    expect(hrXPBonus(85)).toBe(0);
    expect(hrXPBonus(60)).toBe(0);
  });

  it('returns bonus above baseline', () => {
    // 100 BPM = 15 BPM above 85 baseline = 15 * 0.1 = 1.5
    expect(hrXPBonus(100)).toBeCloseTo(1.5);
  });
});

describe('isAutoHRUnlocked', () => {
  it('returns false below level 3', () => {
    expect(isAutoHRUnlocked(1)).toBe(false);
    expect(isAutoHRUnlocked(2)).toBe(false);
  });

  it('returns true at level 3+', () => {
    expect(isAutoHRUnlocked(3)).toBe(true);
    expect(isAutoHRUnlocked(10)).toBe(true);
  });
});
