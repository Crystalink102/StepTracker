import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { StepProvider } from '@/src/context/StepContext';
import { ActivityProvider } from '@/src/context/ActivityContext';
import { NetworkProvider } from '@/src/context/NetworkContext';
import { useNotifications } from '@/src/hooks/useNotifications';
import { useProfile } from '@/src/hooks/useProfile';
import { Colors } from '@/src/constants/theme';

import { ErrorScreen } from '@/src/components/ui';

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} />;
}

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const segments = useSegments();
  const router = useRouter();

  // Register notifications when authenticated
  useNotifications();

  useEffect(() => {
    if (isLoading || (isAuthenticated && profileLoading)) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const needsOnboarding = isAuthenticated && profile && profile.height_cm === null;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      if (needsOnboarding) {
        router.replace('/(onboarding)/welcome');
      } else {
        router.replace('/(tabs)');
      }
    } else if (needsOnboarding && !inOnboarding) {
      router.replace('/(onboarding)/welcome');
    } else if (isAuthenticated && inOnboarding && !needsOnboarding) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, profileLoading, profile, segments, router]);

  if (isLoading || (isAuthenticated && profileLoading)) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="achievements"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="friends"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="run"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <NetworkProvider>
        <StepProvider>
          <ActivityProvider>
            <AuthGate />
          </ActivityProvider>
        </StepProvider>
      </NetworkProvider>
    </AuthProvider>
  );
}
