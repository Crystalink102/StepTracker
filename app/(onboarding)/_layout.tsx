import { Stack } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';

export default function OnboardingLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
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
