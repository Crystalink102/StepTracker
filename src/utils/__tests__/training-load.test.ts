import {
  calculateActivityLoad,
  calculateWeeklyLoad,
  getLoadStatus,
  estimateRecovery,
  getFreshness,
  getWeeklyLoadLabel,
} from '../training-load';

describe('calculateActivityLoad', () => {
  it('returns 0 for zero duration', () => {
    expect(calculateActivityLoad(0, 150, 190, 60)).toBe(0);
  });

  it('returns 0 for negative duration', () => {
    expect(calculateActivityLoad(-5, 150, 190, 60)).toBe(0);
  });

  it('uses fallback when avgHR is null', () => {
    const load = calculateActivityLoad(30, null, 190, 60);
    expect(load).toBeGreaterThan(0);
    // Fallback: 30 * 0.4 * 1.5 = 18
    expect(load).toBe(18);
  });

  it('uses fallback when avgHR is 0 (falsy)', () => {
    const load = calculateActivityLoad(30, 0, 190, 60);
    expect(load).toBe(18);
  });

  it('computes load with valid HR data', () => {
    // avgHR=150, maxHR=190, restingHR=60 -> reserve ratio = (150-60)/(190-60) = 90/130 ≈ 0.692
    const load = calculateActivityLoad(30, 150, 190, 60);
    expect(load).toBeGreaterThan(0);
    expect(load).toBeGreaterThan(18); // should be higher than fallback for moderate HR
  });

  it('uses fallback when maxHR <= restingHR', () => {
    const load = calculateActivityLoad(30, 150, 60, 60);
    expect(load).toBe(18);
  });

  it('uses fallback when avgHR <= restingHR', () => {
    const load = calculateActivityLoad(30, 50, 190, 60);
    expect(load).toBe(18);
  });
});

describe('calculateWeeklyLoad', () => {
  it('returns 0 for empty array', () => {
    expect(calculateWeeklyLoad([], 190, 60)).toBe(0);
  });

  it('sums load across activities', () => {
    const activities = [
      { duration_seconds: 1800, avg_heart_rate: null, type: 'run' },
      { duration_seconds: 1800, avg_heart_rate: null, type: 'walk' },
    ] as any[];
    const load = calculateWeeklyLoad(activities, 190, 60);
    expect(load).toBeGreaterThan(0);
  });
});

describe('getLoadStatus', () => {
  it('returns detraining when both loads are 0', () => {
    const status = getLoadStatus(0, 0);
    expect(status.status).toBe('detraining');
  });

  it('returns building when prev is 0 but current > 0', () => {
    const status = getLoadStatus(50, 0);
    expect(status.status).toBe('building');
  });

  it('returns maintaining for similar loads', () => {
    const status = getLoadStatus(100, 100);
    expect(status.status).toBe('maintaining');
  });

  it('returns building for moderate increase', () => {
    const status = getLoadStatus(120, 100);
    expect(status.status).toBe('building');
  });

  it('returns overreaching for large increase', () => {
    const status = getLoadStatus(150, 100);
    expect(status.status).toBe('overreaching');
  });

  it('returns detraining for large decrease', () => {
    const status = getLoadStatus(50, 100);
    expect(status.status).toBe('detraining');
  });

  it('returns a message and color', () => {
    const status = getLoadStatus(100, 100);
    expect(status.message.length).toBeGreaterThan(0);
    expect(status.color).toMatch(/^#/);
  });
});

describe('estimateRecovery', () => {
  it('returns 100% for zero load', () => {
    const r = estimateRecovery(0, 10);
    expect(r.recovered).toBe(true);
    expect(r.percentRecovered).toBe(100);
  });

  it('returns low recovery for recent hard activity', () => {
    const r = estimateRecovery(100, 1);
    expect(r.recovered).toBe(false);
    expect(r.percentRecovered).toBeLessThan(100);
  });

  it('returns full recovery after enough time', () => {
    const r = estimateRecovery(50, 96);
    expect(r.recovered).toBe(true);
    expect(r.percentRecovered).toBe(100);
  });

  it('handles zero hours since activity', () => {
    const r = estimateRecovery(50, 0);
    expect(r.recovered).toBe(false);
    expect(r.percentRecovered).toBeLessThanOrEqual(10);
  });
});

describe('getFreshness', () => {
  it('returns zeros for empty arrays', () => {
    const f = getFreshness([], [], 190, 60);
    expect(f.fitness).toBe(0);
    expect(f.fatigue).toBe(0);
    expect(f.score).toBe(0);
  });

  it('returns a label string', () => {
    const f = getFreshness([], [], 190, 60);
    expect(f.label.length).toBeGreaterThan(0);
  });
});

describe('getWeeklyLoadLabel', () => {
  it('returns Low for load < 30', () => {
    expect(getWeeklyLoadLabel(0).label).toBe('Low');
    expect(getWeeklyLoadLabel(29).label).toBe('Low');
  });

  it('returns Moderate for load 30-79', () => {
    expect(getWeeklyLoadLabel(30).label).toBe('Moderate');
    expect(getWeeklyLoadLabel(79).label).toBe('Moderate');
  });

  it('returns High for load 80-149', () => {
    expect(getWeeklyLoadLabel(80).label).toBe('High');
    expect(getWeeklyLoadLabel(149).label).toBe('High');
  });

  it('returns Very High for load >= 150', () => {
    expect(getWeeklyLoadLabel(150).label).toBe('Very High');
    expect(getWeeklyLoadLabel(300).label).toBe('Very High');
  });

  it('includes a color', () => {
    expect(getWeeklyLoadLabel(50).color).toMatch(/^#/);
  });
});
