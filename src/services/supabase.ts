import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../types/database';

// Support both Vite (import.meta.env.VITE_*) and Next.js (process.env.NEXT_PUBLIC_*)
const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  import.meta.env?.VITE_SUPABASE_URL;

const supabaseAnonKey =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Use createBrowserClient from @supabase/ssr for cookie-based auth
// This enables PKCE flow with server-side code exchange
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

export type SupabaseClient = typeof supabase;
