/**
 * MyShare - Supabase Client Helpers
 * 
 * Three client types:
 * 1. Browser client - for web/PWA (uses cookies via @supabase/ssr)
 * 2. Server client - for API routes/middleware (reads cookies from request)
 * 3. Native client - for React Native (uses AsyncStorage)
 */

import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// ===== ENV VARIABLES =====
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[MyShare] Missing Supabase env variables. Check .env file.');
}

// ===== BROWSER CLIENT (Web/PWA) =====
/**
 * Use this in client-side components (React, web pages).
 * Automatically handles cookies for session persistence.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ===== SERVER CLIENT (API Routes / Middleware) =====
/**
 * Use this in server-side contexts (API routes, middleware).
 * Reads/writes cookies from the request/response.
 */
export function createServerSupabaseClient(
  cookies: {
    get: (name: string) => string | undefined;
    set: (name: string, value: string, options?: any) => void;
    remove: (name: string, options?: any) => void;
  }
) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookies.get(name);
      },
      set(name: string, value: string, options: any) {
        cookies.set(name, value, options);
      },
      remove(name: string, options: any) {
        cookies.remove(name, options);
      },
    },
  });
}

// ===== NATIVE CLIENT (React Native / Expo) =====
/**
 * Use this in React Native with AsyncStorage for session persistence.
 */
export function createNativeSupabaseClient(storage?: any) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Not needed in native
      storage: storage || undefined,
    },
  });
}

// ===== SINGLETON INSTANCES =====
let browserClient: ReturnType<typeof createBrowserSupabaseClient> | null = null;
let nativeClient: ReturnType<typeof createNativeSupabaseClient> | null = null;

/**
 * Get or create the browser Supabase client (singleton).
 */
export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
  }
  return browserClient;
}

/**
 * Get or create the native Supabase client (singleton).
 */
export function getSupabaseNative(storage?: any) {
  if (!nativeClient) {
    nativeClient = createNativeSupabaseClient(storage);
  }
  return nativeClient;
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };
