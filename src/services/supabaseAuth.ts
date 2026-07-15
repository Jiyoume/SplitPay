/**
 * AmbagKo - Supabase Authentication Service
 * 
 * Uses Supabase Auth for user authentication while keeping
 * Firebase Firestore for data and Stellar for blockchain.
 * 
 * Supabase Auth provides:
 * - Email/password signup & login
 * - OAuth providers (Google, Apple, Facebook)
 * - Phone (OTP) authentication
 * - Magic link (passwordless) login
 * - JWT session management
 * - Row Level Security (RLS) support
 * 
 * Install: npm install @supabase/supabase-js
 */

import { createClient, SupabaseClient, User, Session, AuthError } from '@supabase/supabase-js';

// ===== CONFIGURATION =====
// Replace with your Supabase project credentials
const SUPABASE_URL = 'https://dmhqotrkfrhimdqoftil.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// ===== INITIALIZATION =====

let supabase: SupabaseClient;

export function initSupabaseAuth(): SupabaseClient {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
  return supabase;
}

// ===== EMAIL / PASSWORD AUTH =====

/**
 * Register a new user with email and password.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: { fullName?: string; phone?: string }
): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: metadata?.fullName || '',
        phone: metadata?.phone || '',
        kyc_level: 'none',
        created_at: new Date().toISOString(),
      },
    },
  });
  return { user: data.user, error };
}

/**
 * Sign in with email and password.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { user: data.user, session: data.session, error };
}

// ===== OAUTH (GOOGLE, APPLE) =====

/**
 * Sign in with Google OAuth.
 */
export async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
    },
  });
  return { error };
}

/**
 * Sign in with Apple (iOS).
 */
export async function signInWithApple(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
    },
  });
  return { error };
}

// ===== PHONE / OTP AUTH =====

/**
 * Send OTP to phone number for verification.
 */
export async function sendPhoneOTP(
  phone: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    phone,
  });
  return { error };
}

/**
 * Verify phone OTP code.
 */
export async function verifyPhoneOTP(
  phone: string,
  token: string
): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });
  return { user: data.user, session: data.session, error };
}

// ===== MAGIC LINK (PASSWORDLESS) =====

/**
 * Send magic link to email for passwordless login.
 */
export async function sendMagicLink(
  email: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
    },
  });
  return { error };
}

// ===== SESSION MANAGEMENT =====

/**
 * Get the current authenticated user.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current session (includes JWT token).
 */
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Get the JWT access token (for API calls).
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token || null;
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Listen for auth state changes (login, logout, token refresh).
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): { unsubscribe: () => void } {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return { unsubscribe: () => subscription.unsubscribe() };
}

// ===== PASSWORD MANAGEMENT =====

/**
 * Send password reset email.
 */
export async function resetPassword(
  email: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/reset` : undefined,
  });
  return { error };
}

/**
 * Update password (user must be logged in).
 */
export async function updatePassword(
  newPassword: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { error };
}

// ===== USER PROFILE =====

/**
 * Update user metadata (name, phone, avatar, etc.)
 */
export async function updateUserMetadata(
  metadata: Record<string, any>
): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.updateUser({
    data: metadata,
  });
  return { user: data.user, error };
}

/**
 * Get user metadata.
 */
export async function getUserMetadata(): Promise<Record<string, any> | null> {
  const user = await getCurrentUser();
  return user?.user_metadata || null;
}

// ===== MULTI-FACTOR AUTH (MFA) =====

/**
 * Enroll MFA (TOTP).
 */
export async function enrollMFA(): Promise<{ qrCode?: string; secret?: string; error: AuthError | null }> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'AmbagKo Authenticator',
  });
  if (error) return { error };
  return { qrCode: data.totp.qr_code, secret: data.totp.secret, error: null };
}

/**
 * Verify MFA challenge.
 */
export async function verifyMFA(
  factorId: string,
  code: string
): Promise<{ error: AuthError | null }> {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return { error: challengeError };

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  return { error };
}

// ===== HELPER: SYNC TO SUPABASE DB =====

/**
 * After auth succeeds, ensure user profile exists in Supabase DB.
 */
export async function syncAuthToDatabase(user: User): Promise<void> {
  const { createClient } = await import('../utils/supabase/client');
  const supabase = createClient();
  const { error } = await supabase.from('users').upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || '',
    phone: user.phone || user.user_metadata?.phone || '',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) console.error('Failed to sync user to DB:', error.message);
}

// ===== EXPORT =====
export { supabase };
