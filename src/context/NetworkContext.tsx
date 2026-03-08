import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { processQueue } from '@/src/services/offline-queue';

type NetworkContextValue = {
  isOnline: boolean;
};

const NetworkContext = createContext<NetworkContextValue>({ isOnline: true });

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  const checkConnection = useCallback(async () => {
    if (Platform.OS === 'web') {
      setIsOnline(navigator.onLine);
      return;
    }
    try {
      const state = await Network.getNetworkStateAsync();
      setIsOnline(state.isConnected ?? true);
    } catch {
      setIsOnline(true);
    }
  }, []);

  useEffect(() => {
    checkConnection();

    // On web, listen for online/offline events (instant, no polling needed)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Native: poll connectivity every 10s
    const interval = setInterval(checkConnection, 10_000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  // Process offline queue when coming back online
  useEffect(() => {
    if (isOnline) {
      processQueue().catch((err) => {
        console.warn('[NetworkContext] Failed to process offline queue:', err);
      });
    }
  }, [isOnline]);

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
