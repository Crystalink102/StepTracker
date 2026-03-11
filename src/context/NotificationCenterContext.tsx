import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNotification } from '@/src/types/database';

const STORAGE_KEY = '@notification_center';
const MAX_NOTIFICATIONS = 50;

type NotificationCenterContextType = {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (
    type: AppNotification['type'],
    title: string,
    body: string,
    data?: Record<string, any>
  ) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
};

const NotificationCenterContext = createContext<NotificationCenterContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markRead: () => {},
  markAllRead: () => {},
  clearAll: () => {},
});

export function NotificationCenterProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const loaded = useRef(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as AppNotification[];
            setNotifications(parsed);
          } catch {
            // corrupted data, start fresh
          }
        }
        loaded.current = true;
      })
      .catch(() => {
        loaded.current = true;
      });
  }, []);

  // Save to AsyncStorage whenever notifications change (but only after initial load)
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)).catch(() => {});
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(
    (
      type: AppNotification['type'],
      title: string,
      body: string,
      data?: Record<string, any>
    ) => {
      const newNotification: AppNotification = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        type,
        title,
        body,
        read: false,
        created_at: new Date().toISOString(),
        data,
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev];
        // Trim to max
        if (updated.length > MAX_NOTIFICATIONS) {
          return updated.slice(0, MAX_NOTIFICATIONS);
        }
        return updated;
      });
    },
    []
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const contextValue = useMemo(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markRead,
      markAllRead,
      clearAll,
    }),
    [notifications, unreadCount, addNotification, markRead, markAllRead, clearAll]
  );

  return (
    <NotificationCenterContext.Provider value={contextValue}>
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenterContext() {
  return useContext(NotificationCenterContext);
}
