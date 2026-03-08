import { TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors, FontSize } from '@/src/constants/theme';
import { Text } from 'react-native';

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

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        contentStyle: { backgroundColor: Colors.background },
        headerRight: () => <CloseButton />,
      }}
    >
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="personal-info" options={{ title: 'Personal Info' }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
    </Stack>
  );
}
