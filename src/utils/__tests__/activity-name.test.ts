import { generateActivityName, getSubtypeLabel, ACTIVITY_SUBTYPES, PRIVACY_OPTIONS } from '../activity-name';

describe('generateActivityName', () => {
  // Central Time = UTC-6 (standard) or UTC-5 (daylight)
  // Use UTC hours that map to known Central Time buckets

  it('generates Morning Run for morning hours', () => {
    // 14:00 UTC = 8:00 AM Central (standard) or 9:00 AM Central (daylight)
    const name = generateActivityName('run', '2025-01-15T14:00:00Z');
    expect(name).toBe('Morning Run');
  });

  it('generates Evening Walk for evening hours', () => {
    // 23:00 UTC = 5:00 PM Central (standard) or 6:00 PM Central (daylight)
    const name = generateActivityName('walk', '2025-01-15T23:00:00Z');
    expect(name).toBe('Evening Walk');
  });

  it('generates Night Run for late night', () => {
    // 04:00 UTC = 10:00 PM Central (standard)
    const name = generateActivityName('run', '2025-01-15T04:00:00Z');
    expect(name).toBe('Night Run');
  });

  it('generates Afternoon Run for afternoon hours', () => {
    // 21:00 UTC = 3:00 PM Central (standard)
    const name = generateActivityName('run', '2025-01-15T21:00:00Z');
    expect(name).toBe('Afternoon Run');
  });

  it('capitalizes unknown activity types', () => {
    const name = generateActivityName('hike', '2025-01-15T14:00:00Z');
    expect(name).toBe('Morning Hike');
  });

  it('handles Date objects', () => {
    const d = new Date('2025-01-15T14:00:00Z');
    const name = generateActivityName('run', d);
    expect(name).toBe('Morning Run');
  });
});

describe('getSubtypeLabel', () => {
  it('returns null for null input', () => {
    expect(getSubtypeLabel(null)).toBeNull();
  });

  it('returns label for known subtypes', () => {
    // Check a run subtype
    const runSub = ACTIVITY_SUBTYPES.run[0];
    expect(getSubtypeLabel(runSub.value)).toBe(runSub.label);
  });

  it('returns raw string for unknown subtypes', () => {
    expect(getSubtypeLabel('unknown_type')).toBe('unknown_type');
  });
});

describe('ACTIVITY_SUBTYPES', () => {
  it('has run subtypes', () => {
    expect(ACTIVITY_SUBTYPES.run.length).toBeGreaterThan(0);
  });

  it('has walk subtypes', () => {
    expect(ACTIVITY_SUBTYPES.walk.length).toBeGreaterThan(0);
  });

  it('each subtype has value and label', () => {
    for (const sub of ACTIVITY_SUBTYPES.run) {
      expect(sub.value).toBeTruthy();
      expect(sub.label).toBeTruthy();
    }
  });
});

describe('PRIVACY_OPTIONS', () => {
  it('has 3 options', () => {
    expect(PRIVACY_OPTIONS).toHaveLength(3);
  });
});
