import * as Linking from 'expo-linking';
import { supabase } from './supabase';

const REDIRECT_URL = Linking.createURL('auth/callback');

/**
 * Convert Supabase auth errors into user-friendly messages.
 */
function friendlyAuthError(error: { message: string; status?: number }): Error {
  const msg = error.message?.toLowerCase() ?? '';

  if (msg.includes('rate limit') || msg.includes('too many requests') || error.status === 429) {
    return new Error(
      'Too many attempts. Please wait a few minutes before trying again.'
    );
  }
  if (msg.includes('email not confirmed')) {
    return new Error(
      'Please check your email and click the confirmation link before logging in.'
    );
  }
  if (msg.includes('invalid login credentials')) {
    return new Error('Incorrect email/phone or password. Please try again.');
  }
  if (msg.includes('user already registered')) {
    return new Error('An account with this email already exists. Try logging in instead.');
  }
  if (msg.includes('password') && msg.includes('least')) {
    return new Error('Password must be at least 8 characters.');
  }
  if (msg.includes('provide') && msg.includes('email')) {
    return new Error('Please enter a valid email address.');
  }

  return new Error(error.message);
}

// ============================================================
// Sign Up
// ============================================================
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: REDIRECT_URL,
    },
  });
  if (error) throw friendlyAuthError(error);
  return data;
}

export async function signUpWithPhone(phone: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    phone,
    password,
  });
  if (error) throw friendlyAuthError(error);
  return data;
}

// ============================================================
// Login
// ============================================================
export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw friendlyAuthError(error);
  return data;
}

export async function loginWithPhone(phone: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    phone,
    password,
  });
  if (error) throw friendlyAuthError(error);
  return data;
}

// ============================================================
// Resend Confirmation
// ============================================================
export async function resendConfirmationEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: REDIRECT_URL,
    },
  });
  if (error) throw friendlyAuthError(error);
}

export async function resendConfirmationSMS(phone: string) {
  const { error } = await supabase.auth.resend({
    type: 'sms',
    phone,
  } as any);
  if (error) throw friendlyAuthError(error);
}

// ============================================================
// OTP Verification (for phone/email confirmation)
// ============================================================
export async function verifyOTP(
  token: string,
  type: 'sms' | 'email',
  identifier: string
) {
  const params =
    type === 'sms'
      ? { phone: identifier, token, type: 'sms' as const }
      : { email: identifier, token, type: 'email' as const };

  const { data, error } = await supabase.auth.verifyOtp(params);
  if (error) throw friendlyAuthError(error);
  return data;
}

// ============================================================
// MFA (TOTP)
// ============================================================
export async function enrollMFA() {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: '5tepTracker Authenticator',
  });
  if (error) throw error;
  return data;
}

export async function verifyMFA(factorId: string, code: string) {
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (error) throw error;
  return data;
}

export async function getMFAFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data;
}

export async function getAssuranceLevel() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data;
}

// ============================================================
// Session
// ============================================================
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

// ============================================================
// Logout
// ============================================================
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ============================================================
// Delete Account
// ============================================================
export async function deleteAccount() {
  // This calls a Supabase Edge Function or RPC that deletes the user
  // For now, we'll use the admin API through an RPC function
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
}
