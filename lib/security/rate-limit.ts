import { createAdminClient } from '@/lib/supabase/admin';

export type RateLimitAction =
  | 'contact'
  | 'order'
  | 'reservation'
  | 'order_status_lookup'
  | 'reservation_status_lookup';

/**
 * Checks if a hashed IP address has exceeded the submission rate limit for a specific action.
 * If limited, returns { limited: true, retryAfterSeconds }.
 * Otherwise, records the request and returns { limited: false }.
 * 
 * Fails closed on database errors to prevent security bypasses under load.
 */
export async function isRateLimited(
  ipHash: string,
  actionType: RateLimitAction,
  limit: number,
  windowSeconds: number
): Promise<{ limited: boolean; retryAfterSeconds: number }> {
  const adminClient = createAdminClient();
  const now = new Date();
  const windowAgo = new Date(now.getTime() - windowSeconds * 1000).toISOString();

  try {
    // 1. Asynchronously prune old rate limit entries (older than 24 hours) to keep table footprint small
    const pruneTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    adminClient
      .from('rate_limits')
      .delete()
      .lt('created_at', pruneTime)
      .then(({ error }) => {
        if (error) {
          console.error('[Rate Limit Cleanup Error]:', error);
        }
      });

    // 2. Query matching rate limit counts in the active window
    const { data, error, count } = await adminClient
      .from('rate_limits')
      .select('created_at', { count: 'exact' })
      .eq('ip_hash', ipHash)
      .eq('action_type', actionType)
      .gte('created_at', windowAgo)
      .order('created_at', { ascending: true }); // oldest first

    if (error) {
      console.error(`[Rate Limit DB Error] failed to select count for ${actionType}:`, error);
      // Hard fail closed for security
      throw new Error('Database lookup failure');
    }

    const currentCount = count || 0;

    if (currentCount >= limit && data && data.length > 0) {
      // Find oldest request inside the window to calculate precise cooldown remaining
      const oldestActive = new Date(data[0].created_at).getTime();
      const elapsedSeconds = Math.floor((now.getTime() - oldestActive) / 1000);
      const retryAfterSeconds = Math.max(1, windowSeconds - elapsedSeconds);

      return { limited: true, retryAfterSeconds };
    }

    // 3. Record the valid request
    const { error: insertError } = await adminClient
      .from('rate_limits')
      .insert({
        ip_hash: ipHash,
        action_type: actionType
      });

    if (insertError) {
      console.error(`[Rate Limit DB Error] failed to insert entry for ${actionType}:`, insertError);
      throw new Error('Database insertion failure');
    }

    return { limited: false, retryAfterSeconds: 0 };
  } catch (err: any) {
    console.error(`[Rate Limit Exception] for ${actionType}:`, err.message || err);
    // Propagate up so caller action can return a production-safe HTTP 429 response
    throw err;
  }
}
