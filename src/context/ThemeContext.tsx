import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { usePreferences } from './PreferencesContext';
import { getColors, type ThemeColors } from '@/src/constants/theme';

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { preferences, isLoaded } = usePreferences();
  const systemScheme = useColorScheme(); // 'dark' | 'light' | null

  const resolved = useMemo<'dark' | 'light'>(() => {
    if (preferences.theme === 'system') {
      return systemScheme === 'light' ? 'light' : 'dark';
    }
    return preferences.theme;
  }, [preferences.theme, systemScheme]);

  const colors = useMemo(() => getColors(resolved), [resolved]);
  const isDark = resolved === 'dark';

  // Don't render children until preferences are loaded so we don't flash wrong theme
  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
