import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type Props = {
  vo2max: number | null;
  rating: { label: string; color: string; description: string } | null;
};

export default function VO2maxCard({ vo2max, rating }: Props) {
  const { colors } = useTheme();

  if (!vo2max || !rating) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Ionicons name="pulse-outline" size={20} color={Colors.primary} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>VO2max Estimate</Text>
        </View>
        <View style={styles.emptyBody}>
          <View style={[styles.circleEmpty, { borderColor: colors.surfaceLight }]}>
            <Text style={[styles.emptyDash, { color: colors.textMuted }]}>--</Text>
          </View>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Not enough data</Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            Complete more runs over 20 minutes to estimate your VO2max
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.header, styles.headerBorder, { borderBottomColor: colors.surfaceLight }]}>
        <Ionicons name="pulse-outline" size={20} color={Colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>VO2max Estimate</Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Circular indicator */}
        <View style={[styles.circle, { borderColor: rating.color }]}>
          <Text style={[styles.vo2Value, { color: rating.color }]}>{vo2max}</Text>
          <Text style={[styles.vo2Unit, { color: colors.textMuted }]}>ml/kg/min</Text>
        </View>

        {/* Rating info */}
        <View style={styles.ratingInfo}>
          <View style={[styles.ratingBadge, { backgroundColor: rating.color + '20' }]}>
            <View style={[styles.ratingDot, { backgroundColor: rating.color }]} />
            <Text style={[styles.ratingLabel, { color: rating.color }]}>{rating.label}</Text>
          </View>
          <Text style={[styles.ratingDescription, { color: colors.textSecondary }]}>
            {rating.description}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  headerBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  circle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vo2Value: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  vo2Unit: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  ratingInfo: {
    flex: 1,
    gap: Spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  ratingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ratingLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  ratingDescription: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  emptyBody: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  circleEmpty: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyDash: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
});
