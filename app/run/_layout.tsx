import { Stack } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';

export default function RunLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="save" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}
