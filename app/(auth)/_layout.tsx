import { Stack } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-otp" />
    </Stack>
  );
}
