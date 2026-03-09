import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { ProfileProvider } from '@/src/context/ProfileContext';
import { PreferencesProvider } from '@/src/context/PreferencesContext';
import { supabase } from '@/src/services/supabase';
import { StepProvider } from '@/src/context/StepContext';
import { ActivityProvider } from '@/src/context/ActivityContext';
import { NetworkProvider } from '@/src/context/NetworkContext';
import { useNotifications } from '@/src/hooks/useNotifications';
import { useProfile } from '@/src/hooks/useProfile';
import { Colors } from '@/src/constants/theme';

import { ErrorScreen } from '@/src/components/ui';
import DownloadBanner from '@/src/components/DownloadBanner';

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} />;
}

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { isAuthenticated, isLoading, hasMFA, mfaVerified } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const segments = useSegments();
  const router = useRouter();
  // Register notifications when authenticated
  useNotifications();

  // Check if the navigator has mounted and registered its routes.
  // On web, key may be undefined but routes will exist.
  // On Expo Go, both may be missing until the Stack mounts.
  const rootState = useRootNavigationState();
  const isNavigatorReady = !!(rootState?.key || rootState?.routes?.length);

  useEffect(() => {
    if (!isNavigatorReady) return;
    if (isLoading || (isAuthenticated && profileLoading)) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const needsMFAVerification = isAuthenticated && hasMFA && !mfaVerified;
    const onMFAScreen = inAuthGroup && segments[1] === 'verify-mfa';
    const needsOnboarding = isAuthenticated && profile && profile.height_cm === null;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (needsMFAVerification && !onMFAScreen) {
      router.replace('/(auth)/verify-mfa');
    } else if (isAuthenticated && !needsMFAVerification && inAuthGroup) {
      if (needsOnboarding) {
        router.replace('/(onboarding)/welcome');
      } else {
        router.replace('/(tabs)');
      }
    } else if (needsOnboarding && !inOnboarding && !needsMFAVerification) {
      router.replace('/(onboarding)/welcome');
    } else if (isAuthenticated && inOnboarding && !needsOnboarding && !needsMFAVerification) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, profileLoading, profile, hasMFA, mfaVerified, segments, router, isNavigatorReady]);

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
      <DownloadBanner />
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

function useDeepLinkAuth() {
  useEffect(() => {
    // Handle deep link that opened the app
    const handleUrl = (url: string) => {
      const parsed = Linking.parse(url);
      // Supabase appends tokens as hash fragment params
      // expo-linking puts fragment params in queryParams when parsing
      const accessToken = parsed.queryParams?.access_token as string | undefined;
      const refreshToken = parsed.queryParams?.refresh_token as string | undefined;
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    };

    // Check the URL that launched the app
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Listen for URLs while the app is open
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  useDeepLinkAuth();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <ProfileProvider>
        <PreferencesProvider>
          <NetworkProvider>
            <StepProvider>
              <ActivityProvider>
                <AuthGate />
              </ActivityProvider>
            </StepProvider>
          </NetworkProvider>
        </PreferencesProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
