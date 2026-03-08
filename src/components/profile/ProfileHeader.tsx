import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, Badge } from '@/src/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { Profile } from '@/src/types/database';

type ProfileHeaderProps = {
  profile: Profile | null;
  level: number;
};

export default function ProfileHeader({ profile, level }: ProfileHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Avatar
        uri={profile?.avatar_url}
        name={profile?.display_name || profile?.username}
        size={80}
      />

      <View style={styles.info}>
        <Text style={styles.name}>
          {profile?.display_name || profile?.username || 'New Runner'}
        </Text>
        {profile?.username && (
          <Text style={styles.username}>@{profile.username}</Text>
        )}
        <Badge label={`Level ${level}`} variant="secondary" style={styles.badge} />
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push('/settings/edit-profile')}
      >
        <Text style={styles.editText}>Edit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  info: {
    flex: 1,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  username: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginTop: 2,
  },
  badge: {
    marginTop: Spacing.sm,
  },
  editButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
