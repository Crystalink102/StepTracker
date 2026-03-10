import { Stack } from 'expo-router';
import { Colors } from '@/src/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="setup-profile" />
      <Stack.Screen name="body-metrics" />
      <Stack.Screen name="daily-goal" />
    </Stack>
  );
}
