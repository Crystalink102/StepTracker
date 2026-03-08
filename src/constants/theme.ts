export const Colors = {
  primary: '#A855F7',       // Purple 500 - main brand
  primaryLight: '#C084FC',  // Purple 400
  primaryDark: '#7E22CE',   // Purple 700
  secondary: '#A855F7',     // Purple - XP bar
  secondaryLight: '#C084FC',
  secondaryDark: '#7E22CE',
  accent: '#E9D5FF',        // Purple 200 - achievements / badges
  accentLight: '#F3E8FF',
  danger: '#EF4444',
  dangerLight: '#FCA5A5',
  warning: '#F59E0B',

  // Neutrals - true dark theme
  background: '#09090B',    // Zinc 950 - deep black
  surface: '#18181B',       // Zinc 900
  surfaceLight: '#27272A',  // Zinc 800
  border: '#3F3F46',        // Zinc 700
  textPrimary: '#FAFAFA',   // Zinc 50
  textSecondary: '#A1A1AA', // Zinc 400
  textMuted: '#71717A',     // Zinc 500
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  display: 36,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;
