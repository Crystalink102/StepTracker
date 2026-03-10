// --- Dark theme colors (original) ---
export const DarkColors = {
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
  gold: '#FFD700',          // Goal hit, celebrations

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

// --- Light theme colors ---
export const LightColors: typeof DarkColors = {
  primary: '#A855F7',       // Purple 500 - stays the same
  primaryLight: '#C084FC',  // Purple 400
  primaryDark: '#7E22CE',   // Purple 700
  secondary: '#A855F7',
  secondaryLight: '#C084FC',
  secondaryDark: '#7E22CE',
  accent: '#E9D5FF',
  accentLight: '#F3E8FF',
  danger: '#EF4444',
  dangerLight: '#FCA5A5',
  warning: '#F59E0B',
  gold: '#FFD700',

  // Neutrals - light theme
  background: '#F5F5F5',    // Light gray background
  surface: '#F4F4F5',       // Zinc 100
  surfaceLight: '#E4E4E7',  // Zinc 200
  border: '#D4D4D8',        // Zinc 300
  textPrimary: '#18181B',   // Zinc 900
  textSecondary: '#52525B', // Zinc 600
  textMuted: '#71717A',     // Zinc 500
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export type ThemeColors = typeof DarkColors;

/** Returns the color set for the given theme mode */
export function getColors(theme: 'dark' | 'light'): ThemeColors {
  return theme === 'dark' ? DarkColors : LightColors;
}

// Default export stays dark for backward compatibility
export const Colors = DarkColors;

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
