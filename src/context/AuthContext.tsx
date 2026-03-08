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

type AuthState = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasMFA: boolean;
  mfaVerified: boolean;
};

type AuthActions = {
  signUpEmail: (email: string, password: string) => Promise<void>;
  signUpPhone: (phone: string, password: string) => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  loginPhone: (phone: string, password: string) => Promise<void>;
  verifyOTP: (token: string, type: 'sms' | 'email', identifier: string) => Promise<void>;
  resendConfirmation: (type: 'email' | 'sms', identifier: string) => Promise<void>;
  enrollMFA: () => Promise<{ qr: string; secret: string; factorId: string }>;
  verifyMFA: (factorId: string, code: string) => Promise<void>;
  getMFAFactors: () => Promise<any>;
  logout: () => Promise<void>;
};

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMFA, setHasMFA] = useState(false);
  const [mfaVerified, setMfaVerified] = useState(false);

  const isAuthenticated = !!session && !!user;

  // Check MFA status for the current session
  const checkMFAStatus = useCallback(async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factors?.totp?.filter((f) => f.status === 'verified') ?? [];
      setHasMFA(verifiedFactors.length > 0);

      if (verifiedFactors.length > 0) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        setMfaVerified(aal?.currentLevel === 'aal2');
      } else {
        setMfaVerified(false);
      }
    } catch {
      // MFA check is best-effort
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession) await checkMFAStatus();
      } catch (err) {
        console.warn('[Auth] Failed to get session:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession) await checkMFAStatus();
        else {
          setHasMFA(false);
          setMfaVerified(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [checkMFAStatus]);

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

  const enrollMFA = useCallback(async () => {
    const data = await AuthService.enrollMFA();
    return {
      qr: data.totp.qr_code,
      secret: data.totp.secret,
      factorId: data.id,
    };
  }, []);

  const verifyMFA = useCallback(
    async (factorId: string, code: string) => {
      await AuthService.verifyMFA(factorId, code);
      await checkMFAStatus();
    },
    [checkMFAStatus]
  );

  const getMFAFactorsAction = useCallback(async () => {
    return AuthService.getMFAFactors();
  }, []);

  const logout = useCallback(async () => {
    await AuthService.logout();
    setSession(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        isAuthenticated,
        hasMFA,
        mfaVerified,
        signUpEmail,
        signUpPhone,
        loginEmail,
        loginPhone,
        verifyOTP,
        resendConfirmation,
        enrollMFA,
        verifyMFA,
        getMFAFactors: getMFAFactorsAction,
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
