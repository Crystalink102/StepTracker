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
const { width: SCREEN_W } = Dimensions.get('window');

export type TutorialStep = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  tabLabel: string;
  route: string;
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: 'home',
    title: 'Your Dashboard',
    description:
      'This is your home base. Track your daily steps, see your XP level, and keep your streak alive. Everything updates in real-time as you walk.',
    tabLabel: 'Home',
    route: '/(tabs)',
  },
  {
    icon: 'fitness',
    title: 'Start an Activity',
    description:
      'Tap here to start tracking a run or walk with GPS. You\'ll see a live map of your route, distance, pace, and elapsed time.',
    tabLabel: 'Activity',
    route: '/(tabs)/activity',
  },
  {
    icon: 'stats-chart',
    title: 'Your History',
    description:
      'View your step charts, personal bests, and every run you\'ve completed. Tap any activity to see the full route map.',
    tabLabel: 'History',
    route: '/(tabs)/history',
  },
  {
    icon: 'trophy',
    title: 'Compete & Rank Up',
    description:
      'See how you stack up against friends and the community. Filter by steps, distance, or XP across different time periods.',
    tabLabel: 'Ranks',
    route: '/(tabs)/leaderboard',
  },
  {
    icon: 'analytics',
    title: 'Your Stats',
    description:
      'Dive deep into your lifetime stats, personal bests across all distances, pace trends, and activity breakdowns. Track your progress over time.',
    tabLabel: 'Stats',
    route: '/(tabs)/stats',
  },
  {
    icon: 'person-circle',
    title: 'Your Profile',
    description:
      'View your stats, unlock achievements, and manage your settings. Customize units, notifications, and connect with friends.',
    tabLabel: 'Profile',
    route: '/(tabs)/profile',
  },
];

type Props = {
  step: number;
  onNext: () => void;
  onSkip: () => void;
};

export default function TutorialOverlay({ step, onNext, onSkip }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  // Entrance animation
  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / TUTORIAL_STEPS.length,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  // Icon pulse
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
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

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Darkened backdrop — tappable area that doesn't block tab bar */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onNext}
      />

      {/* Card positioned in the center area above the tab bar */}
      <Animated.View
        style={[
          styles.card,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
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

        {/* Step dots */}
        <View style={styles.stepDots}>
          {TUTORIAL_STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === step && styles.dotActive,
                i < step && styles.dotDone,
              ]}
            />
          ))}
        </View>

        {/* Icon */}
        <Animated.View
          style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}
        >
          <Ionicons name={current.icon} size={36} color={Colors.white} />
        </Animated.View>

        {/* Tab label chip */}
        <View style={styles.tabChip}>
          <Text style={styles.tabChipText}>{current.tabLabel}</Text>
        </View>

        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.description}>{current.description}</Text>

        {/* Actions */}
        <View style={styles.actions}>
          {!isLast && (
            <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onNext} style={styles.nextBtn}>
            <Text style={styles.nextText}>
              {isLast ? "Got it!" : 'Next'}
            </Text>
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

/** Mark tutorial as completed */
export async function completeTutorial(): Promise<void> {
  await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
}

/** Reset tutorial (for replay from settings) */
export async function resetTutorial(): Promise<void> {
  await AsyncStorage.removeItem(TUTORIAL_KEY);
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  card: {
    width: SCREEN_W - 48,
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    // Lift above the backdrop
    elevation: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  progressContainer: {
    width: '100%',
    height: 3,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xl,
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
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.sm,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
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
});
