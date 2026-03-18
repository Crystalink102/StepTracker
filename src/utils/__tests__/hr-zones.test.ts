import { calculateMaxHR, ageFromDOB, getZone, getZoneName, getZoneDescription, getZoneColor, getZoneRanges } from '../hr-zones';

describe('calculateMaxHR', () => {
  it('returns 220 - age', () => {
    expect(calculateMaxHR(30)).toBe(190);
    expect(calculateMaxHR(20)).toBe(200);
    expect(calculateMaxHR(50)).toBe(170);
  });

  it('handles edge ages', () => {
    expect(calculateMaxHR(0)).toBe(220);
    expect(calculateMaxHR(100)).toBe(120);
  });
});

describe('ageFromDOB', () => {
  it('returns null for null/undefined', () => {
    expect(ageFromDOB(null)).toBeNull();
    expect(ageFromDOB(undefined)).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(ageFromDOB('not-a-date')).toBeNull();
    expect(ageFromDOB('')).toBeNull();
  });

  it('calculates age from valid DOB', () => {
    const thirtyYearsAgo = new Date();
    thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
    thirtyYearsAgo.setMonth(thirtyYearsAgo.getMonth() - 1); // ensure birthday has passed
    const result = ageFromDOB(thirtyYearsAgo.toISOString().split('T')[0]);
    expect(result).toBeGreaterThanOrEqual(29);
    expect(result).toBeLessThanOrEqual(31);
  });

  it('returns null for future dates', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 5);
    expect(ageFromDOB(future.toISOString().split('T')[0])).toBeNull();
  });
});

describe('getZone', () => {
  it('returns zone 1 for low HR', () => {
    expect(getZone(100, 200)).toBe(1); // 50%
  });

  it('returns zone 2 for 60-70%', () => {
    expect(getZone(130, 200)).toBe(2); // 65%
  });

  it('returns zone 3 for 70-80%', () => {
    expect(getZone(150, 200)).toBe(3); // 75%
  });

  it('returns zone 4 for 80-90%', () => {
    expect(getZone(170, 200)).toBe(4); // 85%
  });

  it('returns zone 5 for 90%+', () => {
    expect(getZone(185, 200)).toBe(5); // 92.5%
  });

  it('handles HR of 0', () => {
    expect(getZone(0, 200)).toBe(1);
  });

  it('handles HR above maxHR', () => {
    expect(getZone(210, 200)).toBe(5);
  });
});

describe('getZoneName', () => {
  it('returns names for valid zones', () => {
    expect(getZoneName(1)).toBeTruthy();
    expect(getZoneName(5)).toBeTruthy();
  });

  it('returns Unknown for invalid zones', () => {
    expect(getZoneName(0)).toBe('Unknown');
    expect(getZoneName(6)).toBe('Unknown');
  });
});

describe('getZoneDescription', () => {
  it('returns description for valid zones', () => {
    expect(getZoneDescription(1).length).toBeGreaterThan(0);
    expect(getZoneDescription(3).length).toBeGreaterThan(0);
  });

  it('returns empty string for invalid zones', () => {
    expect(getZoneDescription(0)).toBe('');
    expect(getZoneDescription(6)).toBe('');
  });
});

describe('getZoneColor', () => {
  it('returns color for valid zones', () => {
    expect(getZoneColor(1)).toMatch(/^#/);
    expect(getZoneColor(5)).toMatch(/^#/);
  });

  it('returns gray for invalid zones', () => {
    expect(getZoneColor(0)).toBe('#71717A');
    expect(getZoneColor(6)).toBe('#71717A');
  });
});

describe('getZoneRanges', () => {
  it('returns 5 zones', () => {
    const zones = getZoneRanges(200);
    expect(zones).toHaveLength(5);
  });

  it('has correct zone numbers', () => {
    const zones = getZoneRanges(200);
    expect(zones[0].zone).toBe(1);
    expect(zones[4].zone).toBe(5);
  });

  it('computes correct HR ranges for maxHR 200', () => {
    const zones = getZoneRanges(200);
    // Zone 1: 50-60% of 200 = 100-120
    expect(zones[0].minHR).toBe(100);
    expect(zones[0].maxHR).toBe(120);
  });
});
