import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '@/src/components/ui/Card';
import FlameIcon from './FlameIcon';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

type StreakCardProps = {
  streak: number;
  freezeAvailable?: boolean;
  freezeEnabled?: boolean;
  freezeUsed?: boolean;
};

export default function StreakCard({
  streak,
  freezeAvailable = false,
  freezeEnabled = false,
  freezeUsed = false,
}: StreakCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <FlameIcon size={32} streak={streak} />
        <View style={styles.textContainer}>
          <Text style={styles.count}>{streak}</Text>
          <Text style={styles.label}>day streak</Text>
        </View>
      </View>

      {freezeEnabled && (
        <View style={styles.freezeRow}>
          <Ionicons
            name="snow-outline"
            size={16}
            color={freezeAvailable ? '#60A5FA' : Colors.textMuted}
          />
          <Text
            style={[
              styles.freezeText,
              { color: freezeAvailable ? '#60A5FA' : Colors.textMuted },
            ]}
          >
            {freezeUsed
              ? 'Streak freeze saved your streak!'
              : freezeAvailable
                ? 'Streak freeze available'
                : 'Freeze used this week'}
          </Text>
        </View>
      )}
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
  freezeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  freezeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
