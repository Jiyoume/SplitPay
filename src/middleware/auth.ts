/**
 * MyShare - Supabase Auth Middleware
 * 
 * Keeps user sessions refreshed automatically.
 * 
 * How it works:
 * - On every request/navigation, checks if the session token is expired
 * - If expired, refreshes it silently using the refresh token
 * - Updates cookies/storage with new tokens
 * - Redirects unauthenticated users to login
 * 
 * Use cases:
 * - Web: runs on each page load/navigation
 * - Native: runs on app foreground / screen focus
 */

import { createServerSupabaseClient } from '../lib/supabase';

// ===== PROTECTED ROUTES =====
const PROTECTED_PATHS = [
  '/home',
  '/groups',
  '/wallet',
  '/reports',
  '/profile',
  '/add-expense',
  '/kyc',
  '/topup',
];

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/auth/callback',
  '/auth/reset',
  '/forgot-password',
];

// ===== WEB MIDDLEWARE =====

/**
 * Middleware function for web apps.
 * Call this on every page navigation to keep sessions fresh.
 * 
 * @param request - The incoming request object
 * @param response - The outgoing response object
 * @returns { user, session, redirect? }
 */
export async function authMiddleware(request: {
  url: string;
  cookies: {
    get: (name: string) => string | undefined;
    set: (name: string, value: string, options?: any) => void;
    remove: (name: string, options?: any) => void;
  };
}) {
  const supabase = createServerSupabaseClient(request.cookies);

  // Refresh session (this extends the session if it's close to expiring)
  const { data: { session }, error } = await supabase.auth.getSession();

  // If session exists but token is about to expire, refresh it
  if (session) {
    const expiresAt = session.expires_at || 0;
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;

    // Refresh if less than 5 minutes until expiry
    if (expiresAt - now < fiveMinutes) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshed.session) {
        return {
          user: refreshed.session.user,
          session: refreshed.session,
          refreshed: true,
        };
      }
    }

    return {
      user: session.user,
      session,
      refreshed: false,
    };
  }

  // No session — check if path requires auth
  const pathname = new URL(request.url).pathname;
  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p));
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  if (isProtected && !session) {
    return {
      user: null,
      session: null,
      redirect: '/login',
    };
  }

  return {
    user: null,
    session: null,
    refreshed: false,
  };
}

// ===== REACT NATIVE SESSION MANAGER =====

/**
 * For React Native: call this on app start and when app comes to foreground.
 * Refreshes the session if needed.
 */
export async function refreshSessionNative(supabaseClient: any): Promise<{
  valid: boolean;
  user: any;
  session: any;
  error?: string;
}> {
  try {
    // Get current session
    const { data: { session }, error: getError } = await supabaseClient.auth.getSession();

    if (getError) {
      return { valid: false, user: null, session: null, error: getError.message };
    }

    if (!session) {
      return { valid: false, user: null, session: null };
    }

    // Check if expired or close to expiring
    const expiresAt = session.expires_at || 0;
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;

    if (expiresAt - now < fiveMinutes) {
      // Refresh
      const { data: refreshed, error: refreshError } = await supabaseClient.auth.refreshSession();
      if (refreshError) {
        return { valid: false, user: null, session: null, error: refreshError.message };
      }
      return {
        valid: true,
        user: refreshed.session?.user || null,
        session: refreshed.session,
      };
    }

    return {
      valid: true,
      user: session.user,
      session,
    };
  } catch (err: any) {
    return { valid: false, user: null, session: null, error: err.message };
  }
}

// ===== AUTO-REFRESH TIMER =====

let refreshTimer: any = null;

/**
 * Start auto-refresh timer. Checks session every 4 minutes.
 */
export function startSessionAutoRefresh(supabaseClient: any): () => void {
  const INTERVAL = 4 * 60 * 1000; // 4 minutes

  const refresh = async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      const expiresAt = (session.expires_at || 0) * 1000;
      const timeUntilExpiry = expiresAt - Date.now();
      
      // Refresh if less than 5 min remaining
      if (timeUntilExpiry < 5 * 60 * 1000) {
        await supabaseClient.auth.refreshSession();
        console.log('[MyShare] Session refreshed automatically');
      }
    }
  };

  refreshTimer = setInterval(refresh, INTERVAL);
  refresh(); // Run immediately

  // Return cleanup function
  return () => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  };
}

/**
 * Stop auto-refresh (call on logout).
 */
export function stopSessionAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// ===== AUTH GUARD (for screen-level protection) =====

/**
 * Check if user is authenticated. Use in screen components.
 * Returns user or null. Redirect if not authenticated.
 */
export async function requireAuth(supabaseClient: any): Promise<{
  authenticated: boolean;
  user: any;
  session: any;
}> {
  const result = await refreshSessionNative(supabaseClient);
  return {
    authenticated: result.valid,
    user: result.user,
    session: result.session,
  };
}
