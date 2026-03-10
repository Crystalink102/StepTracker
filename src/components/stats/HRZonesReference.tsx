import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { getZoneRanges, type ZoneInfo } from '@/src/utils/hr-zones';

type Props = {
  maxHR: number;
};

export default function HRZonesReference({ maxHR }: Props) {
  const zones = getZoneRanges(maxHR);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="heart-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.title}>Heart Rate Zones</Text>
        </View>
        <Text style={styles.maxHRLabel}>Max HR: {maxHR} bpm</Text>
      </View>

      {/* Zone rows */}
      <View style={styles.zonesContainer}>
        {zones.map((z) => (
          <ZoneRow key={z.zone} zone={z} />
        ))}
      </View>
    </View>
  );
}

function ZoneRow({ zone }: { zone: ZoneInfo }) {
  return (
    <View style={styles.zoneRow}>
      {/* Color indicator + zone number */}
      <View style={[styles.zoneIndicator, { backgroundColor: zone.color }]}>
        <Text style={styles.zoneNumber}>{zone.zone}</Text>
      </View>

      {/* Name + description */}
      <View style={styles.zoneInfo}>
        <Text style={styles.zoneName}>{zone.name}</Text>
        <Text style={styles.zoneDesc} numberOfLines={2}>
          {zone.description}
        </Text>
      </View>

      {/* HR range + percent */}
      <View style={styles.zoneRange}>
        <Text style={[styles.zoneHR, { color: zone.color }]}>
          {zone.minHR}-{zone.maxHR}
        </Text>
        <Text style={styles.zonePercent}>
          {zone.minPercent}-{zone.maxPercent}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  maxHRLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  zonesContainer: {
    gap: 0,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceLight,
  },
  zoneIndicator: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneNumber: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: 2,
  },
  zoneDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    lineHeight: 15,
  },
  zoneRange: {
    alignItems: 'flex-end',
  },
  zoneHR: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  zonePercent: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
