import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useNotificationCenter } from '@/src/hooks/useNotificationCenter';
import { AppNotification } from '@/src/types/database';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';

const NOTIFICATION_ICONS: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  achievement: 'star',
  friend_request: 'person-add',
  challenge: 'trophy',
  streak: 'flame',
  level_up: 'arrow-up',
  general: 'notifications',
};

const NOTIFICATION_COLORS: Record<AppNotification['type'], string> = {
  achievement: Colors.gold,
  friend_request: Colors.primary,
  challenge: Colors.warning,
  streak: '#FF6B35',
  level_up: Colors.primary,
  general: Colors.textSecondary,
};

/** Map notification type to a route for navigation */
function getRouteForType(type: AppNotification['type']): string | null {
  switch (type) {
    case 'achievement':
      return '/achievements';
    case 'friend_request':
      return '/friends';
    case 'challenge':
      return '/challenges';
    case 'streak':
      return '/(tabs)';
    case 'level_up':
      return '/(tabs)';
    default:
      return null;
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const iconName = NOTIFICATION_ICONS[item.type] || 'notifications';
  const iconColor = NOTIFICATION_COLORS[item.type] || colors.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.row, !item.read && { backgroundColor: colors.surfaceLight }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.rowBody, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={[styles.rowTime, { color: colors.textMuted }]}>{formatTimeAgo(item.created_at)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { notifications, markRead, markAllRead, unreadCount } = useNotificationCenter();
  const router = useRouter();
  const { colors } = useTheme();

  const handlePress = (item: AppNotification) => {
    markRead(item.id);
    const route = getRouteForType(item.type);
    if (route) {
      router.push(route as any);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerRight: () =>
            unreadCount > 0 ? (
              <TouchableOpacity onPress={markAllRead} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Mark All Read</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No notifications</Text>
            <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
              You're all caught up! Notifications for achievements, streaks, and more will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationRow item={item} onPress={() => handlePress(item)} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  rowBody: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
    lineHeight: 18,
  },
  rowTime: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  emptyBody: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  headerButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerButtonText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
