import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChallenges } from '@/src/hooks/useChallenges';
import Card from '@/src/components/ui/Card';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

export default function ChallengesHomeCard() {
  const router = useRouter();
  const { activeChallenges, availableChallenges } = useChallenges();
  const { colors } = useTheme();

  const activeCount = activeChallenges.length;
  const availableCount = availableChallenges.length;
  const hasAnything = activeCount > 0 || availableCount > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push('/challenges' as any)}
    >
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="flag" size={22} color={Colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Challenges</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {hasAnything
                ? `${activeCount} active${availableCount > 0 ? ` · ${availableCount} to join` : ''}`
                : 'Create or join a challenge'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>

        {/* Mini progress bars for top 2 active challenges */}
        {activeCount > 0 && (
          <View style={styles.miniChallenges}>
            {activeChallenges.slice(0, 2).map((c) => {
              const pct = Math.min(
                Math.round(((c.my_progress ?? 0) / c.target_value) * 100),
                100
              );
              return (
                <View key={c.id} style={styles.miniRow}>
                  <Text style={[styles.miniTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {c.title}
                  </Text>
                  <View style={[styles.miniBarOuter, { backgroundColor: colors.surfaceLight }]}>
                    <View
                      style={[
                        styles.miniBarFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: c.my_completed
                            ? Colors.gold
                            : Colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.miniPct, { color: colors.textMuted }]}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </TouchableOpacity>
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: 1,
  },
  miniChallenges: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  miniTitle: {
    fontSize: FontSize.sm,
    flex: 1,
  },
  miniBarOuter: {
    width: 80,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  miniPct: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    width: 28,
    textAlign: 'right',
  },
});
