import { View, Text, StyleSheet } from 'react-native';
import { Card, ProgressBar, Badge } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { formatNumber } from '@/src/utils/formatters';
import { useXP } from '@/src/hooks/useXP';
import NotificationBell from '@/src/components/home/NotificationBell';

export default function XPCard() {
  const { colors } = useTheme();
  const { level, totalXP, progress, xpRemaining, xpNeeded } = useXP();

  return (
    <Card style={styles.card} accessible accessibilityLabel={`Level ${level}, ${formatNumber(totalXP)} XP total, ${formatNumber(xpRemaining)} XP to next level`}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <NotificationBell />
          <View style={styles.levelContainer}>
            <Text style={[styles.levelLabel, { color: colors.textMuted }]}>LEVEL</Text>
            <Text style={[styles.levelNumber, { color: colors.textPrimary }]}>{level}</Text>
          </View>
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
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          {formatNumber(xpRemaining)} XP to Level {level + 1}
        </Text>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  levelLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  levelNumber: {
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
    fontSize: FontSize.xs,
  },
});
