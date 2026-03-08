import { haversineDistance, paceSecondsPerKm, speedKmh } from '../geo';

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it('calculates known distance: NYC to LA (~3944km)', () => {
    const dist = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    // Should be roughly 3944 km
    expect(dist / 1000).toBeCloseTo(3944, -2); // within ~100km
  });

  it('calculates short distance accurately', () => {
    // ~111km per degree of latitude at equator
    const dist = haversineDistance(0, 0, 1, 0);
    expect(dist / 1000).toBeCloseTo(111.2, 0);
  });

  it('is symmetric', () => {
    const d1 = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    const d2 = haversineDistance(34.0522, -118.2437, 40.7128, -74.006);
    expect(d1).toBeCloseTo(d2, 5);
  });
});

describe('paceSecondsPerKm', () => {
  it('calculates pace from distance and time', () => {
    // 1000m in 300s = 300 sec/km
    expect(paceSecondsPerKm(1000, 300)).toBe(300);
  });

  it('returns 0 for zero distance', () => {
    expect(paceSecondsPerKm(0, 300)).toBe(0);
  });

  it('scales correctly', () => {
    // 5000m in 1500s = 300 sec/km
    expect(paceSecondsPerKm(5000, 1500)).toBe(300);
  });
});

describe('speedKmh', () => {
  it('calculates speed from distance and time', () => {
    // 1000m in 360s = 10 km/h
    expect(speedKmh(1000, 360)).toBeCloseTo(10, 0);
  });

  it('returns 0 for zero time', () => {
    expect(speedKmh(1000, 0)).toBe(0);
  });
});
