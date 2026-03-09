import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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
  const userIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) {
      setIsLoading(false);
      return;
    }
    try {
      const profilePromise = ProfileService.getProfile(userId);
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 8000)
      );
      const data = await Promise.race([profilePromise, timeoutPromise]);

      // Only update if we're still looking at the same user
      if (userIdRef.current === userId) {
        if (data) {
          setProfile(data);
        } else {
          console.warn('[ProfileContext] Profile fetch timed out');
          // On timeout, try once more with a shorter timeout
          try {
            const retryData = await Promise.race([
              ProfileService.getProfile(userId),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
            ]);
            if (userIdRef.current === userId && retryData) {
              setProfile(retryData);
            }
          } catch {
            // Give up silently
          }
        }
      }
    } catch (err) {
      console.warn('[ProfileContext] Failed to load profile:', err);
    } finally {
      if (userIdRef.current === userId) {
        setIsLoading(false);
      }
    }
  }, []); // No dependencies — uses ref for userId

  useEffect(() => {
    if (user) {
      userIdRef.current = user.id;
      setIsLoading(true);
      refresh();
    } else {
      userIdRef.current = null;
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
