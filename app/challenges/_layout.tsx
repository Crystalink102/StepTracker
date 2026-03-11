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

export default function ChallengesLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Challenges' }} />
      <Stack.Screen name="create" options={{ title: 'New Challenge' }} />
      <Stack.Screen name="[id]" options={{ title: 'Challenge' }} />
      <Stack.Screen name="edit" options={{ title: 'Edit Challenge' }} />
    </Stack>
  );
}
