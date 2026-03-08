import {
  formatNumber,
  formatDuration,
  formatPace,
  formatDistance,
  formatDistanceShort,
  formatSpeed,
} from '../formatters';

describe('formatNumber', () => {
  it('formats numbers with commas', () => {
    expect(formatNumber(12345)).toBe('12,345');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('handles small numbers', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
  });
});

describe('formatDuration', () => {
  it('formats seconds as mm:ss', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats with hours when >= 3600', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(7200)).toBe('2:00:00');
  });

  it('pads minutes and seconds', () => {
    expect(formatDuration(3601)).toBe('1:00:01');
  });
});

describe('formatPace', () => {
  it('formats pace as mm:ss', () => {
    expect(formatPace(300)).toBe('5:00');
    expect(formatPace(330)).toBe('5:30');
  });

  it('pads seconds', () => {
    expect(formatPace(305)).toBe('5:05');
  });
});

describe('formatDistance', () => {
  it('formats meters < 1000 as meters', () => {
    expect(formatDistance(500)).toBe('500 m');
    expect(formatDistance(0)).toBe('0 m');
  });

  it('formats meters >= 1000 as km with 2 decimals', () => {
    expect(formatDistance(1000)).toBe('1.00 km');
    expect(formatDistance(5280)).toBe('5.28 km');
  });
});

describe('formatDistanceShort', () => {
  it('formats meters < 1000 without space', () => {
    expect(formatDistanceShort(500)).toBe('500m');
  });

  it('formats km with 1 decimal', () => {
    expect(formatDistanceShort(1000)).toBe('1.0km');
    expect(formatDistanceShort(5280)).toBe('5.3km');
  });
});

describe('formatSpeed', () => {
  it('converts m/s to km/h', () => {
    expect(formatSpeed(1)).toBe('3.6 km/h');
    expect(formatSpeed(2.78)).toBe('10.0 km/h');
  });

  it('handles zero', () => {
    expect(formatSpeed(0)).toBe('0.0 km/h');
  });
});
