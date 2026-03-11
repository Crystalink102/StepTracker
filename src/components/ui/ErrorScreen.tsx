import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Button from './Button';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

type ErrorScreenProps = {
  error: Error;
  retry: () => void;
};

export default function ErrorScreen({ error, retry }: ErrorScreenProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.icon, { color: colors.warning, backgroundColor: colors.surface }]}>!</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{error.message}</Text>
      <View style={styles.actions}>
        <Button title="Try Again" onPress={retry} />
        <Button
          title="Go Home"
          variant="ghost"
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  icon: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    textAlign: 'center',
    lineHeight: 80,
    marginBottom: Spacing.xxl,
    overflow: 'hidden',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: Spacing.md,
  },
});
