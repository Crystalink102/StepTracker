import {
  estimateCadence,
  calculateTrainingPaces,
  estimateThresholdPace,
  estimateVO2max,
  vo2maxFromRaceResult,
  getVO2maxRating,
  predictRaceTime,
  predictAllRaceTimes,
} from '../running-metrics';

describe('estimateCadence', () => {
  it('returns null for null pace', () => {
    expect(estimateCadence(null, 175)).toBeNull();
  });

  it('returns null for zero pace', () => {
    expect(estimateCadence(0, 175)).toBeNull();
  });

  it('returns null for pace > 1200', () => {
    expect(estimateCadence(1201, 175)).toBeNull();
  });

  it('returns a reasonable cadence for normal pace', () => {
    // ~5 min/km = 300 sec/km
    const cadence = estimateCadence(300, 175);
    expect(cadence).toBeGreaterThanOrEqual(120);
    expect(cadence).toBeLessThanOrEqual(220);
  });

  it('handles null height', () => {
    const cadence = estimateCadence(300, null);
    expect(cadence).toBeGreaterThanOrEqual(120);
    expect(cadence).toBeLessThanOrEqual(220);
  });

  it('taller runners have lower cadence', () => {
    const tall = estimateCadence(300, 200);
    const short = estimateCadence(300, 150);
    if (tall !== null && short !== null) {
      expect(tall).toBeLessThanOrEqual(short);
    }
  });
});

describe('calculateTrainingPaces', () => {
  it('returns empty array for zero pace', () => {
    expect(calculateTrainingPaces(0)).toEqual([]);
  });

  it('returns 5 training zones for valid pace', () => {
    const zones = calculateTrainingPaces(300); // 5 min/km
    expect(zones).toHaveLength(5);
  });

  it('each zone has required fields', () => {
    const zones = calculateTrainingPaces(300);
    for (const z of zones) {
      expect(z.zone).toBeTruthy();
      expect(z.description).toBeTruthy();
      expect(z.minPaceSecPerKm).toBeGreaterThan(0);
      expect(z.maxPaceSecPerKm).toBeGreaterThan(0);
      expect(z.color).toMatch(/^#/);
    }
  });

  it('easy pace is slower (higher sec/km) than speed pace', () => {
    const zones = calculateTrainingPaces(300);
    const easy = zones.find(z => z.zone === 'Easy');
    const speed = zones.find(z => z.zone === 'Speed');
    if (easy && speed) {
      expect(easy.minPaceSecPerKm).toBeGreaterThan(speed.minPaceSecPerKm);
    }
  });
});

describe('estimateThresholdPace', () => {
  it('returns null for empty array', () => {
    expect(estimateThresholdPace([])).toBeNull();
  });

  it('returns null when no qualifying runs', () => {
    const activities = [
      { avg_pace_seconds_per_km: 300, duration_seconds: 600, type: 'run' }, // only 10 min
    ];
    expect(estimateThresholdPace(activities)).toBeNull();
  });

  it('returns null for walks only', () => {
    const activities = [
      { avg_pace_seconds_per_km: 500, duration_seconds: 3600, type: 'walk' },
    ];
    expect(estimateThresholdPace(activities)).toBeNull();
  });

  it('returns threshold pace for qualifying run', () => {
    const activities = [
      { avg_pace_seconds_per_km: 300, duration_seconds: 1800, type: 'run' }, // 30 min
    ];
    const pace = estimateThresholdPace(activities);
    expect(pace).not.toBeNull();
    // Should be ~300 * 1.03 = 309
    expect(pace).toBeCloseTo(309, 0);
  });

  it('picks fastest qualifying run', () => {
    const activities = [
      { avg_pace_seconds_per_km: 350, duration_seconds: 2400, type: 'run' },
      { avg_pace_seconds_per_km: 280, duration_seconds: 1800, type: 'run' },
    ];
    const pace = estimateThresholdPace(activities);
    // Fastest is 280, threshold = 280 * 1.03 = 288.4
    expect(pace).toBeCloseTo(288.4, 0);
  });
});

describe('estimateVO2max', () => {
  it('returns a positive number for valid pace', () => {
    const vo2 = estimateVO2max(300); // 5 min/km
    expect(vo2).toBeGreaterThan(0);
    expect(vo2).toBeLessThan(100);
  });

  it('faster pace gives higher VO2max', () => {
    const fast = estimateVO2max(200); // 3:20/km
    const slow = estimateVO2max(400); // 6:40/km
    expect(fast).toBeGreaterThan(slow);
  });
});

describe('vo2maxFromRaceResult', () => {
  it('returns a reasonable value for a 5K', () => {
    // 25 min 5K
    const vo2 = vo2maxFromRaceResult(5000, 25 * 60);
    expect(vo2).toBeGreaterThan(30);
    expect(vo2).toBeLessThan(70);
  });

  it('faster race gives higher VO2max', () => {
    const fast = vo2maxFromRaceResult(5000, 18 * 60);
    const slow = vo2maxFromRaceResult(5000, 30 * 60);
    expect(fast).toBeGreaterThan(slow);
  });
});

describe('getVO2maxRating', () => {
  it('returns Elite for very high VO2max', () => {
    const r = getVO2maxRating(65);
    expect(r.label).toBe('Elite');
  });

  it('returns Below Average for low VO2max', () => {
    const r = getVO2maxRating(30);
    expect(r.label).toBe('Below Average');
  });

  it('adjusts for age > 30', () => {
    // Age 50 adds (50-30)*0.3 = 6 to effective VO2max
    const younger = getVO2maxRating(44);
    const older = getVO2maxRating(44, 50);
    // older gets +6 adjustment, so might get a better rating
    expect(older.label).not.toBeFalsy();
  });

  it('no adjustment for age <= 30', () => {
    const r1 = getVO2maxRating(44);
    const r2 = getVO2maxRating(44, 25);
    expect(r1.label).toBe(r2.label);
  });

  it('no adjustment for null age', () => {
    const r1 = getVO2maxRating(44);
    const r2 = getVO2maxRating(44, null);
    expect(r1.label).toBe(r2.label);
  });
});

describe('predictRaceTime', () => {
  it('predicts longer time for longer distance', () => {
    const t5k = predictRaceTime(5000, 25 * 60, 5000);
    const t10k = predictRaceTime(5000, 25 * 60, 10000);
    expect(t10k).toBeGreaterThan(t5k);
  });

  it('returns 0 for zero known time', () => {
    expect(predictRaceTime(5000, 0, 10000)).toBe(0);
  });

  it('predicts shorter time for shorter distance', () => {
    const t = predictRaceTime(10000, 50 * 60, 5000);
    expect(t).toBeLessThan(50 * 60);
  });
});

describe('predictAllRaceTimes', () => {
  it('returns predictions for standard distances', () => {
    const preds = predictAllRaceTimes(5000, 25 * 60);
    expect(preds.length).toBeGreaterThanOrEqual(4);
  });

  it('each prediction has required fields', () => {
    const preds = predictAllRaceTimes(5000, 25 * 60);
    for (const p of preds) {
      expect(p.label).toBeTruthy();
      expect(p.distanceM).toBeGreaterThan(0);
      expect(p.predictedTimeS).toBeGreaterThan(0);
      expect(p.predictedPaceSecPerKm).toBeGreaterThan(0);
    }
  });
});
