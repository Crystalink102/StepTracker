import { useState, useEffect, useCallback, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import TutorialOverlay, {
  TUTORIAL_STEPS,
  hasTutorialCompleted,
  completeTutorial,
} from '@/src/components/tutorial/TutorialOverlay';
import ProfileSetupOverlay, {
  hasProfileSetupCompleted,
  completeProfileSetup,
} from '@/src/components/tutorial/ProfileSetupOverlay';
import { useProfile } from '@/src/hooks/useProfile';
import { usePreferences } from '@/src/context/PreferencesContext';
import { useTheme } from '@/src/context/ThemeContext';
import { playButtonPress } from '@/src/utils/sounds';
import { Colors } from '@/src/constants/theme';

type TabIconProps = {
  color: string;
  size: number;
  focused: boolean;
};

function HomeIcon({ color, size }: TabIconProps) {
  return <Ionicons name="home" size={size} color={color} />;
}

function ActivityIcon({ color, size, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'fitness' : 'fitness-outline'}
      size={size + 2}
      color={color}
    />
  );
}

function HistoryIcon({ color, size, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'stats-chart' : 'stats-chart-outline'}
      size={size}
      color={color}
    />
  );
}

function RanksIcon({ color, size, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'trophy' : 'trophy-outline'}
      size={size}
      color={color}
    />
  );
}

function StatsIcon({ color, size, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'analytics' : 'analytics-outline'}
      size={size}
      color={color}
    />
  );
}

function FeedIcon({ color, size, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'people' : 'people-outline'}
      size={size}
      color={color}
    />
  );
}

function ProfileIcon({ color, size, focused }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? 'person-circle' : 'person-circle-outline'}
      size={size + 2}
      color={color}
    />
  );
}

export default function TabLayout() {
  const router = useRouter();
  const { profile } = useProfile();
  const { preferences } = usePreferences();
  const { colors } = useTheme();
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Android back button: double-tap to exit
  const lastBackPress = useRef(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const handler = () => {
      const now = Date.now();
      if (now - lastBackPress.current < 2000) {
        return false; // let default behavior exit the app
      }
      lastBackPress.current = now;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true; // prevent default
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    hasTutorialCompleted().then((done) => {
      if (!done) {
        setShowTutorial(true);
      } else {
        // Tutorial already done — check if profile setup still needed
        hasProfileSetupCompleted().then((setupDone) => {
          if (!setupDone) {
            // If user already has their profile filled in (existing user),
            // silently mark setup as complete and don't show the overlay
            if (profile && (profile.username || profile.display_name || profile.avatar_url)) {
              completeProfileSetup().catch(() => {});
            } else if (profile) {
              setShowProfileSetup(true);
            }
            // If profile is still null/loading, do nothing — the effect
            // will re-run when profile loads thanks to the dependency
          }
        });
      }
    });
  }, [profile]);

  // Navigate to the matching tab when tutorial step changes
  useEffect(() => {
    if (!showTutorial) return;
    const step = TUTORIAL_STEPS[tutorialStep];
    if (step) {
      router.replace(step.route as any);
    }
  }, [showTutorial, tutorialStep, router]);

  const finishTutorialAndStartSetup = useCallback(() => {
    completeTutorial().catch(() => {});
    setShowTutorial(false);
    router.replace('/(tabs)');
    // Check if profile setup is needed
    hasProfileSetupCompleted().then((done) => {
      if (!done) setShowProfileSetup(true);
    });
  }, [router]);

  const handleNext = useCallback(() => {
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
      finishTutorialAndStartSetup();
    } else {
      setTutorialStep((s) => s + 1);
    }
  }, [tutorialStep, finishTutorialAndStartSetup]);

  const handleSkip = useCallback(() => {
    finishTutorialAndStartSetup();
  }, [finishTutorialAndStartSetup]);

  return (
    <>
      <Tabs
        screenListeners={{
          tabPress: () => {
            playButtonPress(preferences.hapticFeedback);
          },
        }}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 0.5,
            height: 85,
            paddingBottom: 25,
            paddingTop: 8,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: (props) => <HomeIcon {...props} />,
            tabBarAccessibilityLabel: 'Home tab',
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: (props) => <FeedIcon {...props} />,
            tabBarAccessibilityLabel: 'Social feed tab',
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: 'Activity',
            tabBarIcon: (props) => <ActivityIcon {...props} />,
            tabBarAccessibilityLabel: 'Start activity tab',
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: (props) => <HistoryIcon {...props} />,
            tabBarAccessibilityLabel: 'Activity history tab',
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: 'Ranks',
            tabBarIcon: (props) => <RanksIcon {...props} />,
            tabBarAccessibilityLabel: 'Leaderboard tab',
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: (props) => <StatsIcon {...props} />,
            tabBarAccessibilityLabel: 'Statistics tab',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: (props) => <ProfileIcon {...props} />,
            tabBarAccessibilityLabel: 'Profile and settings tab',
          }}
        />
      </Tabs>

      {showTutorial && (
        <TutorialOverlay
          step={tutorialStep}
          onNext={handleNext}
          onSkip={handleSkip}
        />
      )}

      {showProfileSetup && (
        <ProfileSetupOverlay
          onComplete={() => setShowProfileSetup(false)}
        />
      )}
    </>
  );
}
