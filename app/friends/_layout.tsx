import { Stack } from 'expo-router';
import { Colors } from '@/src/constants/theme';

export default function FriendsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Friends' }} />
      <Stack.Screen name="search" options={{ title: 'Add Friends' }} />
      <Stack.Screen name="requests" options={{ title: 'Friend Requests' }} />
    </Stack>
  );
}
