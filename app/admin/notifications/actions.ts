'use server';

import { createClient } from '@/lib/supabase/server';
import { savePushSubscription, removePushSubscription } from '@/lib/push/subscriptions';
import { headers } from 'next/headers';

/**
 * Validates the current admin user role.
 */
async function validateUserAccess() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized: Unauthenticated user');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Unauthorized: Profile not found');
  }

  if (!profile.is_active) {
    throw new Error('Unauthorized: Account is inactive');
  }

  return { userId: user.id, role: profile.role };
}

/**
 * Saves a browser push subscription for the logged-in admin user.
 */
export async function subscribeToPushAction(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  deviceLabel?: string | null
) {
  try {
    const { userId, role } = await validateUserAccess();
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'unknown';

    return await savePushSubscription(userId, role, subscription, userAgent, deviceLabel);
  } catch (err: any) {
    console.error('subscribeToPushAction error:', err);
    return { success: false, error: err.message || 'Authentication required' };
  }
}

/**
 * Deactivates a push subscription for the logged-in user.
 */
export async function unsubscribeFromPushAction(endpoint: string) {
  try {
    await validateUserAccess();
    return await removePushSubscription(endpoint);
  } catch (err: any) {
    console.error('unsubscribeFromPushAction error:', err);
    return { success: false, error: err.message || 'Authentication required' };
  }
}


