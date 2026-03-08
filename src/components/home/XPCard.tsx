import { View, Text, StyleSheet } from 'react-native';
import { Card, ProgressBar, Badge } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { formatNumber } from '@/src/utils/formatters';
import { useXP } from '@/src/hooks/useXP';

export default function XPCard() {
  const { level, totalXP, progress, xpRemaining, xpNeeded } = useXP();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.levelContainer}>
          <Text style={styles.levelLabel}>LEVEL</Text>
          <Text style={styles.levelNumber}>{level}</Text>
        </View>
        <Badge label={`${formatNumber(totalXP)} XP`} variant="secondary" />
      </View>

      <ProgressBar
        progress={progress}
        color={Colors.secondary}
        height={10}
        style={styles.progress}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {formatNumber(xpRemaining)} XP to Level {level + 1}
        </Text>
        <Text style={styles.footerText}>
          {formatNumber(xpNeeded)} XP needed
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  levelLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  levelNumber: {
    color: Colors.textPrimary,
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
  },
  progress: {
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
});
