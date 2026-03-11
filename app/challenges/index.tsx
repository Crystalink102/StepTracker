import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChallenges } from '@/src/hooks/useChallenges';
import ChallengeCard from '@/src/components/challenges/ChallengeCard';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

export default function ChallengesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { activeChallenges, availableChallenges, isLoading, join, refresh } = useChallenges();

  const handleJoin = async (challengeId: string) => {
    await join(challengeId);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Your Challenges */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your Challenges</Text>
          {!isLoading && activeChallenges.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="flag-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active challenges</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Create one or join a friend's challenge
              </Text>
            </View>
          )}
          {activeChallenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} variant="active" />
          ))}
        </View>

        {/* Available Challenges */}
        {availableChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Available from Friends</Text>
            {availableChallenges.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                variant="available"
                onJoin={() => handleJoin(c.id)}
              />
            ))}
          </View>
        )}

        {isLoading && activeChallenges.length === 0 && (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={{ marginTop: Spacing.xxxl }}
          />
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push('/challenges/create' as any)}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 2,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
