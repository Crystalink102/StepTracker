import { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useAchievements } from '@/src/hooks/useAchievements';
import { useCustomGoals } from '@/src/hooks/useCustomGoals';
import AchievementList from '@/src/components/achievements/AchievementList';
import PersonalGoalsSection from '@/src/components/achievements/PersonalGoalsSection';
import CreateGoalModal from '@/src/components/achievements/CreateGoalModal';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

export default function AchievementsScreen() {
  const { colors } = useTheme();
  const { definitions, userAchievements, earnedCount, totalCount, isLoading } =
    useAchievements();
  const { goals, addGoal, removeGoal } = useCustomGoals();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Achievements',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
        }}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.count}>
              {earnedCount} / {totalCount}
            </Text>
            <Text style={[styles.countLabel, { color: colors.textMuted }]}>Achievements Earned</Text>
          </View>

          <PersonalGoalsSection
            goals={goals}
            onDelete={removeGoal}
            onCreatePress={() => setShowCreateModal(true)}
          />

          <AchievementList
            definitions={definitions}
            userAchievements={userAchievements}
          />
        </ScrollView>
      )}

      <CreateGoalModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={addGoal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  count: {
    color: Colors.primary,
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
  },
  countLabel: {
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
  },
});
