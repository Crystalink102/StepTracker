import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Preference types ---

export type DistanceUnit = 'km' | 'mi' | 'm';
export type HeightUnit = 'cm' | 'ft';
export type WeightUnit = 'kg' | 'lb';

export type Preferences = {
  distanceUnit: DistanceUnit;
  heightUnit: HeightUnit;
  weightUnit: WeightUnit;
  autoPause: boolean;
  hapticFeedback: boolean;
  mapTraffic: boolean;
  keepScreenOn: boolean;
  weekStartsMonday: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  distanceUnit: 'km',
  heightUnit: 'cm',
  weightUnit: 'kg',
  autoPause: true,
  hapticFeedback: true,
  mapTraffic: false,
  keepScreenOn: true,
  weekStartsMonday: true,
};

const STORAGE_KEY = 'user_preferences';

type PreferencesContextValue = {
  preferences: Preferences;
  updatePreference: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => void;
  isLoaded: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const updatePreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPreferences((prev) => {
        const next = { ...prev, [key]: value };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreference, isLoaded }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
