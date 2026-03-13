import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/hooks/useToast';
import { Button, ConfirmModal } from '@/src/components/ui';
import { deleteAccount } from '@/src/services/auth.service';
import { FontSize, FontWeight, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

export default function AccountScreen() {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showDeleteFinal, setShowDeleteFinal] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogout = () => setShowLogout(true);

  const confirmLogout = async () => {
    setShowLogout(false);
    try {
      await logout();
      showToast('Logged out', 'info');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to log out. Please try again.');
      setShowError(true);
    }
  };

  const handleDelete = () => setShowDelete(true);

  const confirmDeleteFirst = () => {
    setShowDelete(false);
    setShowDeleteFinal(true);
  };

  const confirmDeleteFinal = async () => {
    setShowDeleteFinal(false);
    try {
      await deleteAccount();
      await logout();
    } catch (err: any) {
      showToast('Failed to delete account', 'error');
      setErrorMessage(err.message);
      setShowError(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.section, { borderBottomColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Email</Text>
        <Text style={[styles.sectionValue, { color: colors.textPrimary }]}>{user?.email || 'Not set'}</Text>
      </View>

      <View style={[styles.section, { borderBottomColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Phone</Text>
        <Text style={[styles.sectionValue, { color: colors.textPrimary }]}>{user?.phone || 'Not set'}</Text>
      </View>



      <View style={styles.actions}>
        <Button title="Log Out" variant="ghost" onPress={handleLogout} />
        <Button title="Delete Account" variant="danger" onPress={handleDelete} />
      </View>

      <ConfirmModal
        visible={showLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmLabel="Log Out"
        destructive
        onConfirm={confirmLogout}
        onCancel={() => setShowLogout(false)}
      />

      <ConfirmModal
        visible={showDelete}
        title="Delete Account"
        message="This will permanently delete your account and all data. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDeleteFirst}
        onCancel={() => setShowDelete(false)}
      />

      <ConfirmModal
        visible={showDeleteFinal}
        title="Are you absolutely sure?"
        message="All your XP, runs, and data will be gone forever."
        confirmLabel="Yes, Delete Everything"
        destructive
        onConfirm={confirmDeleteFinal}
        onCancel={() => setShowDeleteFinal(false)}
      />

      <ConfirmModal
        visible={showError}
        title="Error"
        message={errorMessage}
        confirmLabel="OK"
        onConfirm={() => setShowError(false)}
        onCancel={() => setShowError(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xxl,
  },
  section: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  sectionValue: {
    fontSize: FontSize.lg,
  },
  actions: {
    marginTop: Spacing.xxxl,
    gap: Spacing.lg,
  },
});
