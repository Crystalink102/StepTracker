jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

import { PRESET_TEMPLATES, templateTotalDuration, formatTemplateDuration } from '../workout-templates';

describe('PRESET_TEMPLATES', () => {
  it('has at least 5 presets', () => {
    expect(PRESET_TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it('each preset has isPreset = true', () => {
    for (const t of PRESET_TEMPLATES) {
      expect(t.isPreset).toBe(true);
    }
  });

  it('each preset has required fields', () => {
    for (const t of PRESET_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.intervals).toBeGreaterThan(0);
      expect(t.runDuration).toBeGreaterThan(0);
    }
  });
});

describe('templateTotalDuration', () => {
  it('calculates total for a simple template', () => {
    const t = {
      id: 'test',
      name: 'Test',
      warmupDuration: 60,
      runDuration: 30,
      restDuration: 15,
      intervals: 4,
      cooldownDuration: 60,
    };
    // warmup(60) + run*4(120) + rest*3(45) + cooldown(60) = 285
    expect(templateTotalDuration(t)).toBe(285);
  });

  it('handles single interval (no rest)', () => {
    const t = {
      id: 'test',
      name: 'Test',
      warmupDuration: 0,
      runDuration: 60,
      restDuration: 30,
      intervals: 1,
      cooldownDuration: 0,
    };
    // run*1(60) + rest*max(0,0)(0) = 60
    expect(templateTotalDuration(t)).toBe(60);
  });

  it('handles zero intervals', () => {
    const t = {
      id: 'test',
      name: 'Test',
      warmupDuration: 120,
      runDuration: 60,
      restDuration: 30,
      intervals: 0,
      cooldownDuration: 60,
    };
    // warmup(120) + cooldown(60) = 180
    expect(templateTotalDuration(t)).toBe(180);
  });

  it('works with preset templates', () => {
    for (const t of PRESET_TEMPLATES) {
      const dur = templateTotalDuration(t);
      expect(dur).toBeGreaterThan(0);
    }
  });
});

describe('formatTemplateDuration', () => {
  it('formats zero seconds', () => {
    expect(formatTemplateDuration(0)).toBe('0m');
  });

  it('formats exact minutes', () => {
    expect(formatTemplateDuration(120)).toBe('2m');
    expect(formatTemplateDuration(300)).toBe('5m');
  });

  it('formats minutes and seconds', () => {
    expect(formatTemplateDuration(61)).toBe('1m 1s');
    expect(formatTemplateDuration(90)).toBe('1m 30s');
  });

  it('formats large durations', () => {
    expect(formatTemplateDuration(3600)).toBe('60m');
    expect(formatTemplateDuration(3661)).toBe('61m 1s');
  });
});
