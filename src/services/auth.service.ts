import { supabase } from './supabase';

// ============================================================
// Sign Up
// ============================================================
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithPhone(phone: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    phone,
    password,
  });
  if (error) throw error;
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
  if (error) throw error;
  return data;
}

export async function loginWithPhone(phone: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    phone,
    password,
  });
  if (error) throw error;
  return data;
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
  if (error) throw error;
  return data;
}

// ============================================================
// MFA (TOTP)
// ============================================================
export async function enrollMFA() {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'StepTracker Authenticator',
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
