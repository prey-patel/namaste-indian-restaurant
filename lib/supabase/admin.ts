import "server-only";
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * SECURE SERVER-ONLY CLIENT (bypasses RLS).
 * 
 * WARNING: Do NOT import this file into any Client Component or expose it publicly.
 * This client runs with service-role privileges and bypasses Row Level Security (RLS).
 * It is reserved for secure admin operations in later phases (e.g. triggers, logs, cron, notifications).
 * 
 * NOT imported or used anywhere in Phase 1.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase URL or Service Role Key in secure environment');
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
