import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NUM_PIECES = 40;
const DURATION = 2000;

const COLORS = ['#A855F7', '#FFD700', '#22C55E', '#3B82F6', '#EC4899', '#F59E0B'];

type ConfettiProps = {
  visible: boolean;
  onComplete?: () => void;
};

type Piece = {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  isCircle: boolean;
  startX: number;
};

function createPieces(): Piece[] {
  return Array.from({ length: NUM_PIECES }, () => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    rotate: new Animated.Value(0),
    opacity: new Animated.Value(1),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 6,
    isCircle: Math.random() > 0.5,
    startX: Math.random() * SCREEN_WIDTH,
  }));
}

export default function Confetti({ visible, onComplete }: ConfettiProps) {
  const piecesRef = useRef<Piece[]>(createPieces());

  useEffect(() => {
    if (!visible) return;

    // Reset pieces
    piecesRef.current = createPieces();
    const pieces = piecesRef.current;

    const animations = pieces.map((piece) => {
      const drift = (Math.random() - 0.5) * SCREEN_WIDTH * 0.6;
      const fallDuration = DURATION + Math.random() * 500;

      return Animated.parallel([
        Animated.timing(piece.y, {
          toValue: SCREEN_HEIGHT + 50,
          duration: fallDuration,
          useNativeDriver: true,
        }),
        Animated.timing(piece.x, {
          toValue: drift,
          duration: fallDuration,
          useNativeDriver: true,
        }),
        Animated.timing(piece.rotate, {
          toValue: 360 * (2 + Math.random() * 3),
          duration: fallDuration,
          useNativeDriver: true,
        }),
        Animated.timing(piece.opacity, {
          toValue: 0,
          duration: fallDuration,
          delay: fallDuration * 0.6,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.stagger(30, animations).start(() => {
      onComplete?.();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {piecesRef.current.map((piece, i) => (
        <Animated.View
          key={i}
          style={[
            {
              position: 'absolute',
              left: piece.startX,
              top: -20,
              width: piece.size,
              height: piece.isCircle ? piece.size : piece.size * 1.5,
              borderRadius: piece.isCircle ? piece.size / 2 : 2,
              backgroundColor: piece.color,
              opacity: piece.opacity,
              transform: [
                { translateX: piece.x },
                { translateY: piece.y },
                {
                  rotate: piece.rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
