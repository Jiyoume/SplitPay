/**
 * MyShare - Supabase Client Configuration
 * 
 * Central Supabase client instance used across the app.
 */

import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// ===== ENVIRONMENT VARIABLES =====
// Replace these with your Supabase project credentials
// Get from: https://supabase.com/dashboard → Settings → API
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// ===== BROWSER CLIENT (for web/PWA) =====
export const supabaseBrowser = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== STANDARD CLIENT (for React Native) =====
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: typeof window !== 'undefined',
  },
});

export { SUPABASE_URL, SUPABASE_ANON_KEY };
