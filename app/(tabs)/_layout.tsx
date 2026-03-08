import { useState, useEffect, useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import TutorialOverlay, {
  TUTORIAL_STEPS,
  hasTutorialCompleted,
  completeTutorial,
} from '@/src/components/tutorial/TutorialOverlay';
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
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => {
    hasTutorialCompleted().then((done) => {
      if (!done) setShowTutorial(true);
    });
  }, []);

  // Navigate to the matching tab when tutorial step changes
  useEffect(() => {
    if (!showTutorial) return;
    const step = TUTORIAL_STEPS[tutorialStep];
    if (step) {
      router.replace(step.route as any);
    }
  }, [showTutorial, tutorialStep, router]);

  const handleNext = useCallback(() => {
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
      completeTutorial().catch(() => {});
      setShowTutorial(false);
      // Navigate back to home after tutorial
      router.replace('/(tabs)');
    } else {
      setTutorialStep((s) => s + 1);
    }
  }, [tutorialStep, router]);

  const handleSkip = useCallback(() => {
    completeTutorial().catch(() => {});
    setShowTutorial(false);
    router.replace('/(tabs)');
  }, [router]);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 0.5,
            height: 85,
            paddingBottom: 25,
            paddingTop: 8,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
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
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: 'Activity',
            tabBarIcon: (props) => <ActivityIcon {...props} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: (props) => <HistoryIcon {...props} />,
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: 'Ranks',
            tabBarIcon: (props) => <RanksIcon {...props} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: (props) => <ProfileIcon {...props} />,
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
    </>
  );
}
