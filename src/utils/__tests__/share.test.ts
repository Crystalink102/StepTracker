import { shareActivity } from '../share';

jest.mock('react-native', () => ({
  Share: {
    share: jest.fn().mockResolvedValue({ action: 'sharedAction' }),
  },
  Platform: { OS: 'ios' },
}));

const makeActivity = (overrides: Record<string, any> = {}) => ({
  id: 'test-1',
  user_id: 'user-1',
  type: 'run',
  status: 'completed',
  started_at: '2025-06-01T10:00:00Z',
  ended_at: '2025-06-01T10:30:00Z',
  duration_seconds: 1800,
  distance_meters: 5000,
  avg_pace_seconds_per_km: 360,
  avg_heart_rate: null,
  hr_source: null,
  calories_estimate: 350,
  xp_earned: 100,
  name: null,
  description: null,
  perceived_effort: null,
  is_favorite: false,
  privacy: 'public',
  activity_subtype: null,
  gear_id: null,
  created_at: '2025-06-01T10:30:00Z',
  ...overrides,
});

describe('shareActivity', () => {
  it('shares run activity without crashing', async () => {
    await expect(
      shareActivity(makeActivity(), 'km')
    ).resolves.not.toThrow();
  });

  it('shares walk activity', async () => {
    await expect(
      shareActivity(makeActivity({ type: 'walk', distance_meters: 2000, duration_seconds: 1200, avg_pace_seconds_per_km: 600, calories_estimate: 100 }), 'mi')
    ).resolves.not.toThrow();
  });

  it('handles zero distance', async () => {
    await expect(
      shareActivity(makeActivity({ distance_meters: 0, duration_seconds: 60, avg_pace_seconds_per_km: 0, calories_estimate: 0 }), 'km')
    ).resolves.not.toThrow();
  });
});
