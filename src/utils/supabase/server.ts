import { createServerClient } from '@supabase/ssr';

/**
 * Create Supabase server client for Expo/React Native.
 * Uses a cookie-like storage adapter instead of next/headers.
 */

// In-memory cookie store (for API route contexts)
const cookieStore: Record<string, string> = {};

export async function createClient() {
  return createServerClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore[name] || undefined;
        },
        set(name: string, value: string) {
          cookieStore[name] = value;
        },
        remove(name: string) {
          delete cookieStore[name];
        },
      },
    }
  );
}
