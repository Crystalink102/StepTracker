import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import {
  getZone,
  getZoneName,
  getZoneDescription,
  getZoneColor,
  getZoneRanges,
  type ZoneInfo,
} from '@/src/utils/hr-zones';

type Props = {
  avgHeartRate: number;
  maxHR: number;
};

export default function HeartRateZones({ avgHeartRate, maxHR }: Props) {
  const { colors } = useTheme();
  const currentZone = getZone(avgHeartRate, maxHR);
  const zones = getZoneRanges(maxHR);
  const currentColor = getZoneColor(currentZone);
  const percent = Math.round((avgHeartRate / maxHR) * 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="heart" size={18} color={currentColor} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Heart Rate Zone</Text>
      </View>

      {/* Current zone badge */}
      <View style={styles.currentZoneRow}>
        <View style={[styles.zoneBadge, { backgroundColor: currentColor + '20' }]}>
          <Text style={[styles.zoneBadgeText, { color: currentColor }]}>
            Zone {currentZone}
          </Text>
        </View>
        <Text style={[styles.zoneNameText, { color: colors.textPrimary }]}>{getZoneName(currentZone)}</Text>
        <Text style={[styles.hrValueText, { color: colors.textSecondary }]}>
          {avgHeartRate} bpm ({percent}%)
        </Text>
      </View>

      {/* Zone bar chart */}
      <View style={styles.barsContainer}>
        {zones.map((z) => (
          <ZoneBar key={z.zone} zone={z} isActive={z.zone === currentZone} colors={colors} />
        ))}
      </View>

      {/* Description */}
      <Text style={[styles.description, { color: colors.textSecondary }]}>{getZoneDescription(currentZone)}</Text>
    </View>
  );
}

function ZoneBar({ zone, isActive, colors }: { zone: ZoneInfo; isActive: boolean; colors: any }) {
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: colors.textMuted }, isActive && { color: zone.color, fontWeight: FontWeight.bold }]}>
        Z{zone.zone}
      </Text>
      <View style={[styles.barTrack, { backgroundColor: colors.surfaceLight }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${zone.maxPercent}%`,
              backgroundColor: isActive ? zone.color : zone.color + '30',
            },
          ]}
        />
        {isActive && (
          <View style={[styles.barIndicator, { left: `${(zone.minPercent + zone.maxPercent) / 2}%` }]}>
            <View style={[styles.indicatorDot, { backgroundColor: zone.color, borderColor: colors.surface }]} />
          </View>
        )}
      </View>
      <Text style={[styles.barRange, { color: colors.textMuted }, isActive && { color: colors.textPrimary }]}>
        {zone.minHR}-{zone.maxHR}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  currentZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  zoneBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  zoneBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  zoneNameText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  hrValueText: {
    fontSize: FontSize.sm,
  },
  barsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barLabel: {
    width: 22,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  barTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barIndicator: {
    position: 'absolute',
    top: -2,
    marginLeft: -8,
  },
  indicatorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  barRange: {
    width: 62,
    textAlign: 'right',
    fontSize: FontSize.xs,
  },
  description: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
});
