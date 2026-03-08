import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

const TUTORIAL_KEY = 'tutorial_completed';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type TutorialStep = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  tab: string;
  spotlight: 'top' | 'bottom';
};

const STEPS: TutorialStep[] = [
  {
    icon: 'home',
    title: 'Your Dashboard',
    description:
      'This is your home base. Track your daily steps, see your XP level, and keep your streak alive. Everything updates in real-time as you walk.',
    tab: 'Home',
    spotlight: 'top',
  },
  {
    icon: 'fitness',
    title: 'Start an Activity',
    description:
      'Tap here to start tracking a run or walk with GPS. You\'ll see a live map of your route, distance, pace, and elapsed time. Just hit Start and go!',
    tab: 'Activity',
    spotlight: 'bottom',
  },
  {
    icon: 'stats-chart',
    title: 'Your History',
    description:
      'View your step charts, personal bests, and every run you\'ve completed. Pull down to refresh. Tap any activity to see the full route map.',
    tab: 'History',
    spotlight: 'bottom',
  },
  {
    icon: 'trophy',
    title: 'Compete & Rank Up',
    description:
      'See how you stack up against friends and the community. Filter by steps, distance, or XP across different time periods.',
    tab: 'Ranks',
    spotlight: 'bottom',
  },
  {
    icon: 'person-circle',
    title: 'Your Profile',
    description:
      'View your stats, achievements, and manage your settings. Customize your units, notifications, and connect with friends.',
    tab: 'Profile',
    spotlight: 'bottom',
  },
];

type Props = {
  onComplete: () => void;
};

export default function TutorialOverlay({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Entrance animation
  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Progress bar animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEPS.length,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  // Pulse animation for the icon
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    animateIn();
  }, [step, animateIn]);

  const handleNext = () => {
    if (isLast) {
      AsyncStorage.setItem(TUTORIAL_KEY, 'true').catch(() => {});
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    AsyncStorage.setItem(TUTORIAL_KEY, 'true').catch(() => {});
    onComplete();
  };

  return (
    <View style={styles.overlay}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Step indicator */}
      <View style={styles.stepDots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
          />
        ))}
      </View>

      {/* Content card */}
      <Animated.View
        style={[
          styles.card,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Icon circle with pulse */}
        <Animated.View
          style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}
        >
          <Ionicons name={current.icon} size={40} color={Colors.white} />
        </Animated.View>

        {/* Tab label chip */}
        <View style={styles.tabChip}>
          <Text style={styles.tabChipText}>{current.tab}</Text>
        </View>

        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.description}>{current.description}</Text>

        {/* Action buttons */}
        <View style={styles.actions}>
          {!isLast && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
            <Text style={styles.nextText}>{isLast ? "Let's Go!" : 'Next'}</Text>
            {!isLast && (
              <Ionicons
                name="arrow-forward"
                size={18}
                color={Colors.white}
                style={{ marginLeft: 6 }}
              />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Bottom tab preview */}
      <View style={styles.tabPreview}>
        {STEPS.map((s, i) => {
          const isCurrentTab = i === step;
          return (
            <View key={i} style={styles.tabItem}>
              <Ionicons
                name={s.icon}
                size={22}
                color={isCurrentTab ? Colors.primary : Colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isCurrentTab && styles.tabLabelActive,
                ]}
              >
                {s.tab}
              </Text>
              {isCurrentTab && <View style={styles.tabIndicator} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Check if the tutorial has been completed */
export async function hasTutorialCompleted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(TUTORIAL_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/** Reset tutorial (for testing or settings) */
export async function resetTutorial(): Promise<void> {
  await AsyncStorage.removeItem(TUTORIAL_KEY);
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  progressContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 60,
    left: Spacing.xxxl,
    right: Spacing.xxxl,
    height: 3,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stepDots: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 36 : 76,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceLight,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  dotDone: {
    backgroundColor: Colors.primaryLight,
  },
  card: {
    width: SCREEN_W - 48,
    maxWidth: 400,
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  tabChip: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  tabChipText: {
    color: Colors.primaryLight,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  skipBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.full,
  },
  nextText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  tabPreview: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'web' ? 16 : 30,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
  },
  tabLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  tabIndicator: {
    position: 'absolute',
    top: -10,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});
