import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for use in browser client components.
 * Accesses public env variables prefixed with NEXT_PUBLIC_.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase URL or Anon Key is missing in client environment');
  }

  return createBrowserClient(url, anonKey);
}
