import { Stack } from 'expo-router';
import { Colors } from '@/src/constants/theme';

export default function RunLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        contentStyle: { backgroundColor: Colors.background },
      }}
    />
  );
}
