import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import type { Lap } from '@/src/context/ActivityContext';

type Props = {
  lap: Lap | null;
  distanceUnit?: string;
};

export default function LapBanner({ lap, distanceUnit = 'km' }: Props) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [displayedLap, setDisplayedLap] = useState<Lap | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastLapNumber = useRef(0);

  useEffect(() => {
    if (!lap || lap.lapNumber === lastLapNumber.current) return;
    lastLapNumber.current = lap.lapNumber;
    setDisplayedLap(lap);

    // Clear any existing dismiss timer
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }

    // Animate in
    slideAnim.setValue(-80);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 4 seconds
    dismissTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -80,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setDisplayedLap(null);
      });
    }, 4000);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [lap, slideAnim, opacityAnim]);

  if (!displayedLap) return null;

  const KM_PER_MILE = 1.60934;
  const rawPace = distanceUnit === 'mi'
    ? displayedLap.paceSecPerKm * KM_PER_MILE
    : displayedLap.paceSecPerKm;
  const paceMin = Math.floor(rawPace / 60);
  const paceSec = Math.round(rawPace % 60);
  const paceText = `${paceMin}:${paceSec.toString().padStart(2, '0')}/${distanceUnit === 'mi' ? 'mi' : 'km'}`;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.banner}>
        <Text style={styles.lapText}>
          Lap {displayedLap.lapNumber}
        </Text>
        <Text style={styles.paceText}>
          {paceText}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 100,
  },
  banner: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  lapText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  paceText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
});
