import "server-only";
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a plain Supabase client using the anon key WITHOUT cookie handling.
 * 
 * This client is safe to use inside `unstable_cache` and other contexts where
 * `cookies()` from `next/headers` is not available (e.g., background revalidation,
 * build-time execution).
 * 
 * It respects Row Level Security (RLS) policies because it uses the anon key,
 * not the service_role key. Use this for fetching public data that doesn't
 * require user authentication context.
 */
export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase URL or Anon Key in server environment');
  }

  return createSupabaseClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
