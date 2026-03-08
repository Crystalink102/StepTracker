import { useEffect, useMemo } from 'react';
import { View, Text, Modal, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import FlameIcon from './FlameIcon';
import Button from '@/src/components/ui/Button';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = ['#A855F7', '#C084FC', '#7E22CE', '#E9D5FF', '#FFD700', '#FFC107'];
const CONFETTI_COUNT = 35;

type StreakPopupProps = {
  visible: boolean;
  streak: number;
  onDismiss: () => void;
};

type ConfettiPiece = {
  x: number;
  delay: number;
  size: number;
  color: string;
  rotation: number;
  isCircle: boolean;
};

function ConfettiParticle({ piece }: { piece: ConfettiPiece }) {
  const translateY = useSharedValue(-20);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      piece.delay,
      withTiming(SCREEN_HEIGHT + 50, { duration: 2500 + Math.random() * 1500 })
    );
    rotate.value = withDelay(
      piece.delay,
      withTiming(piece.rotation, { duration: 2500 + Math.random() * 1500 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: piece.x,
          top: -20,
          width: piece.size,
          height: piece.isCircle ? piece.size : piece.size * 1.4,
          backgroundColor: piece.color,
          borderRadius: piece.isCircle ? piece.size / 2 : 2,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function StreakPopup({ visible, streak, onDismiss }: StreakPopupProps) {
  const flameScale = useSharedValue(0);

  const confettiPieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: CONFETTI_COUNT }, () => ({
      x: Math.random() * SCREEN_WIDTH,
      delay: Math.random() * 800,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: 360 + Math.random() * 720,
      isCircle: Math.random() > 0.5,
    }));
  }, []);

  useEffect(() => {
    if (visible) {
      flameScale.value = 0;
      flameScale.value = withDelay(
        200,
        withSpring(1, { damping: 8, stiffness: 120 })
      );
    }
  }, [visible]);

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        {/* Confetti layer */}
        {confettiPieces.map((piece, i) => (
          <ConfettiParticle key={i} piece={piece} />
        ))}

        {/* Center content */}
        <View style={styles.center}>
          <Animated.View style={flameAnimatedStyle}>
            <FlameIcon size={120} streak={streak} />
          </Animated.View>

          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakLabel}>day streak!</Text>
        </View>

        {/* Bottom button */}
        <View style={styles.bottom}>
          <Button
            title="Proceed"
            onPress={onDismiss}
            variant="primary"
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNumber: {
    color: Colors.textPrimary,
    fontSize: 72,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.xl,
  },
  streakLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.xs,
  },
  bottom: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxl + 16,
  },
  button: {
    width: '100%',
  },
});
