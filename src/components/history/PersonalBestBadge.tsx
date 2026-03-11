import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { formatDuration } from '@/src/utils/formatters';
import { PersonalBest } from '@/src/types/database';

type PersonalBestBadgeProps = {
  pb: PersonalBest;
};

export default function PersonalBestBadge({ pb }: PersonalBestBadgeProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.distance}>{pb.distance_label}</Text>
      <Text style={[styles.time, { color: colors.textPrimary }]}>{formatDuration(pb.best_time_seconds)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.accent + '15',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  distance: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
  },
  time: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});
