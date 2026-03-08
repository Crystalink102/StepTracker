import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Button from './Button';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type ErrorScreenProps = {
  error: Error;
  retry: () => void;
};

export default function ErrorScreen({ error, retry }: ErrorScreenProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>!</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{error.message}</Text>
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
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  icon: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    color: Colors.warning,
    backgroundColor: Colors.surface,
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    textAlign: 'center',
    lineHeight: 80,
    marginBottom: Spacing.xxl,
    overflow: 'hidden',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  message: {
    color: Colors.textSecondary,
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
