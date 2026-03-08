import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { formatDuration } from '@/src/utils/formatters';
import { PersonalBest } from '@/src/types/database';

type PersonalBestBadgeProps = {
  pb: PersonalBest;
};

export default function PersonalBestBadge({ pb }: PersonalBestBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.distance}>{pb.distance_label}</Text>
      <Text style={styles.time}>{formatDuration(pb.best_time_seconds)}</Text>
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
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});
