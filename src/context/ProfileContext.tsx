import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import * as ProfileService from '@/src/services/profile.service';
import { Profile } from '@/src/types/database';

type ProfileContextValue = {
  profile: Profile | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await ProfileService.getProfile(user.id);
      setProfile(data);
    } catch (err) {
      console.warn('[ProfileContext] Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      refresh();
    } else {
      setProfile(null);
      setIsLoading(false);
    }
  }, [user, refresh]);

  return (
    <ProfileContext.Provider value={{ profile, isLoading, refresh }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
