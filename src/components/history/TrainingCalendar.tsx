import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Activity } from '@/src/types/database';
import { DistanceUnit } from '@/src/context/PreferencesContext';
import { formatDistance, formatDuration } from '@/src/utils/formatters';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { usePreferences } from '@/src/context/PreferencesContext';

type TrainingCalendarProps = {
  activities: Activity[];
  distanceUnit: DistanceUnit;
};

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getStartDayOfWeek(year: number, month: number, weekStartsMonday: boolean): number {
  const day = new Date(year, month, 1).getDay(); // 0 = Sunday
  if (weekStartsMonday) {
    return day === 0 ? 6 : day - 1; // Monday = 0, Sunday = 6
  }
  return day; // Sunday = 0
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TrainingCalendar({ activities, distanceUnit }: TrainingCalendarProps) {
  const { colors } = useTheme();
  const { preferences } = usePreferences();
  const weekStartsMonday = preferences.weekStartsMonday;

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const dayLabels = weekStartsMonday ? DAY_LABELS_MON : DAY_LABELS_SUN;

  // Build activity map for current month: dayNumber -> activities[]
  const activityMap = useMemo(() => {
    const map: Record<number, Activity[]> = {};
    for (const act of activities) {
      const d = new Date(act.started_at);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(act);
      }
    }
    return map;
  }, [activities, currentMonth, currentYear]);

  // Monthly stats
  const monthStats = useMemo(() => {
    let totalDistance = 0;
    let totalDuration = 0;
    let totalActivities = 0;

    for (const act of activities) {
      const d = new Date(act.started_at);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        totalDistance += act.distance_meters;
        totalDuration += act.duration_seconds;
        totalActivities++;
      }
    }

    return { totalDistance, totalDuration, totalActivities };
  }, [activities, currentMonth, currentYear]);

  // Selected day activities
  const selectedDayActivities = useMemo(() => {
    if (!selectedDay) return [];
    return activities.filter((act) => isSameDay(new Date(act.started_at), selectedDay));
  }, [activities, selectedDay]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const startDay = getStartDayOfWeek(currentYear, currentMonth, weekStartsMonday);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(null);
  };

  const handleDayPress = (dayNum: number) => {
    const date = new Date(currentYear, currentMonth, dayNum);
    if (selectedDay && isSameDay(selectedDay, date)) {
      setSelectedDay(null);
    } else {
      setSelectedDay(date);
    }
  };

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  // Fill remaining cells to complete last row
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.wrapper}>
      {/* Monthly stats */}
      <View style={[styles.statsBar, { backgroundColor: colors.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatDistance(monthStats.totalDistance, distanceUnit)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Distance</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.surfaceLight }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {monthStats.totalActivities}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Activities</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.surfaceLight }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatDuration(monthStats.totalDuration)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Time</Text>
        </View>
      </View>

      {/* Month/Year header with nav arrows */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={goToPrevMonth} hitSlop={8} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} hitSlop={8} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Day header row */}
      <View style={styles.dayHeaderRow}>
        {dayLabels.map((label) => (
          <View key={label} style={styles.dayHeaderCell}>
            <Text style={[styles.dayHeaderText, { color: colors.textMuted }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.calendarRow}>
          {row.map((dayNum, colIdx) => {
            if (dayNum === null) {
              return <View key={`empty-${colIdx}`} style={styles.dayCell} />;
            }

            const isToday = isSameDay(
              new Date(currentYear, currentMonth, dayNum),
              today
            );
            const isSelected =
              selectedDay && isSameDay(selectedDay, new Date(currentYear, currentMonth, dayNum));
            const dayActivities = activityMap[dayNum] || [];
            const hasRun = dayActivities.some((a) => a.type === 'run');
            const hasWalk = dayActivities.some((a) => a.type === 'walk');

            return (
              <TouchableOpacity
                key={dayNum}
                style={[
                  styles.dayCell,
                  isToday && styles.todayCell,
                  isSelected && { backgroundColor: Colors.primary },
                ]}
                onPress={() => handleDayPress(dayNum)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    { color: colors.textPrimary },
                    isToday && !isSelected && { color: Colors.primary, fontWeight: FontWeight.bold },
                    isSelected && { color: Colors.white },
                  ]}
                >
                  {dayNum}
                </Text>
                <View style={styles.dotRow}>
                  {hasRun && <View style={[styles.activityDot, { backgroundColor: '#22C55E' }]} />}
                  {hasWalk && <View style={[styles.activityDot, { backgroundColor: '#3B82F6' }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Selected day detail */}
      {selectedDay && selectedDayActivities.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={[styles.selectedDateTitle, { color: colors.textPrimary }]}>
            {selectedDay.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          {selectedDayActivities.map((act) => (
            <View key={act.id} style={[styles.activityCard, { backgroundColor: colors.surface }]}>
              <View style={styles.activityCardHeader}>
                <View
                  style={[
                    styles.activityTypeIcon,
                    { backgroundColor: act.type === 'run' ? '#22C55E' : '#3B82F6' },
                  ]}
                >
                  <Ionicons
                    name={act.type === 'run' ? 'fitness-outline' : 'walk-outline'}
                    size={16}
                    color="#FFF"
                  />
                </View>
                <Text style={[styles.activityCardTitle, { color: colors.textPrimary }]}>
                  {act.name || (act.type === 'run' ? 'Run' : 'Walk')}
                </Text>
              </View>
              <View style={styles.activityCardStats}>
                <Text style={[styles.activityStat, { color: colors.textSecondary }]}>
                  {formatDistance(act.distance_meters, distanceUnit)}
                </Text>
                <Text style={[styles.activityStatDivider, { color: colors.textMuted }]}> | </Text>
                <Text style={[styles.activityStat, { color: colors.textSecondary }]}>
                  {formatDuration(act.duration_seconds)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {selectedDay && selectedDayActivities.length === 0 && (
        <View style={styles.selectedSection}>
          <Text style={[styles.selectedDateTitle, { color: colors.textPrimary }]}>
            {selectedDay.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <Text style={[styles.noActivitiesText, { color: colors.textMuted }]}>
            No activities this day
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.lg,
  },
  statsBar: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  statLabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    marginVertical: 4,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  navBtn: {
    padding: Spacing.sm,
  },
  monthTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  calendarRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    minHeight: 44,
    borderRadius: BorderRadius.md,
  },
  todayCell: {
    // Today outline handled via text color
  },
  dayNumber: {
    fontSize: FontSize.md,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
    height: 6,
  },
  activityDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  selectedSection: {
    marginTop: Spacing.lg,
  },
  selectedDateTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
  activityCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  activityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  activityTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  activityCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 36,
  },
  activityStat: {
    fontSize: FontSize.sm,
  },
  activityStatDivider: {
    fontSize: FontSize.sm,
  },
  noActivitiesText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});
