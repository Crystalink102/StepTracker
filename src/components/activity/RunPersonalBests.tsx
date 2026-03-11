import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import * as PersonalBestService from '@/src/services/personal-best.service';
import { PersonalBest } from '@/src/types/database';
import { formatDuration } from '@/src/utils/formatters';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';

type Props = {
  activityId: string;
};

export default function RunPersonalBests({ activityId }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [pbs, setPbs] = useState<PersonalBest[]>([]);

  useEffect(() => {
    if (!user) return;
    PersonalBestService.getPersonalBests(user.id)
      .then((all) => {
        // Filter to PBs set on this activity
        const matchingPBs = all.filter((pb) => pb.activity_id === activityId);
        setPbs(matchingPBs);
      })
      .catch(() => {});
  }, [user, activityId]);

  if (pbs.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Ionicons name="trophy" size={20} color={Colors.gold} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Personal Bests</Text>
      </View>

      {pbs.map((pb) => (
        <View key={pb.distance_label} style={[styles.pbRow, { borderBottomColor: colors.surfaceLight }]}>
          <View style={styles.pbLeft}>
            <View style={styles.medal}>
              <Ionicons name="medal" size={16} color={Colors.gold} />
            </View>
            <Text style={[styles.pbDistance, { color: colors.textPrimary }]}>{pb.distance_label}</Text>
          </View>
          <Text style={styles.pbTime}>{formatDuration(pb.best_time_seconds)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gold + '30',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  pbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pbLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  medal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gold + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pbDistance: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  pbTime: {
    color: Colors.gold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});
