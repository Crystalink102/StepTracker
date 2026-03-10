import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotificationCenter } from '@/src/hooks/useNotificationCenter';
import { Colors, FontSize, FontWeight, Spacing } from '@/src/constants/theme';

export default function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useNotificationCenter();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/notifications' as any)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : 'Notifications'
      }
    >
      <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
      {unreadCount > 0 && (
        <View style={styles.badge} accessibilityElementsHidden>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.danger,
    borderRadius: 9999,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    lineHeight: 14,
  },
});
