import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/src/constants/config';
import { Database } from '@/src/types/database';

let storage: any;

if (Platform.OS === 'web') {
  // Web fallback - use localStorage
  storage = {
    getItem: (key: string) => {
      try { return Promise.resolve(localStorage.getItem(key)); }
      catch { return Promise.resolve(null); }
    },
    setItem: (key: string, value: string) => {
      try { localStorage.setItem(key, value); }
      catch {}
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      try { localStorage.removeItem(key); }
      catch {}
      return Promise.resolve();
    },
  };
} else {
  // Native - use SecureStore
  const SecureStore = require('expo-secure-store');
  storage = {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
