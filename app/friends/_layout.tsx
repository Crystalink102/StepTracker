import { TouchableOpacity, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors, FontSize } from '@/src/constants/theme';

function CloseButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
      <Text style={{ color: Colors.textSecondary, fontSize: FontSize.xxl, fontWeight: '300' }}>
        ✕
      </Text>
    </TouchableOpacity>
  );
}

export default function FriendsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        contentStyle: { backgroundColor: Colors.background },
        headerRight: () => <CloseButton />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Friends' }} />
      <Stack.Screen name="search" options={{ title: 'Add Friends' }} />
      <Stack.Screen name="requests" options={{ title: 'Friend Requests' }} />
    </Stack>
  );
}
