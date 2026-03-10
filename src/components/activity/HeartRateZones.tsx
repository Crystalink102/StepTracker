import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
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
  const currentZone = getZone(avgHeartRate, maxHR);
  const zones = getZoneRanges(maxHR);
  const currentColor = getZoneColor(currentZone);
  const percent = Math.round((avgHeartRate / maxHR) * 100);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="heart" size={18} color={currentColor} />
        <Text style={styles.title}>Heart Rate Zone</Text>
      </View>

      {/* Current zone badge */}
      <View style={styles.currentZoneRow}>
        <View style={[styles.zoneBadge, { backgroundColor: currentColor + '20' }]}>
          <Text style={[styles.zoneBadgeText, { color: currentColor }]}>
            Zone {currentZone}
          </Text>
        </View>
        <Text style={styles.zoneNameText}>{getZoneName(currentZone)}</Text>
        <Text style={styles.hrValueText}>
          {avgHeartRate} bpm ({percent}%)
        </Text>
      </View>

      {/* Zone bar chart */}
      <View style={styles.barsContainer}>
        {zones.map((z) => (
          <ZoneBar key={z.zone} zone={z} isActive={z.zone === currentZone} />
        ))}
      </View>

      {/* Description */}
      <Text style={styles.description}>{getZoneDescription(currentZone)}</Text>
    </View>
  );
}

function ZoneBar({ zone, isActive }: { zone: ZoneInfo; isActive: boolean }) {
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, isActive && { color: zone.color, fontWeight: FontWeight.bold }]}>
        Z{zone.zone}
      </Text>
      <View style={styles.barTrack}>
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
            <View style={[styles.indicatorDot, { backgroundColor: zone.color }]} />
          </View>
        )}
      </View>
      <Text style={[styles.barRange, isActive && { color: Colors.textPrimary }]}>
        {zone.minHR}-{zone.maxHR}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
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
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  hrValueText: {
    color: Colors.textSecondary,
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
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.surfaceLight,
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
    borderColor: Colors.surface,
  },
  barRange: {
    width: 62,
    textAlign: 'right',
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
});
