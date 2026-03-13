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

export default function SettingsLayout() {
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
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="personal-info" options={{ title: 'Personal Info' }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="preferences" options={{ title: 'Preferences' }} />
      <Stack.Screen name="gear" options={{ title: 'Gear' }} />
      <Stack.Screen name="training-paces" options={{ title: 'Training Paces' }} />
      <Stack.Screen name="race-predictor" options={{ title: 'Race Predictor' }} />
      <Stack.Screen name="support" options={{ title: 'Support' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
    </Stack>
  );
}
