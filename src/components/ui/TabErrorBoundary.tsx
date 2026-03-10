import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from './Button';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

/**
 * Error boundary for individual tabs / route screens.
 *
 * Usage with Expo Router (preferred):
 *   In any route file (e.g. app/(tabs)/stats.tsx), export an ErrorBoundary:
 *
 *     export { ErrorBoundary } from '@/src/components/ui/TabErrorBoundary';
 *
 *   Expo Router will automatically wrap the route in this boundary.
 *   The root layout already uses this pattern — see app/_layout.tsx.
 *
 * Usage as a wrapper component (alternative):
 *
 *     <TabErrorBoundary tabName="Stats">
 *       <StatsScreen />
 *     </TabErrorBoundary>
 */

type TabErrorBoundaryProps = {
  children: React.ReactNode;
  tabName: string;
};

type TabErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class TabErrorBoundary extends React.Component<
  TabErrorBoundaryProps,
  TabErrorBoundaryState
> {
  constructor(props: TabErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[TabErrorBoundary] Error in ${this.props.tabName}:`,
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message ?? 'An unexpected error occurred';
      const truncated = message.length > 200 ? message.slice(0, 200) + '...' : message;

      return (
        <View style={styles.container}>
          <Text style={styles.icon}>!</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.tabContext}>Error in {this.props.tabName}</Text>
          <Text style={styles.message}>{truncated}</Text>
          <Button
            title="Try Again"
            onPress={() => this.setState({ hasError: false, error: null })}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Expo Router-compatible ErrorBoundary export.
 *
 * To use in a route file:
 *   export { ErrorBoundary } from '@/src/components/ui/TabErrorBoundary';
 *
 * Expo Router passes { error, retry } to this component automatically.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  const message = error.message ?? 'An unexpected error occurred';
  const truncated = message.length > 200 ? message.slice(0, 200) + '...' : message;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>!</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{truncated}</Text>
      <View style={styles.actions}>
        <Button title="Try Again" onPress={retry} />
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
  tabContext: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.sm,
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
