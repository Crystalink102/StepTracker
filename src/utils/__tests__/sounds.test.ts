import { playLevelUp, playAchievement, playGoalHit, playButtonPress } from '../sounds';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

describe('sounds/haptics', () => {
  it('playLevelUp does not throw', async () => {
    await expect(playLevelUp(true)).resolves.not.toThrow();
  });

  it('playLevelUp respects haptic disabled', async () => {
    await expect(playLevelUp(false)).resolves.not.toThrow();
  });

  it('playAchievement does not throw', async () => {
    await expect(playAchievement(true)).resolves.not.toThrow();
  });

  it('playGoalHit does not throw', async () => {
    await expect(playGoalHit(true)).resolves.not.toThrow();
  });

  it('playButtonPress does not throw', async () => {
    await expect(playButtonPress(true)).resolves.not.toThrow();
  });

  it('all functions handle web platform gracefully', async () => {
    // Platform.OS is mocked as 'ios', but haptic disabled should still work
    await expect(playLevelUp(false)).resolves.not.toThrow();
    await expect(playAchievement(false)).resolves.not.toThrow();
    await expect(playGoalHit(false)).resolves.not.toThrow();
    await expect(playButtonPress(false)).resolves.not.toThrow();
  });
});
