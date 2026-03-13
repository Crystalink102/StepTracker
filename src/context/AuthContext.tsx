import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/src/services/supabase';
import * as AuthService from '@/src/services/auth.service';
import { trackLoginLocation } from '@/src/services/login-location.service';
import { clearQueue } from '@/src/services/offline-queue';

type AuthState = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthActions = {
  signUpEmail: (email: string, password: string) => Promise<void>;
  signUpPhone: (phone: string, password: string) => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  loginPhone: (phone: string, password: string) => Promise<void>;
  verifyOTP: (token: string, type: 'sms' | 'email', identifier: string) => Promise<void>;
  resendConfirmation: (type: 'email' | 'sms', identifier: string) => Promise<void>;
  logout: () => Promise<void>;
};

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!session && !!user;

  // Initialize auth state
  useEffect(() => {
    const init = async () => {
      try {
        // Timeout getSession — it can hang in Expo Go when refreshing stale tokens
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 5000)
        );
        const result = await Promise.race([sessionPromise, timeoutPromise]);

        const currentSession = result && 'data' in result
          ? result.data.session
          : null;

        // Check for auth errors (e.g., invalid/expired refresh token)
        const authError = result && 'error' in result ? result.error : null;
        if (authError) {
          console.warn('[Auth] Session error, signing out:', authError.message);
          await supabase.auth.signOut().catch(() => {});
          setSession(null);
          setUser(null);
        } else if (!currentSession && result === null) {
          console.warn('[Auth] getSession timed out — starting fresh');
          setSession(null);
          setUser(null);
        } else {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
      } catch (err) {
        console.warn('[Auth] Failed to get session:', err);
        // Clear stale session on any auth init failure
        await supabase.auth.signOut().catch(() => {});
      } finally {
        setIsLoading(false);
      }
    };
    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession) {
          // Track login location
          if (event === 'SIGNED_IN' && newSession.user) {
            try {
              await trackLoginLocation(
                newSession.user.id,
                newSession.user.email ?? null
              );
            } catch {
              // Location tracking is best-effort
            }
          }
        } else {
          // Clear offline queue on logout to prevent cross-user data leaks
          clearQueue().catch(() => {});
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string) => {
    await AuthService.signUpWithEmail(email, password);
  }, []);

  const signUpPhone = useCallback(async (phone: string, password: string) => {
    await AuthService.signUpWithPhone(phone, password);
  }, []);

  const loginEmail = useCallback(async (email: string, password: string) => {
    await AuthService.loginWithEmail(email, password);
  }, []);

  const loginPhone = useCallback(async (phone: string, password: string) => {
    await AuthService.loginWithPhone(phone, password);
  }, []);

  const verifyOTP = useCallback(
    async (token: string, type: 'sms' | 'email', identifier: string) => {
      await AuthService.verifyOTP(token, type, identifier);
    },
    []
  );

  const resendConfirmation = useCallback(
    async (type: 'email' | 'sms', identifier: string) => {
      if (type === 'email') {
        await AuthService.resendConfirmationEmail(identifier);
      } else {
        await AuthService.resendConfirmationSMS(identifier);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      // Timeout signOut — it can hang on Expo Go with stale sessions
      const signOutPromise = AuthService.logout();
      const timeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('signOut timed out')), 5000)
      );
      await Promise.race([signOutPromise, timeout]);
    } catch (err) {
      console.warn('[Auth] Logout error:', err);
    } finally {
      // Always clear local state — don't rely solely on onAuthStateChange
      // which can fail to fire on Expo Go
      setSession(null);
      setUser(null);
      clearQueue().catch(() => {});
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        isAuthenticated,
        signUpEmail,
        signUpPhone,
        loginEmail,
        loginPhone,
        verifyOTP,
        resendConfirmation,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
