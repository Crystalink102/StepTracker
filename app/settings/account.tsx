import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Button } from '@/src/components/ui';
import { deleteAccount } from '@/src/services/auth.service';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Double confirmation
            Alert.alert('Are you absolutely sure?', 'All your XP, runs, and data will be gone forever.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Yes, Delete Everything',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteAccount();
                    await logout();
                  } catch (err: any) {
                    Alert.alert('Error', err.message);
                  }
                },
              },
            ]);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email</Text>
        <Text style={styles.sectionValue}>{user?.email || 'Not set'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phone</Text>
        <Text style={styles.sectionValue}>{user?.phone || 'Not set'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2FA Status</Text>
        <Text style={[styles.sectionValue, { color: Colors.secondary }]}>
          Enabled
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title="Log Out" variant="ghost" onPress={handleLogout} />
        <Button title="Delete Account" variant="danger" onPress={handleDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.xxl,
  },
  section: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  sectionValue: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
  },
  actions: {
    marginTop: Spacing.xxxl,
    gap: Spacing.lg,
  },
});
