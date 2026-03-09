import {
  strideLengthMeters,
  distanceFromSteps,
  caloriesFromActivity,
  caloriesFromSteps,
  activeMinutesFromSteps,
  isPlausibleGPSMove,
  smoothedPace,
} from '../fitness';

describe('strideLengthMeters', () => {
  it('returns default stride for null height', () => {
    expect(strideLengthMeters(null)).toBe(0.7055);
  });

  it('returns default stride for unreasonable height', () => {
    expect(strideLengthMeters(50)).toBe(0.7055);
    expect(strideLengthMeters(300)).toBe(0.7055);
  });

  it('calculates stride from height', () => {
    expect(strideLengthMeters(170)).toBeCloseTo(0.7055, 3);
    expect(strideLengthMeters(180)).toBeCloseTo(0.747, 3);
    expect(strideLengthMeters(160)).toBeCloseTo(0.664, 3);
  });
});

describe('distanceFromSteps', () => {
  it('calculates distance using stride length', () => {
    const distance = distanceFromSteps(1000, 170);
    expect(distance).toBeCloseTo(705.5, 0);
  });

  it('uses default stride when height is null', () => {
    const distance = distanceFromSteps(1000, null);
    expect(distance).toBe(705.5);
  });
});

describe('caloriesFromActivity', () => {
  it('uses MET calculation when speed data available', () => {
    // 5km in 30min = 10 km/h (running)
    const cal = caloriesFromActivity(5000, 1800, 70, 'run');
    expect(cal).toBeGreaterThan(0);
    expect(cal).toBeLessThan(500);
  });

  it('uses fallback when no speed data', () => {
    // Distance only, no duration
    const cal = caloriesFromActivity(5000, 0, 70, 'run');
    expect(cal).toBe(Math.round(70 * 5 * 1.0));
  });

  it('uses walking factor for walk type fallback', () => {
    const cal = caloriesFromActivity(5000, 0, 70, 'walk');
    expect(cal).toBe(Math.round(70 * 5 * 0.5));
  });

  it('defaults to 70kg when weight is null', () => {
    const cal = caloriesFromActivity(5000, 0, null, 'run');
    expect(cal).toBe(Math.round(70 * 5 * 1.0));
  });
});

describe('caloriesFromSteps', () => {
  it('calculates calories from steps with default weight', () => {
    const cal = caloriesFromSteps(10000, null);
    expect(cal).toBe(Math.round(10000 * 0.04));
  });

  it('scales calories by weight', () => {
    const cal70 = caloriesFromSteps(10000, 70);
    const cal140 = caloriesFromSteps(10000, 140);
    expect(cal140).toBe(cal70 * 2);
  });
});

describe('activeMinutesFromSteps', () => {
  it('estimates active minutes at 110 steps/min', () => {
    expect(activeMinutesFromSteps(1100)).toBe(10);
    expect(activeMinutesFromSteps(0)).toBe(0);
  });
});

describe('isPlausibleGPSMove', () => {
  it('accepts moves between 2m and 50m', () => {
    expect(isPlausibleGPSMove(5)).toBe(true);
    expect(isPlausibleGPSMove(30)).toBe(true);
  });

  it('rejects too-small moves', () => {
    expect(isPlausibleGPSMove(0.5)).toBe(false);
    expect(isPlausibleGPSMove(0.9)).toBe(false);
  });

  it('rejects too-large jumps', () => {
    expect(isPlausibleGPSMove(100)).toBe(false);
    expect(isPlausibleGPSMove(51)).toBe(false);
  });

  it('accepts boundary values', () => {
    expect(isPlausibleGPSMove(2)).toBe(true);
    expect(isPlausibleGPSMove(50)).toBe(true);
  });
});

describe('smoothedPace', () => {
  it('returns new pace on first reading (prev = 0)', () => {
    const pace = smoothedPace(10, 0);
    expect(pace).toBe(360); // 3600 / 10
  });

  it('ignores standstill speed', () => {
    expect(smoothedPace(0.3, 400)).toBe(400);
  });

  it('applies EMA smoothing', () => {
    const pace = smoothedPace(10, 400, 0.3);
    const expected = 0.3 * 360 + 0.7 * 400;
    expect(pace).toBeCloseTo(expected, 1);
  });
});
