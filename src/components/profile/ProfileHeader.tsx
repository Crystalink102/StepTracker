import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, Badge } from '@/src/components/ui';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { Profile } from '@/src/types/database';

type ProfileHeaderProps = {
  profile: Profile | null;
  level: number;
};

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `Member since ${month} ${year}`;
}

export default function ProfileHeader({ profile, level }: ProfileHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Avatar
          uri={profile?.avatar_url}
          name={profile?.display_name || profile?.username}
          size={80}
        />

        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>
            {profile?.display_name || profile?.username || 'New Runner'}
          </Text>
          {profile?.username && (
            <Text style={[styles.username, { color: colors.textSecondary }]}>@{profile.username}</Text>
          )}
          <Badge label={`Level ${level}`} variant="secondary" style={styles.badge} />
        </View>

        <TouchableOpacity
          style={[styles.editButton, { borderColor: colors.border }]}
          onPress={() => router.push('/settings/edit-profile')}
        >
          <Text style={[styles.editText, { color: colors.textSecondary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      {profile?.bio ? (
        <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>
      ) : null}

      {profile?.created_at ? (
        <Text style={[styles.memberSince, { color: colors.textMuted }]}>
          {formatMemberSince(profile.created_at)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  username: {
    fontSize: FontSize.md,
    marginTop: 2,
  },
  badge: {
    marginTop: Spacing.sm,
  },
  bio: {
    fontSize: FontSize.md,
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  memberSince: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  editButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  editText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
