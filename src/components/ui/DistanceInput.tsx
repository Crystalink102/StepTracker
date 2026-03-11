import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { usePreferences, type DistanceUnit } from '@/src/context/PreferencesContext';

// ─── Conversion helpers ──────────────────────────────────────────────
const KM_TO_MI = 0.621371;

function metersToUnit(meters: number, unit: DistanceUnit): number {
  if (unit === 'm') return meters;
  if (unit === 'km') return meters / 1000;
  // mi
  return (meters / 1000) * KM_TO_MI;
}

function unitToMeters(value: number, unit: DistanceUnit): number {
  if (unit === 'm') return value;
  if (unit === 'km') return value * 1000;
  // mi → meters
  return (value / KM_TO_MI) * 1000;
}

// ─── Props ───────────────────────────────────────────────────────────
type DistanceInputProps = {
  value: number; // meters internally
  onChange: (meters: number) => void;
  label?: string;
  error?: string;
  defaultUnit?: DistanceUnit;
};

const UNIT_OPTIONS: { label: string; value: DistanceUnit }[] = [
  { label: 'm', value: 'm' },
  { label: 'km', value: 'km' },
  { label: 'mi', value: 'mi' },
];

export default function DistanceInput({
  value,
  onChange,
  label,
  error,
  defaultUnit,
}: DistanceInputProps) {
  const { colors } = useTheme();
  const { preferences } = usePreferences();
  const [unit, setUnit] = useState<DistanceUnit>(defaultUnit ?? preferences.distanceUnit);
  const [displayText, setDisplayText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  // Track the last meters value we set via onChange so we can detect external changes
  const [lastSetMeters, setLastSetMeters] = useState(value);

  // Sync display text when the value prop changes externally (not from user typing)
  useEffect(() => {
    // Only update display if the value was changed externally (not from our own onChange)
    if (Math.abs(value - lastSetMeters) > 0.5 || (value > 0 && displayText === '')) {
      const displayed = metersToUnit(value, unit);
      const rounded = unit === 'm' ? Math.round(displayed) : parseFloat(displayed.toFixed(2));
      setDisplayText(rounded > 0 ? rounded.toString() : '');
      setLastSetMeters(value);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // When user switches units, convert the displayed number
  const handleUnitChange = useCallback(
    (newUnit: DistanceUnit) => {
      if (newUnit === unit) return;

      // Convert the current value to the new unit for display
      const displayed = metersToUnit(value, newUnit);
      const rounded = newUnit === 'm'
        ? Math.round(displayed)
        : parseFloat(displayed.toFixed(2));

      setUnit(newUnit);
      setDisplayText(rounded > 0 ? rounded.toString() : '');
    },
    [unit, value],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      // Allow empty string, digits, and one decimal point
      const cleaned = text.replace(/[^0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = cleaned.split('.');
      const sanitized = parts.length > 2
        ? parts[0] + '.' + parts.slice(1).join('')
        : cleaned;

      setDisplayText(sanitized);

      const parsed = parseFloat(sanitized);
      if (!isNaN(parsed) && parsed >= 0) {
        const meters = unitToMeters(parsed, unit);
        setLastSetMeters(meters);
        onChange(meters);
      } else if (sanitized === '' || sanitized === '.') {
        setLastSetMeters(0);
        onChange(0);
      }
    },
    [unit, onChange],
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Round the meters value to avoid floating-point drift
    const rounded = Math.round(value);
    setLastSetMeters(rounded);
    onChange(rounded);

    // Re-display the rounded value
    const displayed = metersToUnit(rounded, unit);
    const displayRounded = unit === 'm'
      ? Math.round(displayed)
      : parseFloat(displayed.toFixed(2));
    setDisplayText(displayRounded > 0 ? displayRounded.toString() : '');
  }, [value, unit, onChange]);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      )}

      <View style={styles.inputRow}>
        {/* Numeric input */}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              color: colors.textPrimary,
              borderColor: colors.border,
            },
            isFocused && styles.inputFocused,
            error ? { borderColor: colors.danger } : undefined,
          ]}
          value={displayText}
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          accessibilityLabel={label ?? 'Distance'}
        />

        {/* Unit segment buttons */}
        <View style={[styles.segmentContainer, { backgroundColor: colors.surfaceLight }]}>
          {UNIT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.segment,
                unit === opt.value && styles.segmentActive,
              ]}
              onPress={() => handleUnitChange(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: unit === opt.value }}
              accessibilityLabel={opt.label}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: colors.textMuted },
                  unit === opt.value && styles.segmentTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error && (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    borderWidth: 1,
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  segment: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  segmentTextActive: {
    color: Colors.white,
  },
  error: {
    fontSize: FontSize.sm,
  },
});
