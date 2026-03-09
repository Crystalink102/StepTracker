import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
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
  const [stackMounted, setStackMounted] = useState(false);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Register notifications when authenticated
  useNotifications();

  useEffect(() => {
    if (!stackMounted) return;
    if (isLoading || (isAuthenticated && profileLoading)) return;

    // Clear any pending navigation
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const needsMFAVerification = isAuthenticated && hasMFA && !mfaVerified;
    const onMFAScreen = inAuthGroup && segments[1] === 'verify-mfa';
    const needsOnboarding = isAuthenticated && profile && profile.height_cm === null;

    let target: string | null = null;

    if (!isAuthenticated && !inAuthGroup) {
      target = '/(auth)/login';
    } else if (needsMFAVerification && !onMFAScreen) {
      target = '/(auth)/verify-mfa';
    } else if (isAuthenticated && !needsMFAVerification && inAuthGroup) {
      target = needsOnboarding ? '/(onboarding)/welcome' : '/(tabs)';
    } else if (needsOnboarding && !inOnboarding && !needsMFAVerification) {
      target = '/(onboarding)/welcome';
    } else if (isAuthenticated && inOnboarding && !needsOnboarding && !needsMFAVerification) {
      target = '/(tabs)';
    }

    if (target) {
      const dest = target;
      // Defer navigation to next tick so the Stack screens have time to register
      navTimeoutRef.current = setTimeout(() => {
        try { router.replace(dest as any); } catch { /* navigator not ready */ }
      }, 50);
    }

    return () => { if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current); };
  }, [isAuthenticated, isLoading, profileLoading, profile, hasMFA, mfaVerified, segments, router, stackMounted]);

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
        screenListeners={{
          state: () => {
            // Fires when the navigator state is initialized — screens are registered
            if (!stackMounted) setStackMounted(true);
          },
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
