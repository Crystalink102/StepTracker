import { TouchableOpacity, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontSize } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

function CloseButton() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
      <Text style={{ color: colors.textSecondary, fontSize: FontSize.xxl, fontWeight: '300' }}>
        ✕
      </Text>
    </TouchableOpacity>
  );
}

export default function FriendsLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
        headerRight: () => <CloseButton />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Friends' }} />
      <Stack.Screen name="search" options={{ title: 'Add Friends' }} />
      <Stack.Screen name="requests" options={{ title: 'Friend Requests' }} />
      <Stack.Screen name="[id]" options={{ title: 'Profile' }} />
    </Stack>
  );
}
