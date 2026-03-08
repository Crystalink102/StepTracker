import { View, Text, StyleSheet } from 'react-native';
import Card from '@/src/components/ui/Card';
import FlameIcon from './FlameIcon';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

type StreakCardProps = {
  streak: number;
};

export default function StreakCard({ streak }: StreakCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <FlameIcon size={32} streak={streak} />
        <View style={styles.textContainer}>
          <Text style={styles.count}>{streak}</Text>
          <Text style={styles.label}>day streak</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  count: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
});
