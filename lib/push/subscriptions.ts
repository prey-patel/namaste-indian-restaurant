import { createAdminClient } from '@/lib/supabase/admin';

export type PushSubscriptionDb = {
  id: string;
  user_id: string;
  role: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  device_label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
};

/**
 * Saves or updates a push subscription for a user.
 */
export async function savePushSubscription(
  userId: string,
  role: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string | null,
  deviceLabel?: string | null
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  const { endpoint, keys } = subscription;

  try {
    const { error } = await adminClient
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        role,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent || null,
        device_label: deviceLabel || null,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('Failed to save push subscription to DB:', error);
      return { success: false, error: 'Database update failed.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('savePushSubscription error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Deactivates or removes a push subscription by its endpoint and verifies owner user_id.
 */
export async function removePushSubscription(
  endpoint: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  try {
    const { error } = await adminClient
      .from('push_subscriptions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('endpoint', endpoint)
      .eq('user_id', userId); // Enforce endpoint ownership

    if (error) {
      console.error('Failed to deactivate push subscription:', error);
      return { success: false, error: 'Database update failed.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('removePushSubscription error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches all active subscriptions where the owner user is currently active and belongs to allowed roles.
 * Joins against the profiles table to prevent authorization bypass.
 */
export async function getActiveSubscriptionsForRoles(allowedRoles: string[]): Promise<PushSubscriptionDb[]> {
  const adminClient = createAdminClient();

  try {
    // We join the profiles table to get the true, up-to-date role and activity status
    const { data, error } = await adminClient
      .from('push_subscriptions')
      .select(`
        *,
        profiles!inner(role, is_active)
      `)
      .eq('is_active', true)
      .eq('profiles.is_active', true)
      .in('profiles.role', allowedRoles);

    if (error) {
      console.error('Failed to fetch subscriptions for roles:', error);
      return [];
    }

    const mapped = (data || []).map((row: any) => ({
      ...row,
      role: row.profiles?.role || row.role
    }));

    return mapped as PushSubscriptionDb[];
  } catch (err) {
    console.error('getActiveSubscriptionsForRoles error:', err);
    return [];
  }
}

/**
 * Updates the last used timestamp of a subscription.
 */
export async function updateSubscriptionLastUsed(id: string): Promise<void> {
  const adminClient = createAdminClient();
  try {
    await adminClient
      .from('push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', id);
  } catch (err) {
    console.error('Failed to update subscription last used timestamp:', err);
  }
}
