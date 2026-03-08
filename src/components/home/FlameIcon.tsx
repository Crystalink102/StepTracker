import { View, StyleSheet } from 'react-native';

type FlameColors = {
  outer: string;
  middle: string;
  inner: string;
};

// Color tiers that get more intense as streak grows
const FLAME_TIERS: { min: number; colors: FlameColors }[] = [
  { min: 30, colors: { outer: '#7E22CE', middle: '#A855F7', inner: '#E9D5FF' } }, // Purple legendary
  { min: 14, colors: { outer: '#DC2626', middle: '#EF4444', inner: '#FCA5A5' } }, // Red hot
  { min: 7,  colors: { outer: '#EA580C', middle: '#F97316', inner: '#FDBA74' } }, // Deep orange
  { min: 3,  colors: { outer: '#FF4500', middle: '#FF8C00', inner: '#FFD700' } }, // Standard fire
  { min: 0,  colors: { outer: '#9CA3AF', middle: '#D1D5DB', inner: '#F3F4F6' } }, // Gray starter
];

function getFlameColors(streak: number): FlameColors {
  for (const tier of FLAME_TIERS) {
    if (streak >= tier.min) return tier.colors;
  }
  return FLAME_TIERS[FLAME_TIERS.length - 1].colors;
}

type FlameIconProps = {
  size?: number;
  streak?: number;
};

export default function FlameIcon({ size = 40, streak = 1 }: FlameIconProps) {
  const scale = size / 40;
  const colors = getFlameColors(streak);

  return (
    <View style={[styles.container, { width: size, height: size * 1.3 }]}>
      {/* Outer flame */}
      <View
        style={[
          styles.flame,
          {
            backgroundColor: colors.outer,
            width: 30 * scale,
            height: 44 * scale,
            borderRadius: (30 * scale) / 2,
            borderTopLeftRadius: (30 * scale) / 2,
            borderTopRightRadius: (30 * scale) / 2,
            borderBottomLeftRadius: 14 * scale,
            borderBottomRightRadius: 14 * scale,
            bottom: 0,
          },
        ]}
      />
      {/* Middle flame */}
      <View
        style={[
          styles.flame,
          {
            backgroundColor: colors.middle,
            width: 20 * scale,
            height: 32 * scale,
            borderRadius: (20 * scale) / 2,
            borderTopLeftRadius: (20 * scale) / 2,
            borderTopRightRadius: (20 * scale) / 2,
            borderBottomLeftRadius: 10 * scale,
            borderBottomRightRadius: 10 * scale,
            bottom: 0,
          },
        ]}
      />
      {/* Inner core */}
      <View
        style={[
          styles.flame,
          {
            backgroundColor: colors.inner,
            width: 10 * scale,
            height: 18 * scale,
            borderRadius: (10 * scale) / 2,
            borderTopLeftRadius: (10 * scale) / 2,
            borderTopRightRadius: (10 * scale) / 2,
            borderBottomLeftRadius: 5 * scale,
            borderBottomRightRadius: 5 * scale,
            bottom: 0,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  flame: {
    position: 'absolute',
  },
});
