import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
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
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { ToastProvider } from '@/src/context/ToastContext';
import { NotificationCenterProvider } from '@/src/context/NotificationCenterContext';

import DownloadBanner from '@/src/components/DownloadBanner';

// Root ErrorBoundary must NOT use useTheme() — it renders outside providers.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: Colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
        Something went wrong
      </Text>
      <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
        {error.message}
      </Text>
      <View style={{ backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 }}>
        <Text onPress={retry} style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Try Again</Text>
      </View>
    </View>
  );
}

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { isAuthenticated, isLoading, hasMFA, mfaVerified } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [stackMounted, setStackMounted] = useState(false);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Register notifications when authenticated
  useNotifications();

  // Ready when auth is done loading AND either:
  // - not authenticated (show login), OR
  // - profile loading is finished (even if profile is null — handle that in routing)
  const authReady = !isLoading && (!isAuthenticated || !profileLoading);

  useEffect(() => {
    if (!stackMounted) return;
    if (!authReady) return;

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
  }, [isAuthenticated, isLoading, authReady, profile, profileLoading, hasMFA, mfaVerified, segments, router, stackMounted]);

  if (!authReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <DownloadBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
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
        <Stack.Screen
          name="challenges"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="notifications"
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
            <ThemeProvider>
              <ToastProvider>
              <NotificationCenterProvider>
              <StepProvider>
                <ActivityProvider>
                  <AuthGate />
                </ActivityProvider>
              </StepProvider>
              </NotificationCenterProvider>
              </ToastProvider>
            </ThemeProvider>
          </NetworkProvider>
        </PreferencesProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
