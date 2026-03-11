import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
const CENTER_OFFSET = Math.floor(VISIBLE_COUNT / 2);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

// ─── Scroll Wheel ───────────────────────────────────────────────

type WheelProps = {
  items: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  width: number;
  textColor: string;
  mutedColor: string;
};

function Wheel({ items, selectedIndex, onIndexChange, width, textColor, mutedColor }: WheelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isUserScroll = useRef(false);
  const momentumActive = useRef(false);
  const dragEndTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Scroll to position on mount and when selectedIndex changes externally
  useEffect(() => {
    if (!isUserScroll.current) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 80);
      return () => clearTimeout(timer);
    }
    isUserScroll.current = false;
  }, [selectedIndex, items.length]);

  const snap = useCallback(
    (y: number) => {
      const index = Math.round(y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      if (clamped !== selectedIndex) {
        isUserScroll.current = true;
        onIndexChange(clamped);
      }
    },
    [items.length, onIndexChange, selectedIndex],
  );

  return (
    <View style={[styles.wheelContainer, { width }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        bounces={Platform.OS === 'ios'}
        overScrollMode="never"
        contentContainerStyle={{
          paddingTop: CENTER_OFFSET * ITEM_HEIGHT,
          paddingBottom: CENTER_OFFSET * ITEM_HEIGHT,
        }}
        onScrollBeginDrag={() => {
          momentumActive.current = false;
        }}
        onScrollEndDrag={(e) => {
          // If momentum follows, onMomentumScrollBegin clears this timer
          dragEndTimer.current = setTimeout(() => {
            if (!momentumActive.current) {
              snap(e.nativeEvent.contentOffset.y);
            }
          }, 150);
        }}
        onMomentumScrollBegin={() => {
          momentumActive.current = true;
          if (dragEndTimer.current) clearTimeout(dragEndTimer.current);
        }}
        onMomentumScrollEnd={(e) => {
          snap(e.nativeEvent.contentOffset.y);
          momentumActive.current = false;
        }}
      >
        {items.map((label, i) => (
          <View key={`${i}`} style={styles.wheelItem}>
            <Text
              style={[
                styles.wheelText,
                { color: mutedColor },
                i === selectedIndex && [styles.wheelTextSelected, { color: textColor }],
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── DateScrollPicker ───────────────────────────────────────────

type DateScrollPickerProps = {
  value?: string; // YYYY-MM-DD
  onValueChange: (date: string) => void;
  minYear?: number;
  maxYear?: number;
  label?: string;
  placeholder?: string;
  error?: string;
  clearable?: boolean;
  containerStyle?: ViewStyle;
};

export default function DateScrollPicker({
  value,
  onValueChange,
  minYear = 1920,
  maxYear,
  label,
  placeholder = 'Select date',
  error,
  clearable = false,
  containerStyle,
}: DateScrollPickerProps) {
  const { colors } = useTheme();
  const currentYear = new Date().getFullYear();
  const effectiveMaxYear = maxYear ?? currentYear;

  const [modalVisible, setModalVisible] = useState(false);
  const [tempMonth, setTempMonth] = useState(0);
  const [tempDay, setTempDay] = useState(0);
  const [tempYear, setTempYear] = useState(0);

  const years = useMemo(() => {
    const arr: string[] = [];
    for (let y = minYear; y <= effectiveMaxYear; y++) arr.push(String(y));
    return arr;
  }, [minYear, effectiveMaxYear]);

  const maxDays = useMemo(() => {
    const month = tempMonth + 1;
    const year = minYear + tempYear;
    return daysInMonth(month, year);
  }, [tempMonth, tempYear, minYear]);

  const days = useMemo(
    () => Array.from({ length: maxDays }, (_, i) => String(i + 1)),
    [maxDays],
  );

  // Clamp day when month/year change reduces available days
  useEffect(() => {
    if (tempDay >= maxDays) setTempDay(maxDays - 1);
  }, [maxDays, tempDay]);

  const openPicker = () => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      setTempMonth(m - 1);
      setTempDay(d - 1);
      setTempYear(Math.max(0, Math.min(y - minYear, years.length - 1)));
    } else {
      const now = new Date();
      setTempMonth(now.getMonth());
      setTempDay(now.getDate() - 1);
      setTempYear(Math.max(0, Math.min(now.getFullYear() - minYear, years.length - 1)));
    }
    setModalVisible(true);
  };

  const handleDone = () => {
    const year = minYear + tempYear;
    const month = tempMonth + 1;
    const day = Math.min(tempDay + 1, daysInMonth(month, year));
    onValueChange(`${year}-${pad(month)}-${pad(day)}`);
    setModalVisible(false);
  };

  const handleClear = () => {
    onValueChange('');
    setModalVisible(false);
  };

  // Format display value as "Month Day, Year"
  const displayValue = value
    ? (() => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const [y, m, d] = value.split('-').map(Number);
        if (m < 1 || m > 12) return value;
        return `${MONTHS[m - 1]} ${d}, ${y}`;
      })()
    : '';

  return (
    <View style={containerStyle}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <TouchableOpacity
        style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }, error && { borderColor: colors.danger }]}
        onPress={openPicker}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${displayValue || placeholder}` : undefined}
      >
        <Text style={[styles.fieldText, { color: colors.textPrimary }, !displayValue && { color: colors.textMuted }]}>
          {displayValue || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
      </TouchableOpacity>
      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

      <Modal
        transparent
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[styles.pickerSheet, { backgroundColor: colors.background }]}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                <Text style={[styles.headerBtn, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              {clearable && (
                <TouchableOpacity onPress={handleClear} hitSlop={8}>
                  <Text style={[styles.headerBtn, { color: colors.danger }]}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleDone} hitSlop={8}>
                <Text style={[styles.headerBtn, { color: Colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Wheels */}
            <View style={styles.wheelsWrapper}>
              <View style={styles.wheelsRow}>
                <Wheel
                  items={MONTHS}
                  selectedIndex={tempMonth}
                  onIndexChange={setTempMonth}
                  width={140}
                  textColor={colors.textPrimary}
                  mutedColor={colors.textMuted}
                />
                <Wheel
                  items={days}
                  selectedIndex={tempDay}
                  onIndexChange={setTempDay}
                  width={60}
                  textColor={colors.textPrimary}
                  mutedColor={colors.textMuted}
                />
                <Wheel
                  items={years}
                  selectedIndex={tempYear}
                  onIndexChange={setTempYear}
                  width={80}
                  textColor={colors.textPrimary}
                  mutedColor={colors.textMuted}
                />
              </View>
              {/* Highlight bar across center row */}
              <View
                style={[
                  styles.highlightBar,
                  { borderColor: colors.border },
                ]}
                pointerEvents="none"
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- Field ---
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  field: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldText: {
    fontSize: FontSize.lg,
  },
  error: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },

  // --- Modal ---
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xxxl * 2,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  headerBtn: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },

  // --- Wheels ---
  wheelsWrapper: {
    height: PICKER_HEIGHT,
    position: 'relative',
  },
  wheelsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: PICKER_HEIGHT,
  },
  wheelContainer: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelText: {
    fontSize: FontSize.lg,
  },
  wheelTextSelected: {
    fontWeight: FontWeight.bold,
    fontSize: FontSize.xl,
  },
  highlightBar: {
    position: 'absolute',
    top: CENTER_OFFSET * ITEM_HEIGHT,
    left: Spacing.xxl,
    right: Spacing.xxl,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRadius: BorderRadius.sm,
  },
});
