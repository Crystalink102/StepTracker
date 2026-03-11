import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getQueueSize, processQueue } from '@/src/services/offline-queue';
import { useNetwork } from '@/src/context/NetworkContext';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

/**
 * Shows a card on the home screen when there are pending offline operations
 * waiting to sync. Only visible when the queue has items AND the device is online.
 */
export default function OfflineQueueCard() {
  const { isOnline } = useNetwork();
  const { colors } = useTheme();
  const [queueSize, setQueueSize] = useState(getQueueSize());
  const [isSyncing, setIsSyncing] = useState(false);

  // Poll queue size periodically so the card updates
  useEffect(() => {
    const interval = setInterval(() => {
      setQueueSize(getQueueSize());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await processQueue();
      setQueueSize(getQueueSize());
    } catch (err) {
      console.warn('[OfflineQueueCard] Retry failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Only show when there are items AND device is online
  if (queueSize === 0 || !isOnline) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderLeftColor: colors.warning }]}>
      <View style={styles.row}>
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-upload-outline" size={20} color={colors.warning} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {queueSize} {queueSize === 1 ? 'item' : 'items'} waiting to sync
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Tap retry to sync now</Text>
        </View>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.surfaceLight }]}
          onPress={handleRetry}
          disabled={isSyncing}
          accessibilityRole="button"
          accessibilityLabel={`Retry syncing ${queueSize} pending items`}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <Ionicons name="sync-outline" size={16} color={Colors.primary} />
              <Text style={styles.retryText}>Retry</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    padding: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
